from .database import SessionLocal
from . import models
from sqlalchemy import func
from datetime import datetime

session = SessionLocal()

# Ensure user exists
user = session.query(models.User).filter(models.User.name == 'user').first()
if not user:
    user = models.User(name='user', email='user@example.com', role='User', hashed_password='')
    session.add(user)
    session.commit()
    session.refresh(user)
    print('Created user:', user.id, user.name, user.email)
else:
    print('Found user:', user.id, user.name, user.email)

# Ensure book exists
book = session.query(models.Book).filter(models.Book.title == 'Christmas Recipes 2025').first()
if not book:
    book = models.Book(title='Christmas Recipes 2025', author='James Moron', category='Contemporary Fiction', description='Test description for Sample Book.')
    session.add(book)
    session.commit()
    session.refresh(book)
    print('Created book:', book.id, book.title)
else:
    print('Found book:', book.id, book.title)

# Ensure branch exists
branch = session.query(models.Branch).filter(models.Branch.location == 'North Delhi').first()
if not branch:
    branch = models.Branch(location='North Delhi')
    session.add(branch)
    session.commit()
    session.refresh(branch)
    print('Created branch:', branch.id, branch.location)
else:
    print('Found branch:', branch.id, branch.location)

# Create the transaction if it doesn't already exist
issue_date = datetime(2026, 3, 30)
due_date = datetime(2026, 4, 6)
existing_tx = session.query(models.Transaction).filter(
    models.Transaction.user_id == user.id,
    models.Transaction.book_id == book.id,
    models.Transaction.issue_date == issue_date,
    models.Transaction.due_date == due_date
).first()
if not existing_tx:
    tx = models.Transaction(
        user_id=user.id,
        book_id=book.id,
        branch_id=branch.id,
        issue_date=issue_date,
        due_date=due_date,
        return_date=None,
        fine=0.0
    )
    session.add(tx)
    session.commit()
    print('Created transaction:', tx.id)
else:
    print('Transaction already exists:', existing_tx.id)

session.close()
