from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.models import Client, Loan, Payment, LoanStatus, User
from app.schemas import DashboardStats, DashboardSummary
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_year = year or datetime.now().year

    total_clients = db.query(func.count(Client.id)).scalar() or 0
    active_loans = db.query(func.count(Loan.id)).filter(Loan.status == LoanStatus.ACTIVE).scalar() or 0
    delinquent_loans = db.query(func.count(Loan.id)).filter(Loan.status == LoanStatus.DELINQUENT).scalar() or 0
    paid_loans = db.query(func.count(Loan.id)).filter(Loan.status == LoanStatus.PAID).scalar() or 0

    total_portfolio = db.query(func.coalesce(func.sum(Loan.principal), 0.0)).scalar()
    total_outstanding = (
        db.query(func.coalesce(func.sum(Loan.outstanding_balance), 0.0))
        .filter(Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.DELINQUENT]))
        .scalar()
    )

    # Monthly summaries for the year
    monthly_summaries = []
    for month in range(1, 13):
        payments = (
            db.query(Payment)
            .filter(
                extract("year", Payment.payment_date) == target_year,
                extract("month", Payment.payment_date) == month,
            )
            .all()
        )

        total_collected = round(sum(p.amount for p in payments), 2)
        capital_collected = round(sum(p.principal_portion for p in payments), 2)
        interest_collected = round(sum(p.interest_portion for p in payments), 2)
        penalty_collected = round(sum(p.penalty_portion or 0 for p in payments), 2)

        month_names = [
            "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]

        monthly_summaries.append(DashboardSummary(
            month=month_names[month],
            total_collected=total_collected,
            capital_collected=capital_collected,
            interest_collected=interest_collected,
            penalty_collected=penalty_collected,
            payments_count=len(payments),
        ))

    return DashboardStats(
        total_clients=total_clients,
        active_loans=active_loans,
        delinquent_loans=delinquent_loans,
        paid_loans=paid_loans,
        total_portfolio=round(total_portfolio, 2),
        total_outstanding=round(total_outstanding, 2),
        monthly_summaries=monthly_summaries,
    )
