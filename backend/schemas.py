from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Base User Schema
class UserBase(BaseModel):
    name: str
    email: EmailStr

# Schema for creating a new user (Registration)
class UserCreate(UserBase):
    password: str
    role: str = "User" # Default role, can be "Librarian"

# Schema for what the API returns (hides password)
class UserResponse(UserBase):
    id: int
    role: str

    class Config:
        from_attributes = True

# Schema for JWT Token
class Token(BaseModel):
    access_token: str
    token_type: str

# Add this to the bottom of schemas.py

class BookBase(BaseModel):
    title: str
    author: str
    category: str
    description: str | None = None

class BookCreate(BookBase):
    pass

class BookResponse(BookBase):
    id: int

    class Config:
        from_attributes = True

class TransactionCreate(BaseModel):
    book_id: int
    branch_id: int
    days_to_borrow: int = 14

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    book_id: int
    branch_id: int
    issue_date: datetime
    due_date: datetime
    return_date: datetime | None = None
    fine: float = 0.0
    estimated_fine: float = 0.0

    class Config:
        from_attributes = True

class BranchBase(BaseModel):
    location: str

class BranchCreate(BranchBase):
    pass

class BranchResponse(BranchBase):
    id: int
    class Config: from_attributes = True

class InventoryUpdate(BaseModel):
    branch_id: int
    book_id: int
    total_copies: int

class ReservationResponse(BaseModel):
    id: int
    book_id: int
    branch_id: int
    reserved_at: datetime
    status: str
    rank: int

    class Config:
        from_attributes = True