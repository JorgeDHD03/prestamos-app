from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Client, Loan, LoanStatus, User
from app.schemas import ClientCreate, ClientUpdate, ClientOut, ClientDetail, LoanOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/clients", tags=["Clients"])


def _client_to_out(client: Client) -> ClientOut:
    active_loans = [l for l in client.loans if l.status == LoanStatus.ACTIVE]
    return ClientOut(
        id=client.id,
        full_name=client.full_name,
        id_number=client.id_number,
        phone=client.phone,
        email=client.email,
        address=client.address,
        created_at=client.created_at,
        loan_count=len(client.loans),
        active_balance=round(sum(l.outstanding_balance for l in active_loans), 2),
    )


@router.get("", response_model=List[ClientOut])
def list_clients(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Client)
    if search:
        q = q.filter(
            Client.full_name.ilike(f"%{search}%") | Client.id_number.ilike(f"%{search}%")
        )
    clients = q.order_by(Client.full_name).all()
    return [_client_to_out(c) for c in clients]


@router.post("", response_model=ClientOut, status_code=201)
def create_client(
    req: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Client).filter(Client.id_number == req.id_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese número de identificación")

    client = Client(**req.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return _client_to_out(client)


@router.get("/{client_id}", response_model=ClientDetail)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    active_loans = [l for l in client.loans if l.status == LoanStatus.ACTIVE]
    loans_out = []
    for loan in client.loans:
        loans_out.append(LoanOut(
            id=loan.id,
            client_id=loan.client_id,
            client_name=client.full_name,
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
            payments_count=len(loan.payments),
        ))

    return ClientDetail(
        id=client.id,
        full_name=client.full_name,
        id_number=client.id_number,
        phone=client.phone,
        email=client.email,
        address=client.address,
        created_at=client.created_at,
        loan_count=len(client.loans),
        active_balance=round(sum(l.outstanding_balance for l in active_loans), 2),
        loans=loans_out,
    )


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    req: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return _client_to_out(client)


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    db.delete(client)
    db.commit()
