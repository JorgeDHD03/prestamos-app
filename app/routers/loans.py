from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
from app.database import get_db
from app.models import Loan, Client, LoanStatus, PaymentFrequency, User
from app.schemas import (
    LoanCreate, LoanOut, LoanDetail, PaymentOut, AmortizationRow,
    SimulateRequest, SimulateResponse,
)
from app.auth import get_current_user
from app.utils.loan_calculator import (
    calculate_periodic_payment,
    generate_amortization_table,
    calculate_total_amount,
)

router = APIRouter(prefix="/api/loans", tags=["Loans"])


def _get_end_date(loan):
    freq_days = {"DAILY": 1, "WEEKLY": 7, "MONTHLY": 30}
    days = freq_days.get(loan.payment_frequency.value if hasattr(loan.payment_frequency, 'value') else loan.payment_frequency, 30)
    return loan.start_date + timedelta(days=days * loan.total_periods)


def _loan_to_out(loan: Loan) -> LoanOut:
    return LoanOut(
        id=loan.id,
        client_id=loan.client_id,
        client_name=loan.client.full_name if loan.client else "",
        principal=loan.principal,
        interest_rate=loan.interest_rate,
        interest_type=loan.interest_type.value if loan.interest_type else "FIXED",
        payment_frequency=loan.payment_frequency.value if loan.payment_frequency else "MONTHLY",
        total_periods=loan.total_periods,
        total_amount=loan.total_amount,
        outstanding_balance=loan.outstanding_balance,
        status=loan.status.value if loan.status else "ACTIVE",
        penalty_rate=loan.penalty_rate,
        start_date=loan.start_date,
        end_date=loan.end_date,
        created_at=loan.created_at,
        payments_count=len(loan.payments) if loan.payments else 0,
    )


@router.get("", response_model=List[LoanOut])
def list_loans(
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Loan)
    if status:
        q = q.filter(Loan.status == status)
    if client_id:
        q = q.filter(Loan.client_id == client_id)
    loans = q.order_by(Loan.created_at.desc()).all()
    return [_loan_to_out(l) for l in loans]


@router.post("", response_model=LoanOut, status_code=201)
def create_loan(
    req: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == req.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    total = calculate_total_amount(req.principal, req.interest_rate, req.total_periods)

    loan = Loan(
        client_id=req.client_id,
        principal=req.principal,
        interest_rate=req.interest_rate,
        interest_type=req.interest_type.value,
        payment_frequency=req.payment_frequency.value,
        total_periods=req.total_periods,
        total_amount=total,
        outstanding_balance=req.principal,
        status=LoanStatus.ACTIVE,
        penalty_rate=req.penalty_rate,
        start_date=req.start_date,
    )
    loan.end_date = _get_end_date(loan)

    db.add(loan)
    db.commit()
    db.refresh(loan)
    return _loan_to_out(loan)


@router.get("/{loan_id}", response_model=LoanDetail)
def get_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    table = generate_amortization_table(loan.principal, loan.interest_rate, loan.total_periods)
    amort_rows = [AmortizationRow(**row) for row in table]

    payments_out = []
    for p in loan.payments:
        payments_out.append(PaymentOut(
            id=p.id,
            loan_id=p.loan_id,
            amount=p.amount,
            principal_portion=p.principal_portion,
            interest_portion=p.interest_portion,
            penalty_portion=p.penalty_portion or 0.0,
            balance_after=p.balance_after,
            payment_date=p.payment_date,
            receipt_number=p.receipt_number,
            notes=p.notes,
            created_at=p.created_at,
        ))

    out = _loan_to_out(loan)
    return LoanDetail(
        **out.model_dump(),
        payments=payments_out,
        amortization_table=amort_rows,
    )


@router.put("/{loan_id}/status")
def update_loan_status(
    loan_id: int,
    new_status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    try:
        loan.status = LoanStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Estado inválido. Usar: ACTIVE, PAID, DELINQUENT")

    db.commit()
    return {"detail": f"Estado actualizado a {new_status}"}


@router.post("/simulate", response_model=SimulateResponse)
def simulate_loan(req: SimulateRequest):
    periodic = calculate_periodic_payment(req.principal, req.interest_rate, req.total_periods)
    table = generate_amortization_table(req.principal, req.interest_rate, req.total_periods)
    total = round(sum(row["payment"] for row in table), 2)

    return SimulateResponse(
        principal=req.principal,
        interest_rate=req.interest_rate,
        payment_frequency=req.payment_frequency.value,
        total_periods=req.total_periods,
        periodic_payment=periodic,
        total_amount=total,
        total_interest=round(total - req.principal, 2),
        table=[AmortizationRow(**row) for row in table],
    )
