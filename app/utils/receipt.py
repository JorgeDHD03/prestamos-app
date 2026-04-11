from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Payment


def generate_receipt_number(db: Session, payment_date: date) -> str:
    """Generate a unique receipt number: REC-YYYYMMDD-XXXX"""
    date_str = payment_date.strftime("%Y%m%d")
    prefix = f"REC-{date_str}-"

    last = (
        db.query(Payment)
        .filter(Payment.receipt_number.like(f"{prefix}%"))
        .order_by(Payment.id.desc())
        .first()
    )

    if last:
        last_num = int(last.receipt_number.split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1

    return f"{prefix}{next_num:04d}"
