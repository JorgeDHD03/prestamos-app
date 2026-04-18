from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────
class LoanStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    PAID = "PAID"
    DELINQUENT = "DELINQUENT"


class InterestTypeEnum(str, Enum):
    FIXED = "FIXED"       # Amortización Francesa
    FLAT = "FLAT"         # Tasa Plana Global
    VARIABLE = "VARIABLE"


class PaymentFrequencyEnum(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class PaymentTypeEnum(str, Enum):
    NORMAL = "NORMAL"
    CAPITAL_ONLY = "CAPITAL_ONLY"
    INTEREST_ONLY = "INTEREST_ONLY"



# ── Auth ───────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4)
    full_name: str = Field(min_length=2, max_length=100)


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str

    class Config:
        from_attributes = True


# ── Client ─────────────────────────────────────────
class ClientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    id_number: str = Field(min_length=1, max_length=30)
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class ClientOut(BaseModel):
    id: int
    full_name: str
    id_number: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    created_at: datetime
    loan_count: int = 0
    active_balance: float = 0.0

    class Config:
        from_attributes = True


class ClientDetail(ClientOut):
    loans: List["LoanOut"] = []


# ── Loan ───────────────────────────────────────────
class LoanCreate(BaseModel):
    client_id: int
    principal: float = Field(gt=0)
    interest_rate: float = Field(gt=0)
    interest_type: InterestTypeEnum = InterestTypeEnum.FIXED
    payment_frequency: PaymentFrequencyEnum = PaymentFrequencyEnum.MONTHLY
    total_periods: int = Field(gt=0)
    penalty_rate: float = Field(default=2.0, ge=0)
    start_date: date


class LoanOut(BaseModel):
    id: int
    client_id: int
    client_name: str = ""
    principal: float
    interest_rate: float
    interest_type: str
    payment_frequency: str
    total_periods: int
    total_amount: float
    outstanding_balance: float
    status: str
    penalty_rate: float
    start_date: date
    end_date: Optional[date]
    created_at: datetime
    payments_count: int = 0

    class Config:
        from_attributes = True


class LoanDetail(LoanOut):
    payments: List["PaymentOut"] = []
    amortization_table: List["AmortizationRow"] = []


# ── Payment ────────────────────────────────────────
class PaymentCreate(BaseModel):
    loan_id: int
    amount: float = Field(gt=0)
    payment_date: date
    payment_type: PaymentTypeEnum = PaymentTypeEnum.NORMAL
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    loan_id: int
    amount: float
    principal_portion: float
    interest_portion: float
    penalty_portion: float
    balance_after: float
    payment_date: date
    receipt_number: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReceiptOut(BaseModel):
    receipt_number: str
    payment_date: date
    client_name: str
    client_id_number: str
    loan_id: int
    amount: float
    principal_portion: float
    interest_portion: float
    penalty_portion: float
    balance_before: float
    balance_after: float


# ── Simulator ──────────────────────────────────────
class SimulateRequest(BaseModel):
    principal: float = Field(gt=0)
    interest_rate: float = Field(gt=0)
    interest_type: InterestTypeEnum = InterestTypeEnum.FIXED
    payment_frequency: PaymentFrequencyEnum = PaymentFrequencyEnum.MONTHLY
    total_periods: int = Field(gt=0)


class AmortizationRow(BaseModel):
    period: int
    payment: float
    principal_portion: float
    interest_portion: float
    balance: float


class SimulateResponse(BaseModel):
    principal: float
    interest_rate: float
    payment_frequency: str
    total_periods: int
    periodic_payment: float
    total_amount: float
    total_interest: float
    table: List[AmortizationRow]


# ── Dashboard ──────────────────────────────────────
class DashboardSummary(BaseModel):
    month: str
    total_collected: float
    capital_collected: float
    interest_collected: float
    penalty_collected: float
    payments_count: int


class DashboardStats(BaseModel):
    total_clients: int
    active_loans: int
    delinquent_loans: int
    paid_loans: int
    total_portfolio: float
    total_outstanding: float
    monthly_summaries: List[DashboardSummary]


# Fix forward references
ClientDetail.model_rebuild()
LoanDetail.model_rebuild()
