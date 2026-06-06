from http import HTTPStatus
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Conta, ContaType
from app.schemas.conta import ContaCreate, ContaOut, ContaUpdate

router = APIRouter(prefix="/contas", tags=["contas"])


def _check_uniqueness(
    db: Session,
    name: str,
    exclude_id: Optional[int] = None,
) -> None:
    """Raise 409 if there's already an active conta with the same name."""
    query = db.query(Conta).filter(
        Conta.name == name,
        Conta.active.is_(True),
    )
    if exclude_id is not None:
        query = query.filter(Conta.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="A conta with this name already exists.",
        )


@router.get("/", response_model=List[ContaOut])
def list_contas(
    type: Optional[ContaType] = None,
    active: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(Conta).filter(Conta.active.is_(active))
    if type is not None:
        query = query.filter(Conta.type == type)
    return query.all()


@router.post("/", response_model=ContaOut, status_code=HTTPStatus.CREATED)
def create_conta(payload: ContaCreate, db: Session = Depends(get_db)):
    _check_uniqueness(db, payload.name)
    conta = Conta(name=payload.name, type=payload.type, color=payload.color)
    db.add(conta)
    db.commit()
    db.refresh(conta)
    return conta


@router.get("/{conta_id}", response_model=ContaOut)
def get_conta(conta_id: int, db: Session = Depends(get_db)):
    conta = db.query(Conta).filter(Conta.id == conta_id, Conta.active.is_(True)).first()
    if conta is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Conta not found.")
    return conta


@router.put("/{conta_id}", response_model=ContaOut)
def update_conta(conta_id: int, payload: ContaUpdate, db: Session = Depends(get_db)):
    conta = db.query(Conta).filter(Conta.id == conta_id, Conta.active.is_(True)).first()
    if conta is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Conta not found.")

    # Only check uniqueness if name is being changed
    if payload.name is not None:
        _check_uniqueness(db, payload.name, exclude_id=conta_id)

    if payload.name is not None:
        conta.name = payload.name
    if payload.type is not None:
        conta.type = payload.type
    if payload.color is not None:
        conta.color = payload.color

    db.commit()
    db.refresh(conta)
    return conta


@router.delete("/{conta_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_conta(conta_id: int, db: Session = Depends(get_db)):
    conta = db.query(Conta).filter(Conta.id == conta_id, Conta.active.is_(True)).first()
    if conta is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Conta not found.")
    conta.active = False
    db.commit()
