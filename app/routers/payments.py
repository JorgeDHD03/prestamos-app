from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Payment, Loan, LoanStatus, User
from app.schemas import PaymentCreate, PaymentOut, ReceiptOut
from app.auth import get_current_user
from app.utils.loan_calculator import calculate_interest_for_balance
from app.utils.receipt import generate_receipt_number

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(
    req: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == req.loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    if loan.status == LoanStatus.PAID:
        raise HTTPException(status_code=400, detail="Este préstamo ya está saldado")

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero")

    # Calculate interest on current balance
    interest_due = calculate_interest_for_balance(loan.outstanding_balance, loan.interest_rate)

    # Split payment: first cover interest, then principal
    if req.amount <= interest_due:
        interest_portion = req.amount
        principal_portion = 0.0
    else:
        interest_portion = interest_due
        principal_portion = round(req.amount - interest_due, 2)

    # Don't let principal portion exceed outstanding balance
    if principal_portion > loan.outstanding_balance:
        principal_portion = loan.outstanding_balance
        # Refund excess? No, just cap it
        actual_amount = round(interest_portion + principal_portion, 2)
    else:
        actual_amount = req.amount

    new_balance = round(loan.outstanding_balance - principal_portion, 2)
    new_balance = max(new_balance, 0.0)

    receipt = generate_receipt_number(db, req.payment_date)

    payment = Payment(
        loan_id=req.loan_id,
        amount=actual_amount,
        principal_portion=principal_portion,
        interest_portion=interest_portion,
        penalty_portion=0.0,
        balance_after=new_balance,
        payment_date=req.payment_date,
        receipt_number=receipt,
        notes=req.notes,
    )
    db.add(payment)

    # Update loan balance
    loan.outstanding_balance = new_balance
    if new_balance <= 0:
        loan.status = LoanStatus.PAID

    db.commit()
    db.refresh(payment)

    return PaymentOut(
        id=payment.id,
        loan_id=payment.loan_id,
        amount=payment.amount,
        principal_portion=payment.principal_portion,
        interest_portion=payment.interest_portion,
        penalty_portion=payment.penalty_portion or 0.0,
        balance_after=payment.balance_after,
        payment_date=payment.payment_date,
        receipt_number=payment.receipt_number,
        notes=payment.notes,
        created_at=payment.created_at,
    )


@router.get("/{payment_id}/receipt", response_model=ReceiptOut)
def get_receipt(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    loan = payment.loan
    client = loan.client
    balance_before = round(payment.balance_after + payment.principal_portion, 2)

    return ReceiptOut(
        receipt_number=payment.receipt_number,
        payment_date=payment.payment_date,
        client_name=client.full_name,
        client_id_number=client.id_number,
        loan_id=loan.id,
        amount=payment.amount,
        principal_portion=payment.principal_portion,
        interest_portion=payment.interest_portion,
        penalty_portion=payment.penalty_portion or 0.0,
        balance_before=balance_before,
        balance_after=payment.balance_after,
    )
