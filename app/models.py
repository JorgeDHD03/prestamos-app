from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base


class LoanStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAID = "PAID"
    DELINQUENT = "DELINQUENT"


class InterestType(str, enum.Enum):
    FIXED = "FIXED"       # Amortización Francesa
    FLAT = "FLAT"         # Tasa Plana Global
    VARIABLE = "VARIABLE"


class PaymentFrequency(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False, index=True)
    id_number = Column(String(30), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(String(300))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    loans = relationship("Loan", back_populates="client", cascade="all, delete-orphan")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    principal = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)  # percentage per period
    interest_type = Column(SQLEnum(InterestType), default=InterestType.FIXED)
    payment_frequency = Column(SQLEnum(PaymentFrequency), default=PaymentFrequency.MONTHLY)
    total_periods = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)  # principal + total interest
    outstanding_balance = Column(Float, nullable=False)
    status = Column(SQLEnum(LoanStatus), default=LoanStatus.ACTIVE, index=True)
    penalty_rate = Column(Float, default=2.0)  # % penalty on overdue
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    client = relationship("Client", back_populates="loans")
    payments = relationship("Payment", back_populates="loan", cascade="all, delete-orphan",
                            order_by="Payment.payment_date")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    principal_portion = Column(Float, nullable=False)
    interest_portion = Column(Float, nullable=False)
    penalty_portion = Column(Float, default=0.0)
    balance_after = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    receipt_number = Column(String(30), unique=True, nullable=False, index=True)
    notes = Column(String(500))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    loan = relationship("Loan", back_populates="payments")
