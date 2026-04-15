__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
import os
from fastapi import FastAPI, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from . import models
from . import schemas
from . import auth
import math
from  sqlalchemy import func, text
from . database import engine, get_db
from typing import List
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
from . vector_service import add_book_to_vector_db, semantic_search_books
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Library Management API")


def normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "*")
    return [normalize_origin(origin) for origin in raw_origins.split(",") if origin.strip()]


cors_origins = get_cors_origins()
allow_all_origins = cors_origins == ["*"]

# Custom middleware to handle OPTIONS requests
class OptionsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            request_origin = normalize_origin(request.headers.get("origin", ""))
            origin = "*" if allow_all_origins else request_origin or cors_origins[0]
            return Response(status_code=200, headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            })
        return await call_next(request)

app.add_middleware(OptionsMiddleware)

# Add CORS middleware AFTER custom middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else cors_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and save
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        name=user.name, 
        email=user.email, 
        role=user.role, 
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses 'username' by default, we will map it to our 'email'
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate JWT Token
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/books", response_model=schemas.BookResponse)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    # 1. Save to SQL
    new_book = models.Book(**book.model_dump())
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    
    # 2. Save to Vector DB for Smart Search
    # We combine title and description for a richer vector
    indexing_text = f"{new_book.title}: {new_book.description}"
    add_book_to_vector_db(
        book_id=new_book.id, 
        text=indexing_text, 
        metadata={"author": new_book.author, "category": new_book.category}
    )
    
    return new_book

