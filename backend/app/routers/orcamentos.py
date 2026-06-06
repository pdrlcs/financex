from http import HTTPStatus
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Orcamento, Tag, TagType
from app.schemas.orcamento import OrcamentoCreate, OrcamentoOut, OrcamentoUpdate

router = APIRouter(prefix="/orcamentos", tags=["orcamentos"])


def _get_valid_despesa_tag(db: Session, tag_id: int) -> Tag:
    """Return the Tag if it exists, is active, and has type=despesa. Otherwise raise 422."""
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


def _check_uniqueness(
    db: Session,
    tag_id: int,
    year: int,
    month: int,
    exclude_id: Optional[int] = None,
) -> None:
    """Raise 409 if an active orcamento with the same (tag_id, year, month) already exists."""
    query = db.query(Orcamento).filter(
        Orcamento.tag_id == tag_id,
        Orcamento.year == year,
        Orcamento.month == month,
        Orcamento.active.is_(True),
    )
    if exclude_id is not None:
        query = query.filter(Orcamento.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="An active orcamento with this (tag_id, year, month) already exists.",
        )


@router.get("/", response_model=List[OrcamentoOut])
def list_orcamentos(
    year: Optional[int] = None,
    month: Optional[int] = None,
    tag_id: Optional[int] = None,
    active: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(Orcamento).filter(Orcamento.active.is_(active))
    if year is not None:
        query = query.filter(Orcamento.year == year)
    if month is not None:
        query = query.filter(Orcamento.month == month)
    if tag_id is not None:
        query = query.filter(Orcamento.tag_id == tag_id)
    return query.all()


@router.post("/", response_model=OrcamentoOut, status_code=HTTPStatus.CREATED)
def create_orcamento(payload: OrcamentoCreate, db: Session = Depends(get_db)):
    _get_valid_despesa_tag(db, payload.tag_id)
    _check_uniqueness(db, payload.tag_id, payload.year, payload.month)

    orcamento = Orcamento(
        tag_id=payload.tag_id,
        year=payload.year,
        month=payload.month,
        limit_value=payload.limit_value,
    )
    db.add(orcamento)
    db.commit()
    db.refresh(orcamento)
    return orcamento


@router.get("/{orcamento_id}", response_model=OrcamentoOut)
def get_orcamento(orcamento_id: int, db: Session = Depends(get_db)):
    orcamento = (
        db.query(Orcamento)
        .filter(Orcamento.id == orcamento_id, Orcamento.active.is_(True))
        .first()
    )
    if orcamento is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Orcamento not found.")
    return orcamento


@router.put("/{orcamento_id}", response_model=OrcamentoOut)
def update_orcamento(orcamento_id: int, payload: OrcamentoUpdate, db: Session = Depends(get_db)):
    orcamento = (
        db.query(Orcamento)
        .filter(Orcamento.id == orcamento_id, Orcamento.active.is_(True))
        .first()
    )
    if orcamento is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Orcamento not found.")

    # Validate tag_id if changing
    if payload.tag_id is not None:
        _get_valid_despesa_tag(db, payload.tag_id)

    # Compute the effective (tag_id, year, month) after update to check uniqueness
    effective_tag_id = payload.tag_id if payload.tag_id is not None else orcamento.tag_id
    effective_year = payload.year if payload.year is not None else orcamento.year
    effective_month = payload.month if payload.month is not None else orcamento.month

    # Only check uniqueness if any of the combo fields are changing
    if payload.tag_id is not None or payload.year is not None or payload.month is not None:
        _check_uniqueness(db, effective_tag_id, effective_year, effective_month, exclude_id=orcamento_id)

    if payload.tag_id is not None:
        orcamento.tag_id = payload.tag_id
    if payload.year is not None:
        orcamento.year = payload.year
    if payload.month is not None:
        orcamento.month = payload.month
    if payload.limit_value is not None:
        orcamento.limit_value = payload.limit_value

    db.commit()
    db.refresh(orcamento)
    return orcamento


@router.delete("/{orcamento_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_orcamento(orcamento_id: int, db: Session = Depends(get_db)):
    orcamento = (
        db.query(Orcamento)
        .filter(Orcamento.id == orcamento_id, Orcamento.active.is_(True))
        .first()
    )
    if orcamento is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Orcamento not found.")
    orcamento.active = False
    db.commit()
