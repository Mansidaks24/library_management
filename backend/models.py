from sqlalchemy import Column, Float, Integer, String
from . database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, default="User") # 'User' or 'Librarian'
    name = Column(String(255), index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String)

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    author = Column(String(255), index=True)
    category = Column(String(255), index=True)
    description = Column(String)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))
    branch_id = Column(Integer, ForeignKey("branches.id"))
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    return_date = Column(DateTime, nullable=True) # Null means it is still borrowed
    fine = Column(Float, default=0.0)

    # Optional: sets up relationships so we can easily query user/book details later
    user = relationship("User")
    book = relationship("Book")
    branch = relationship("Branch")

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String(255), unique=True, index=True)
    
    # Relationship to inventory
    inventory = relationship("Inventory", back_populates="branch")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    book_id = Column(Integer, ForeignKey("books.id"))
    total_copies = Column(Integer, default=1)
    available_copies = Column(Integer, default=1)

    branch = relationship("Branch", back_populates="inventory")
    book = relationship("Book")

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))
    branch_id = Column(Integer, ForeignKey("branches.id"))
    reserved_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Pending") # Pending, Allotted, or Cancelled

    # Relationships
    user = relationship("User")
    book = relationship("Book")
    branch = relationship("Branch")
