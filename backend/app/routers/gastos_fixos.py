from http import HTTPStatus
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Conta, GastoFixo, Tag, TagType, Transacao, TransacaoType
from app.schemas.gasto_fixo import (
    GastoFixoCreate,
    GastoFixoOut,
    GastoFixoStatusOut,
    GastoFixoUpdate,
    MarcarPagoPayload,
)

router = APIRouter(prefix="/gastos-fixos", tags=["gastos-fixos"])


def _get_valid_despesa_tag(db: Session, tag_id: int) -> Tag:
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None or not tag.active:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Tag not found or inactive.",
        )
    if tag.type != TagType.despesa:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Tag must have type 'despesa'.",
        )
    return tag


def _validate_account(db: Session, account_id: int) -> Conta:
    conta = db.query(Conta).filter(Conta.id == account_id, Conta.active.is_(True)).first()
    if conta is None:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Account not found or inactive.",
        )
    return conta


def _get_active(db: Session, gid: int) -> GastoFixo:
    gf = db.query(GastoFixo).filter(GastoFixo.id == gid, GastoFixo.active.is_(True)).first()
    if gf is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="GastoFixo not found.")
    return gf


def _transacao_do_mes(db: Session, gid: int, year: int, month: int):
    return (
        db.query(Transacao)
        .filter(
            Transacao.gasto_fixo_id == gid,
            Transacao.active.is_(True),
            extract("year", Transacao.date) == year,
            extract("month", Transacao.date) == month,
        )
        .first()
    )


@router.get("/", response_model=List[GastoFixoOut])
def list_gastos_fixos(active: bool = True, db: Session = Depends(get_db)):
    return db.query(GastoFixo).filter(GastoFixo.active.is_(active)).all()


@router.post("/", response_model=GastoFixoOut, status_code=HTTPStatus.CREATED)
def create_gasto_fixo(payload: GastoFixoCreate, db: Session = Depends(get_db)):
    _get_valid_despesa_tag(db, payload.tag_id)
    if payload.default_account_id is not None:
        _validate_account(db, payload.default_account_id)

    gf = GastoFixo(**payload.model_dump())
    db.add(gf)
    db.commit()
    db.refresh(gf)
    return gf


# Rota de status: declarada antes de /{gasto_fixo_id} para não colidir.
@router.get("/status", response_model=List[GastoFixoStatusOut])
def status_mes(year: int, month: int, db: Session = Depends(get_db)):
    templates = (
        db.query(GastoFixo)
        .filter(
            GastoFixo.active.is_(True),
            (GastoFixo.start_year * 12 + GastoFixo.start_month) <= (year * 12 + month),
        )
        .all()
    )
    result = []
    for gf in templates:
        tx = _transacao_do_mes(db, gf.id, year, month)
        result.append({"gasto_fixo": gf, "pago": tx is not None, "transacao": tx})
    return result


@router.get("/{gasto_fixo_id}", response_model=GastoFixoOut)
def get_gasto_fixo(gasto_fixo_id: int, db: Session = Depends(get_db)):
    return _get_active(db, gasto_fixo_id)


@router.put("/{gasto_fixo_id}", response_model=GastoFixoOut)
def update_gasto_fixo(gasto_fixo_id: int, payload: GastoFixoUpdate, db: Session = Depends(get_db)):
    gf = _get_active(db, gasto_fixo_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("tag_id") is not None:
        _get_valid_despesa_tag(db, data["tag_id"])
    if data.get("default_account_id") is not None:
        _validate_account(db, data["default_account_id"])
    for key, value in data.items():
        setattr(gf, key, value)
    db.commit()
    db.refresh(gf)
    return gf


@router.delete("/{gasto_fixo_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_gasto_fixo(gasto_fixo_id: int, db: Session = Depends(get_db)):
    gf = _get_active(db, gasto_fixo_id)
    gf.active = False
    db.commit()


@router.post("/{gasto_fixo_id}/marcar-pago", status_code=HTTPStatus.CREATED)
def marcar_pago(
    gasto_fixo_id: int,
    year: int,
    month: int,
    payload: MarcarPagoPayload,
    db: Session = Depends(get_db),
):
    gf = _get_active(db, gasto_fixo_id)
    _validate_account(db, payload.account_id)

    if _transacao_do_mes(db, gf.id, year, month) is not None:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Gasto fixo already paid for this month.",
        )

    tx = Transacao(
        type=TransacaoType.despesa,
        value=payload.value,
        date=payload.date,
        description=gf.name,
        account_id=payload.account_id,
        tag_id=gf.tag_id,
        payment_method=payload.payment_method,
        gasto_fixo_id=gf.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{gasto_fixo_id}/pagamento", status_code=HTTPStatus.NO_CONTENT)
def desmarcar_pago(gasto_fixo_id: int, year: int, month: int, db: Session = Depends(get_db)):
    tx = _transacao_do_mes(db, gasto_fixo_id, year, month)
    if tx is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Payment not found.")
    tx.active = False
    db.commit()
