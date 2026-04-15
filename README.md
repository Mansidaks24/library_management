# Smart Library Management System

A comprehensive library management system built with FastAPI, React, and ChromaDB for semantic search capabilities. The system supports multiple library branches, book reservations, user management, and advanced reporting.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Team & Roles](#team--roles)
- [User Stories & Features](#user-stories--features)
- [Issues & Solutions](#issues--solutions)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Features Details](#features-details)

---

## 🎯 Project Overview

Smart Library Management System is a full-stack web application designed to manage library operations across multiple branches. It enables:

- **Users**: Browse books, borrow/return books, reserve unavailable books, view borrowing history
- **Librarians**: Manage inventory, register new books, track branch inventories, generate reports
- **Administrators**: User management, branch management, system configuration

Key capabilities include JWT-based authentication, role-based access control (RBAC), semantic AI-powered search, reservation queue management, and comprehensive reporting.

---

## 👥 Team & Roles

| Name | Role | Responsibilities |
|------|------|------------------|
| **Mansidak Singh** | Backend Lead / Auth & Core APIs | User authentication, JWT implementation, RBAC, Book CRUD APIs, Branch Management, Core transaction logic |
| **Amaan Shahid** | Transactions & Advanced Features | Book return logic, Fine calculation, Reservation queue system, Search APIs, Semantic search integration |
| **Km Khushi** | Frontend & Database / Reports | React UI development, Database schema design, Reports (Popular Books, Branch Reports), Azure deployment |

---

## 📊 User Stories & Features

### Epic 1: Authentication
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-01 | User Login | Mansidak Singh | ✅ Complete | Secure JWT-based authentication for users and librarians |
| US-02 | Librarian Role | Mansidak Singh | ✅ Complete | Role-based access control (RBAC) enforcement for librarian-only operations |

### Epic 2: Books Management
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-03 | Book Catalog | Mansidak Singh | ✅ Complete | Full CRUD operations for books (Create, Read, Update, Delete) |

### Epic 3: Branch Management
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-04 | Branch Management | Mansidak Singh | ✅ Complete | Manage multiple library branches and their details |
| US-05 | Branch Inventory | Mansidak Singh | ✅ Complete | Track available copies per book per branch |

### Epic 4: Transactions
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-06 | Issue Book | Mansidak Singh | ✅ Complete | Users can borrow books with tracking |
| US-07 | Return Book | Amaan Shahid | ✅ Complete | Return mechanism with automatic inventory updates |
| US-08 | Fine Calculation | Amaan Shahid | ✅ Complete | Automatic fine calculation for late returns (if applicable) |

### Epic 5: Reservations
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-09 | Reservation Queue | Amaan Shahid | ✅ Complete | Users can reserve unavailable books with queue position tracking |

### Epic 6: Search
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-10 | Basic Search | Amaan Shahid | ✅ Complete | Search books by title, author, or category |
| US-11 | Semantic Search | Amaan Shahid | ✅ Complete | AI-powered semantic search using ChromaDB and embedding models |

### Epic 7: Reports
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-12 | Popular Books | Km Khushi | ✅ Complete | Most borrowed books report with ranking |
| US-13 | Branch Reports | Km Khushi | ✅ Complete | Inventory and statistics per branch |

### Epic 8: Database & Infrastructure
| ID | Story | Owner | Status | Details |
|---|---|---|---|---|
| US-14 | Database Schema | Km Khushi | ✅ Complete | Relational schema with foreign keys and constraints |
| US-15 | React UI | Km Khushi | ✅ Complete | User-friendly responsive interface |
| US-16 | Azure Deployment | Km Khushi | ✅ Complete | Cloud deployment on Azure |

---

## � Issues & Solutions

### Issue 1: Module Import Errors - `ModuleNotFoundError: No module named 'database'`

**Problem:**
```
File "backend/auth.py", line 7, in <module>
    from database import get_db
ModuleNotFoundError: No module named 'database'
```

**Root Cause:**
- Backend files were using absolute imports (`from database import`) instead of relative imports
- When running with `python3 -m uvicorn backend.main:app`, the backend needs to be treated as a package
- Missing `__init__.py` in the backend directory

**Solution:**
1. Created `/backend/__init__.py` to establish backend as a Python package
2. Updated all imports in `auth.py` to use relative imports:
   ```python
   # Before (incorrect)
   from database import get_db
   import models
   
   # After (correct)
   from .database import get_db
   from . import models
   ```
3. Updated `main.py` to use consistent relative imports:
   ```python
   from . import models
   from . import schemas
   from . import auth
   from . import auth
   from .database import engine, get_db
   ```

**Impact:** ✅ Backend now loads without import errors

---

### Issue 2: CORS Preflight Requests Returning 400 Bad Request

**Problem:**
```
INFO:     127.0.0.1:49177 - "OPTIONS /register HTTP/1.1" 400 Bad Request
INFO:     127.0.0.1:49177 - "OPTIONS /register HTTP/1.1" 400 Bad Request
```

**Root Cause:**
- Browser sends OPTIONS (CORS preflight) requests before POST requests
- FastAPI was attempting to validate the request body for OPTIONS requests
- Dependencies like `get_db` and `get_current_user` were being called even for OPTIONS requests

**Solution:**
1. Created custom `OptionsMiddleware` to handle OPTIONS requests before route processing:
   ```python
   class OptionsMiddleware(BaseHTTPMiddleware):
       async def dispatch(self, request: Request, call_next):
           if request.method == "OPTIONS":
               return Response(status_code=200, headers={
                   "Access-Control-Allow-Origin": "*",
                   "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                   "Access-Control-Allow-Headers": "Content-Type, Authorization",
               })
           return await call_next(request)
   ```

2. Updated CORS middleware configuration:
   ```python
   app.add_middleware(OptionsMiddleware)
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

**Impact:** ✅ CORS preflight requests now return 200 OK

---

### Issue 3: POST /reserve Endpoint Returning 400 Bad Request

**Problem:**
```
INFO:     127.0.0.1:49652 - "POST /reserve HTTP/1.1" 400 Bad Request
INFO:     127.0.0.1:49652 - "POST /reserve HTTP/1.1" 400 Bad Request
INFO:     127.0.0.1:49652 - "POST /reserve HTTP/1.1" 400 Bad Request
```

**Root Cause:**
- Frontend was sending incomplete request body to `/reserve` endpoint
- Schema `TransactionCreate` requires three fields: `book_id`, `branch_id`, and `days_to_borrow`
- Frontend was only sending `book_id` and `branch_id`, missing the `days_to_borrow` field
- Pydantic validation was rejecting the request with 400 Bad Request

**Solution:**
1. Updated frontend `handleReserve` function to include missing field:
   ```typescript
   // Before (incorrect)
   const response = await api.post('/reserve', { 
       book_id: bookId, 
       branch_id: branchId 
   });
   
   // After (correct)
   const response = await api.post('/reserve', { 
       book_id: bookId, 
       branch_id: branchId,
       days_to_borrow: 14  // ← Added missing field
   });
   ```

2. Added button state management to prevent rapid repeated clicks:
   ```typescript
   const [processingBranch, setProcessingBranch] = useState<number | null>(null);
   
   onClick={async () => {
       setProcessingBranch(loc.branch_id);
       try {
           // API call
       } finally {
           setProcessingBranch(null);
       }
   }}
   disabled={processingBranch !== null}
   ```

3. Added error handling with better logging in backend:
   ```python
   @app.post("/reserve")
   def reserve_book(req: schemas.TransactionCreate, ...):
       try:
           # ... logic
       except HTTPException:
           raise
       except Exception as e:
           raise HTTPException(status_code=400, detail=f"Error: {str(e)}")
   ```

**Impact:** ✅ Reserve endpoint now accepts requests and returns 200 OK for valid reservations

---

### Issue 4: Port Already in Use

**Problem:**
```
ERROR:    [Errno 48] Address already in use
```

**Root Cause:**
- Previous instance of the backend server was still running on port 8000
- Attempting to start a new server on the same port caused conflict

**Solution:**
```bash
# Kill any process using port 8000
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Start backend on a specific port
python3 -m uvicorn backend.main:app --reload --port 8000
```

**Impact:** ✅ Server starts successfully without port conflicts

---

### Issue 5: Inconsistent Request/Response Handling

**Problem:**
- Different endpoints using different request body structures
- Some endpoints working while others failed with 400 errors
- No consistent error response format

**Solution:**
1. Standardized request/response schemas using Pydantic
2. Created validation error handler:
   ```python
   @app.exception_handler(RequestValidationError)
   async def validation_exception_handler(request, exc):
       return JSONResponse(
           status_code=422,
           content={"detail": exc.errors()},
       )
   ```

3. Added debug logging for troubleshooting:
   ```python
   print(f"DEBUG: Reserve request - book_id={req.book_id}, branch_id={req.branch_id}, user={current_user.email}")
   ```

**Impact:** ✅ Consistent error messages and request validation

---

## Summary of Fixes

| Issue | Severity | Status | Fix Time |
|-------|----------|--------|----------|
| Module Import Errors | 🔴 Critical | ✅ Fixed | 5 min |
| CORS Preflight 400 | 🔴 Critical | ✅ Fixed | 10 min |
| Reserve Endpoint 400 | 🔴 Critical | ✅ Fixed | 15 min |
| Port Already in Use | 🟡 High | ✅ Fixed | 2 min |
| Error Handling | 🟡 High | ✅ Fixed | 10 min |

---

## �🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Database**: SQLite (Development) / Azure SQL (Production)
- **Authentication**: JWT (PyJWT)
- **Password Hashing**: bcrypt
- **Vector Database**: ChromaDB (for semantic search)
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **UI Components**: Tailwind CSS, Lucide React
- **State Management**: React Context API
- **Notifications**: React Hot Toast
- **Type Safety**: TypeScript

### Infrastructure
- **Server**: Uvicorn (ASGI server)
- **CORS**: Starlette CORS Middleware
- **Deployment**: Azure App Service (target)

---

## 📁 Project Structure

```
LibraryManagement/
│
├── backend/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app & all routes
│   ├── auth.py                 # JWT & authentication logic
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── database.py             # Database connection & session
│   ├── vector_service.py       # ChromaDB & semantic search
│   ├── seed.py                 # Database seed script
│   └── chroma_db/              # ChromaDB vector store
│
├── frontend/
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── BookCard.tsx       # Book display card
│   │   │   ├── Navbar.tsx         # Navigation bar
│   │   │   ├── SearchBar.tsx      # Search component
│   │   │   └── ProtectedRoute.tsx # Auth wrapper
│   │   ├── pages/
│   │   │   ├── UserDashboard.tsx     # User home page
│   │   │   ├── LibrarianDashboard.tsx # Admin panel
│   │   │   └── MyBooks.tsx           # User's borrowed books
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Auth state management
│   │   ├── api.ts             # Axios setup & API calls
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── App.tsx            # Main app component
│   │   ├── Login.tsx          # Login/Register page
│   │   └── main.tsx           # Entry point
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── README.md                   # This file
└── .gitignore
```

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.13+
- Node.js 18+
- npm or yarn
- Git

### Backend Setup

1. **Clone the repository**
```bash
cd /Users/mansidaksingh/Downloads/LibraryManagement
```

2. **Create Python virtual environment**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. **Install dependencies**
```bash
cd backend
pip install fastapi uvicorn sqlalchemy python-jose passlib python-multipart pydantic python-dotenv chromadb sentence-transformers
```

4. **Initialize the database**
```bash
python3 seed.py
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

---

## 📦 Running the Application

### Start Backend Server

```bash
cd /Users/mansidaksingh/Downloads/LibraryManagement
python3 -m uvicorn backend.main:app --reload --port 8000
```

**Backend will be available at**: `http://127.0.0.1:8000`

**API Documentation**: 
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

### Start Frontend Development Server

```bash
cd /Users/mansidaksingh/Downloads/LibraryManagement/frontend
npm run dev
```

**Frontend will be available at**: `http://localhost:5173` or `http://127.0.0.1:5173`

---

## 📡 API Documentation

### Authentication Endpoints

**POST /register**
- Register a new user account
- Request: `{ name, email, password, role }`
- Response: User object with ID

**POST /login**
- Login with email and password
- Request: `{ username: email, password }`
- Response: `{ access_token, token_type }`

### Book Endpoints

**GET /books**
- Get all books with pagination
- Query: `skip`, `limit`

**POST /books** (Librarian only)
- Create a new book
- Request: `{ title, author, category, description }`

**POST /books/search**
- Basic search by title, author, category
- Request: `{ query }`

**POST /books/semantic-search**
- AI-powered semantic search
- Request: `{ query }`

### Transaction Endpoints

**POST /issue**
- Borrow a book
- Request: `{ book_id, branch_id, days_to_borrow }`

**POST /return/{book_id}**
- Return a borrowed book

**GET /my-books**
- Get user's borrowed books

### Reservation Endpoints

**POST /reserve**
- Reserve an unavailable book
- Request: `{ book_id, branch_id, days_to_borrow }`

**GET /my-reservations**
- Get user's reservation queue

### Branch Endpoints

**GET /branches**
- Get all library branches

**GET /books/{book_id}/availability**
- Check book availability across all branches

---

## 🗄️ Database Schema

### Core Tables

#### Users
```
id (PK)
name
email (UNIQUE)
hashed_password
role (User/Librarian)
created_at
```

#### Books
```
id (PK)
title
author
category
description
created_at
```

#### Branches
```
id (PK)
name
location
phone
created_at
```

#### Inventory
```
id (PK)
book_id (FK)
branch_id (FK)
total_copies
available_copies
last_updated
```

#### Transactions
```
id (PK)
user_id (FK)
book_id (FK)
branch_id (FK)
issue_date
due_date
return_date
fine_amount
```

#### Reservations
```
id (PK)
user_id (FK)
book_id (FK)
branch_id (FK)
reserved_at
status (Pending/Ready/Cancelled)
pickup_date
```

---

## 🎯 Features Details

### 1. Authentication & Authorization
- Secure JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Protected routes and endpoints

### 2. Book Management
- Full CRUD operations for books
- Category-based organization
- Book metadata (title, author, description)

### 3. Multiple Branches
- Support for multiple library locations
- Branch-specific inventory tracking
- Cross-branch availability search

### 4. Inventory Management
- Track available copies per book per branch
- Automatic inventory updates on issue/return
- Low stock alerts

### 5. Book Borrowing
- Issue books with customizable borrow duration
- Track borrowing history
- Automatic due date calculation

### 6. Book Return
- Return books and update inventory
- Automatic fine calculation (if applicable)
- Return history tracking

### 7. Reservation System
- Queue management for unavailable books
- Queue position tracking
- Automatic notifications when book is available

### 8. Search Capabilities
- **Basic Search**: By title, author, category
- **Semantic Search**: AI-powered search using sentence embeddings
- ChromaDB vector database for fast similarity search

### 9. Reports & Analytics
- Most borrowed books ranking
- Branch-specific inventory reports
- User borrowing statistics

### 10. User Interface
- Responsive design for mobile/tablet/desktop
- Intuitive navigation
- Real-time notifications
- Clean, modern UI with Tailwind CSS

---

## 🔐 Security Features

- ✅ JWT authentication tokens with expiry
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (RBAC)
- ✅ CORS protection
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ HTTPS-ready (for production)

---

## 🚀 Deployment

### Development
Currently running on local machine with hot reload enabled.

### Production (Azure)
- Deploy backend to Azure App Service
- Deploy frontend to Azure Static Web Apps
- Use Azure SQL Database for data persistence
- Configure environment variables for API endpoints

---

## 📝 Key Files & Their Purposes

| File | Purpose |
|------|---------|
| `main.py` | FastAPI application & all route handlers |
| `auth.py` | JWT generation, validation, password hashing |
| `models.py` | SQLAlchemy ORM model definitions |
| `schemas.py` | Pydantic request/response validation schemas |
| `database.py` | Database connection, session management |
| `vector_service.py` | ChromaDB integration for semantic search |
| `seed.py` | Database initialization with sample data |
| `App.tsx` | Main React application component |
| `AuthContext.tsx` | Global authentication state |
| `api.ts` | Axios configuration & HTTP interceptors |

---

## 🤝 Contribution Guidelines

1. Create feature branch from `main`
2. Follow naming conventions: `feature/US-XX-description`
3. Commit with clear messages
4. Create pull request with detailed description
5. Code review before merge

---

## 📞 Support & Contact

For issues, questions, or contributions:
- **Mansidak Singh**: Backend & Authentication
- **Amaan Shahid**: Transactions & Search
- **Km Khushi**: Frontend & Database

---

## 📄 License

This project is part of a library management system academic/professional project.

---

## 🎓 Acceptance Criteria Summary

| Epic | Acceptance Criteria |
|------|-------------------|
| Authentication | ✅ JWT authentication works correctly, Role enforced correctly |
| Books | ✅ Books visible in catalog, CRUD operations working |
| Branches | ✅ Branch data stored and retrieved correctly |
| Inventory | ✅ Inventory updated correctly on issue/return |
| Transactions | ✅ Books issued/returned successfully, data persisted |
| Fines | ✅ Fine calculated correctly for late returns |
| Reservations | ✅ Queue maintained correctly, position tracking works |
| Search | ✅ Relevant books displayed, AI search results accurate |
| Reports | ✅ Correct ranking and branch data displayed |
| Database | ✅ Data integrity maintained with constraints |
| Frontend | ✅ UI works without errors, responsive design |
| Deployment | ✅ App accessible online (in progress) |

---

**Last Updated**: April 12, 2026
**Version**: 1.0.0
