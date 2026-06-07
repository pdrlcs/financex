import csv
import io
from datetime import date
from http import HTTPStatus
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_db
from app.models import Conta, Tag, TagType, Transacao, TransacaoType, PaymentMethod
from app.schemas.transacao import TransacaoCreate, TransacaoOut, TransacaoUpdate

router = APIRouter(prefix="/transacoes", tags=["transacoes"])

# Tag compatibility: transacao type → required tag type
TAG_TYPE_COMPAT = {
    TransacaoType.despesa: TagType.despesa,
    TransacaoType.receita: TagType.receita,
    TransacaoType.investimento: TagType.investimento,
    TransacaoType.retirada_investimento: TagType.investimento,
}

CSV_FIELDNAMES = ["id", "type", "value", "date", "description", "account_name", "tag_name", "payment_method"]
IMPORT_FIELDNAMES = ["id", "type", "value", "date", "description", "account_name", "tag_name", "payment_method"]


def _validate_account(db: Session, account_id: int) -> Conta:
    conta = db.query(Conta).filter(Conta.id == account_id, Conta.active.is_(True)).first()
    if conta is None:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Account not found or inactive.",
        )
    return conta


def _validate_tag(db: Session, tag_id: int, transacao_type: TransacaoType) -> Tag:
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.active.is_(True)).first()
    if tag is None:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Tag not found.",
        )
    expected_tag_type = TAG_TYPE_COMPAT[transacao_type]
    if tag.type != expected_tag_type:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail=f"Tag type '{tag.type}' is incompatible with transacao type '{transacao_type}'.",
        )
    return tag


def _build_query(
    db: Session,
    type: Optional[TransacaoType],
    tag_id: Optional[int],
    account_id: Optional[int],
    date_from: Optional[date],
    date_to: Optional[date],
    active: bool,
):
    query = db.query(Transacao).filter(Transacao.active.is_(active))
    if type is not None:
        query = query.filter(Transacao.type == type)
    if tag_id is not None:
        query = query.filter(Transacao.tag_id == tag_id)
    if account_id is not None:
        query = query.filter(Transacao.account_id == account_id)
    if date_from is not None:
        query = query.filter(Transacao.date >= date_from)
    if date_to is not None:
        query = query.filter(Transacao.date <= date_to)
    return query


# ─── GET /export/csv — MUST be declared before /{id} ─────────────────────────

@router.get("/export/csv")
def export_csv(
    type: Optional[TransacaoType] = None,
    tag_id: Optional[int] = None,
    account_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    active: bool = True,
    db: Session = Depends(get_db),
):
    query = _build_query(db, type, tag_id, account_id, date_from, date_to, active)
    # Eager-load account/tag so the streaming generator (which runs after the DB
    # session is closed) reads already-materialized names instead of lazy-loading
    # on a detached instance.
    transacoes = query.options(
        joinedload(Transacao.account), joinedload(Transacao.tag)
    ).all()

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(CSV_FIELDNAMES)
        yield buf.getvalue()
        for t in transacoes:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                t.id,
                t.type.value,
                str(t.value),
                str(t.date),
                t.description or "",
                t.account.name,
                t.tag.name if t.tag is not None else "",
                t.payment_method.value if t.payment_method is not None else "",
            ])
            yield buf.getvalue()

    return StreamingResponse(
        generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=transacoes.csv"},
    )


# ─── POST /import/csv — MUST be declared before /{id} ────────────────────────

@router.post("/import/csv", status_code=HTTPStatus.CREATED)
def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate content type (allow text/csv or application/octet-stream for flexibility,
    # but reject clearly non-CSV content types like text/plain with non-CSV content)
    content_type = file.content_type or ""
    if content_type not in ("text/csv", "application/csv", "application/octet-stream", ""):
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="File must be a CSV file.",
        )

    raw = file.file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="Could not decode file as UTF-8.",
        )

    reader = csv.DictReader(io.StringIO(text))

    # Validate header
    if reader.fieldnames is None or list(reader.fieldnames) != IMPORT_FIELDNAMES:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail=f"CSV must have header: {','.join(IMPORT_FIELDNAMES)}",
        )

    importadas = 0
    erros = 0

    # Order rows by the `id` column ascending so transactions enter the system in
    # the same order they originally had. Rows with an invalid/missing id are kept
    # (and will be counted as errors below) but pushed to the end.
    def _row_sort_key(item):
        try:
            return (0, int((item.get("id") or "").strip()))
        except ValueError:
            return (1, 0)

    rows = sorted(reader, key=_row_sort_key)

    for row in rows:
        try:
            # Parse id (required for ordering)
            try:
                int((row.get("id") or "").strip())
            except ValueError:
                erros += 1
                continue

            # Parse and validate type
            try:
                t_type = TransacaoType(row["type"])
            except ValueError:
                erros += 1
                continue

            # Parse value
            try:
                from decimal import Decimal, InvalidOperation
                value = Decimal(row["value"])
                if value <= 0:
                    erros += 1
                    continue
            except (InvalidOperation, KeyError):
                erros += 1
                continue

            # Parse date
            try:
                from datetime import date as date_type
                t_date = date_type.fromisoformat(row["date"])
            except (ValueError, KeyError):
                erros += 1
                continue

            # Resolve account by name
            account_name = (row.get("account_name") or "").strip()
            if not account_name:
                erros += 1
                continue
            conta = db.query(Conta).filter(
                Conta.name == account_name, Conta.active.is_(True)
            ).first()
            if conta is None:
                erros += 1
                continue
            account_id = conta.id

            # Resolve optional tag by name + expected type (derived from transacao type).
            # A name that matches no active tag of the expected type is an error — this
            # covers both nonexistent and type-incompatible tags.
            tag_id = None
            tag_name = (row.get("tag_name") or "").strip()
            if tag_name:
                expected_tag_type = TAG_TYPE_COMPAT[t_type]
                tag = db.query(Tag).filter(
                    Tag.name == tag_name,
                    Tag.type == expected_tag_type,
                    Tag.active.is_(True),
                ).first()
                if tag is None:
                    erros += 1
                    continue
                tag_id = tag.id

            # Parse optional payment_method
            payment_method = None
            pm_str = row.get("payment_method", "").strip()
            if pm_str:
                try:
                    payment_method = PaymentMethod(pm_str)
                except ValueError:
                    erros += 1
                    continue

            description = row.get("description", "").strip() or None

            transacao = Transacao(
                type=t_type,
                value=value,
                date=t_date,
                description=description,
                account_id=account_id,
                tag_id=tag_id,
                payment_method=payment_method,
            )
            db.add(transacao)
            db.flush()
            importadas += 1

        except Exception:
            erros += 1
            continue

    db.commit()
    return {"importadas": importadas, "erros": erros}