# Route 2: Get all books (Public to anyone, no auth required to view the catalog)
@app.get("/books", response_model=List[schemas.BookResponse])
def get_books(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    books = db.query(models.Book).order_by(models.Book.id).offset(skip).limit(limit).all()
    return books

@app.post("/issue", response_model=schemas.TransactionResponse)
def issue_book(
    req: schemas.TransactionCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Check the Inventory table for this specific branch and book
    inventory_record = db.query(models.Inventory).filter(
        models.Inventory.book_id == req.book_id,
        models.Inventory.branch_id == req.branch_id
    ).first()

    if not inventory_record:
        raise HTTPException(status_code=404, detail="This book is not stocked at this branch.")

    if inventory_record.available_copies <= 0:
        raise HTTPException(status_code=400, detail="No copies currently available at this branch.")

    # 2. Check if the USER already has an active borrowing record for THIS book
    # (Optional: Prevent a user from borrowing the same book twice simultaneously)
    active_tx = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.book_id == req.book_id,
        models.Transaction.return_date == None
    ).first()
    
    if active_tx:
        raise HTTPException(status_code=400, detail="You already have an active borrowing for this book.")

    # 3. Success: Decrement inventory and create transaction
    inventory_record.available_copies -= 1
    
    due_date = datetime.utcnow() + timedelta(days=req.days_to_borrow)
    new_transaction = models.Transaction(
        user_id=current_user.id,
        book_id=req.book_id,
        branch_id=req.branch_id,
        issue_date=datetime.utcnow(),
        due_date=due_date
    )
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

# Route 2: Return a Book (Any logged-in user)
@app.post("/return/{book_id}")
def return_book(book_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    transaction = db.query(models.Transaction).filter(
        models.Transaction.book_id == book_id,
        models.Transaction.user_id == current_user.id,
        models.Transaction.return_date == None
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="No active borrowing record found.")

    now = datetime.utcnow()
    transaction.return_date = now

    # --- ENHANCED FINE CALCULATION ---
    fine_amount = 0.0
    days_late = 0
    FINE_PER_DAY = 100

    if now > transaction.due_date:
        diff = now - transaction.due_date
        total_seconds_late = diff.total_seconds()
        if total_seconds_late > 0:
            days_late = math.ceil(total_seconds_late / 86400)
            fine_amount = float(days_late * FINE_PER_DAY)
    
    transaction.fine = fine_amount
    # ---------------------------------

    next_in_line = db.query(models.Reservation).filter(
        models.Reservation.book_id == book_id,
        models.Reservation.branch_id == transaction.branch_id,
        models.Reservation.status == "Pending"
    ).order_by(models.Reservation.reserved_at.asc()).first()

    allotted_to = None
    if next_in_line:
        due_date = datetime.utcnow() + timedelta(days=14)
        new_tx = models.Transaction(
            user_id=next_in_line.user_id,
            book_id=book_id,
            branch_id=transaction.branch_id,
            issue_date=datetime.utcnow(),
            due_date=due_date
        )
        next_in_line.status = "Allotted"
        db.add(new_tx)
        allotted_to = next_in_line.user_id 
    else:
        inventory_record = db.query(models.Inventory).filter(
            models.Inventory.book_id == book_id,
            models.Inventory.branch_id == transaction.branch_id
        ).first()
        if inventory_record:
            inventory_record.available_copies += 1

    db.commit()
    return {
        "message": "Late Return" if fine_amount > 0 else "Returned on Time", 
        "fine_incurred": fine_amount,
        "days_late": days_late,
        "auto_allotted": True if allotted_to else False
    }

# Route 3: View My Borrowed Books
@app.get("/my-books", response_model=List[schemas.TransactionResponse])
def get_my_books(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()

    response = []
    now = datetime.utcnow()
    fine_rate = 100

    for tx in transactions:
        estimated_fine = 0.0
        if tx.return_date is None and now > tx.due_date:
            seconds_late = (now - tx.due_date).total_seconds()
            if seconds_late > 0:
                estimated_fine = float(math.ceil(seconds_late / 86400) * fine_rate)

        response.append({
            "id": tx.id,
            "user_id": tx.user_id,
            "book_id": tx.book_id,
            "branch_id": tx.branch_id,
            "issue_date": tx.issue_date,
            "due_date": tx.due_date,
            "return_date": tx.return_date,
            "fine": float(tx.fine or 0.0),
            "estimated_fine": estimated_fine
        })

    return response

# 1. Create a Branch (Librarian only)
@app.post("/branches", response_model=schemas.BranchResponse)
def create_branch(branch: schemas.BranchCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    new_branch = models.Branch(location=branch.location)
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch

# 2. Add/Update Stock (Librarian only)
@app.post("/inventory")
def update_stock(data: schemas.InventoryUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    # Check if this book is already at this branch
    stock = db.query(models.Inventory).filter(
        models.Inventory.branch_id == data.branch_id,
        models.Inventory.book_id == data.book_id
    ).first()

    if stock:
        # Update existing stock
        diff = data.total_copies - stock.total_copies
        stock.total_copies = data.total_copies
        stock.available_copies += diff # Keep availability in sync
    else:
        # Create new inventory record
        stock = models.Inventory(
            branch_id=data.branch_id, 
            book_id=data.book_id, 
            total_copies=data.total_copies,
            available_copies=data.total_copies
        )
        db.add(stock)
    
    db.commit()
    return {"message": "Inventory updated successfully"}

# 3. Get all branches (Public)
@app.get("/branches", response_model=List[schemas.BranchResponse])
def get_branches(db: Session = Depends(get_db)):
    return db.query(models.Branch).all()

@app.get("/books/{book_id}/availability")
def get_book_availability(book_id: int, db: Session = Depends(get_db)):
    # Query the data
    results = db.query(
        models.Branch.id.label("branch_id"), 
        models.Branch.location.label("location"), 
        models.Inventory.available_copies.label("available")
    ).join(models.Inventory).filter(models.Inventory.book_id == book_id).all()
    
    # Safely unpack the SQLAlchemy Row objects into standard Python dictionaries
    formatted_results = []
    for row in results:
        formatted_results.append({
            "branch_id": getattr(row, "branch_id"),
            "location": getattr(row, "location"),
            "available": getattr(row, "available")
        })
        
    return formatted_results

@app.get("/search/semantic")
def search_semantic(q: str, db: Session = Depends(get_db)):
    # 1. Get similar IDs from Chroma
    book_ids = semantic_search_books(q)
    
    if not book_ids:
        return []

    # FIX: ChromaDB returns a list of lists (e.g., [['1', '2']]). We need to flatten it.
    if book_ids and isinstance(book_ids[0], list):
        book_ids = book_ids[0]

    # 2. Fetch full details from SQL in the order provided by Chroma
    preserved_order = {int(bid): i for i, bid in enumerate(book_ids)}
    books = db.query(models.Book).filter(models.Book.id.in_(book_ids)).all()
    
    # Sort them so the most relevant (top vector match) stays at the top
    books.sort(key=lambda x: preserved_order.get(x.id, 999))
    
    return books

@app.get("/reports/popular-books")
def get_popular_books(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    # This raw SQL query uses the 'RANK()' window function
    # It ranks books based on how many times they appear in the Transactions table
    query = text("""
        SELECT b.title, b.author, count_table.borrow_count,
               RANK() OVER (ORDER BY count_table.borrow_count DESC) as rank
        FROM books b
        JOIN (
            SELECT book_id, COUNT(*) as borrow_count
            FROM transactions
            GROUP BY book_id
        ) as count_table ON b.id = count_table.book_id
    """)
    
    result = db.execute(query)
    return [
        {"title": row.title, "author": row.author, "borrow_count": row.borrow_count, "rank": row.rank} 
        for row in result
    ]

@app.get("/reports/branch-inventory")
def get_branch_inventory(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    # Fetch all inventory joined with branch and book names
    results = db.query(
        models.Branch.location.label("branch"),
        models.Book.title.label("title"),
        models.Inventory.total_copies.label("total"),
        models.Inventory.available_copies.label("available")
    ).join(models.Inventory, models.Branch.id == models.Inventory.branch_id)\
     .join(models.Book, models.Book.id == models.Inventory.book_id).all()

    # CRITICAL FIX: Convert the Row objects to explicit dictionaries
    # SQLAlchemy rows can be accessed via .branch, .title, etc., if labeled
    return [
        {
            "branch": r.branch, 
            "title": r.title, 
            "total": r.total, 
            "available": r.available
        }
        for r in results
    ]

@app.post("/reserve")
def reserve_book(req: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        # 1. Check if user already has it borrowed or already reserved
        existing_res = db.query(models.Reservation).filter(
            models.Reservation.user_id == current_user.id,
            models.Reservation.book_id == req.book_id,
            models.Reservation.status == "Pending"
        ).first()
        
        if existing_res:
            raise HTTPException(status_code=400, detail="You are already in the queue for this book.")

        # 2. Add to Queue
        new_res = models.Reservation(
            user_id=current_user.id,
            book_id=req.book_id,
            branch_id=req.branch_id
        )
        db.add(new_res)
        db.commit()
        db.refresh(new_res)
        
        # 3. Calculate Queue Position
        position = db.query(models.Reservation).filter(
            models.Reservation.book_id == req.book_id,
            models.Reservation.branch_id == req.branch_id,
            models.Reservation.status == "Pending",
            models.Reservation.reserved_at <= new_res.reserved_at
        ).count()

        return {"message": "Joined the reservation queue", "position": position}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing reservation: {str(e)}")

@app.get("/my-reservations")
def get_my_reservations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Get all pending reservations for this user
    res_list = db.query(models.Reservation).filter(
        models.Reservation.user_id == current_user.id,
        models.Reservation.status == "Pending"
    ).all()
    
    output = []
    for r in res_list:
        # Calculate rank: count how many people joined the queue for this book/branch BEFORE this user
        rank = db.query(models.Reservation).filter(
            models.Reservation.book_id == r.book_id,
            models.Reservation.branch_id == r.branch_id,
            models.Reservation.status == "Pending",
            models.Reservation.reserved_at <= r.reserved_at
        ).count()
        
        output.append({
            "id": r.id,
            "book_id": r.book_id,
            "branch_id": r.branch_id,
            "reserved_at": r.reserved_at,
            "rank": rank
        })
    return output

@app.get("/reports/total-books-per-branch")
def get_total_books_per_branch(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_librarian)
):
    results = db.query(
        models.Branch.location.label("branch"),
        func.sum(models.Inventory.total_copies).label("total_stock")
    ).join(models.Inventory)\
     .group_by(models.Branch.location)\
     .all()

    return [
        {
            "branch": r.branch,
            "total_stock": r.total_stock
        }
        for r in results
    ]

@app.get("/reports/total-fines")
def get_total_fines(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    now = datetime.utcnow()
    total = 0.0

    for tx in db.query(models.Transaction).all():
        total += float(tx.fine or 0.0)
        if tx.return_date is None and now > tx.due_date:
            seconds_late = (now - tx.due_date).total_seconds()
            if seconds_late > 0:
                total += float(math.ceil(seconds_late / 86400) * 100)

    return {"total_revenue": round(total, 2)}

@app.get("/reports/monthly-fines")
def get_monthly_fines(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month
    total = 0.0

    for tx in db.query(models.Transaction).all():
        if tx.return_date is not None and tx.return_date.year == current_year and tx.return_date.month == current_month:
            total += float(tx.fine or 0.0)
        elif tx.return_date is None and now > tx.due_date:
            seconds_late = (now - tx.due_date).total_seconds()
            if seconds_late > 0:
                total += float(math.ceil(seconds_late / 86400) * 100)

    return {"monthly_fine_revenue": round(total, 2)}

@app.get("/reports/branch-revenue")
def get_branch_revenue(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_librarian)):
    branch_revenue = {}
    now = datetime.utcnow()

    for branch in db.query(models.Branch).all():
        branch_revenue[branch.location] = 0.0

    for tx in db.query(models.Transaction).all():
        branch_name = tx.branch.location if tx.branch else 'Unknown'
        value = float(tx.fine or 0.0)
        if tx.return_date is None and now > tx.due_date:
            seconds_late = (now - tx.due_date).total_seconds()
            if seconds_late > 0:
                value += float(math.ceil(seconds_late / 86400) * 100)
        branch_revenue[branch_name] = branch_revenue.get(branch_name, 0.0) + value

    return [
        {"branch": branch, "revenue": round(amount, 2)}
        for branch, amount in branch_revenue.items()
    ]