# ─── GET / ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TransacaoOut])
def list_transacoes(
    type: Optional[TransacaoType] = None,
    tag_id: Optional[int] = None,
    account_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    active: bool = True,
    db: Session = Depends(get_db),
):
    query = _build_query(db, type, tag_id, account_id, date_from, date_to, active)
    return query.all()


# ─── POST / ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=TransacaoOut, status_code=HTTPStatus.CREATED)
def create_transacao(payload: TransacaoCreate, db: Session = Depends(get_db)):
    _validate_account(db, payload.account_id)

    if payload.tag_id is not None:
        _validate_tag(db, payload.tag_id, payload.type)

    transacao = Transacao(
        type=payload.type,
        value=payload.value,
        date=payload.date,
        description=payload.description,
        account_id=payload.account_id,
        tag_id=payload.tag_id,
        payment_method=payload.payment_method,
    )
    db.add(transacao)
    db.commit()
    db.refresh(transacao)
    return transacao


# ─── GET /{id} ────────────────────────────────────────────────────────────────

@router.get("/{transacao_id}", response_model=TransacaoOut)
def get_transacao(transacao_id: int, db: Session = Depends(get_db)):
    transacao = db.query(Transacao).filter(
        Transacao.id == transacao_id, Transacao.active.is_(True)
    ).first()
    if transacao is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Transacao not found.")
    return transacao


# ─── PUT /{id} ────────────────────────────────────────────────────────────────

@router.put("/{transacao_id}", response_model=TransacaoOut)
def update_transacao(transacao_id: int, payload: TransacaoUpdate, db: Session = Depends(get_db)):
    transacao = db.query(Transacao).filter(
        Transacao.id == transacao_id, Transacao.active.is_(True)
    ).first()
    if transacao is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Transacao not found.")

    # Determine effective type (used for tag compatibility check)
    effective_type = payload.type if payload.type is not None else transacao.type

    # Validate account if being changed
    if payload.account_id is not None:
        _validate_account(db, payload.account_id)

    # Validate tag if tag_id is being explicitly set (not null)
    # We need to handle the case where tag_id is explicitly set to None (clear it)
    # vs not provided at all.
    # In TransacaoUpdate, tag_id=None means "set to null" when it's in the body.
    # We use a sentinel approach: check if the field is in the payload dict.
    payload_dict = payload.model_dump(exclude_unset=True)

    if "tag_id" in payload_dict and payload_dict["tag_id"] is not None:
        _validate_tag(db, payload_dict["tag_id"], effective_type)
    elif "tag_id" not in payload_dict and "type" in payload_dict:
        # Type changed but tag_id not changed — re-validate existing tag if any
        existing_tag_id = transacao.tag_id
        if existing_tag_id is not None:
            _validate_tag(db, existing_tag_id, effective_type)

    # Apply updates
    if payload.type is not None:
        transacao.type = payload.type
    if payload.value is not None:
        transacao.value = payload.value
    if payload.date is not None:
        transacao.date = payload.date
    if "description" in payload_dict:
        transacao.description = payload_dict["description"]
    if payload.account_id is not None:
        transacao.account_id = payload.account_id
    if "tag_id" in payload_dict:
        transacao.tag_id = payload_dict["tag_id"]
    if "payment_method" in payload_dict:
        transacao.payment_method = payload_dict["payment_method"]

    db.commit()
    db.refresh(transacao)
    return transacao


# ─── DELETE /{id} ─────────────────────────────────────────────────────────────

@router.delete("/{transacao_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_transacao(transacao_id: int, db: Session = Depends(get_db)):
    transacao = db.query(Transacao).filter(
        Transacao.id == transacao_id, Transacao.active.is_(True)
    ).first()
    if transacao is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Transacao not found.")
    transacao.active = False
    db.commit()
