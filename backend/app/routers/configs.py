from decimal import Decimal
from http import HTTPStatus
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Conta, ContaType, GastoFixo, Orcamento, PaymentMethod, Tag, TagType

router = APIRouter(prefix="/configs", tags=["configs"])

# Cor usada ao auto-criar tag/conta faltante na importação de gastos fixos.
DEFAULT_COLOR = "#64748b"


class ConfigTagItem(BaseModel):
    name: str = Field(..., max_length=64)
    type: TagType
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class ConfigContaItem(BaseModel):
    name: str = Field(..., max_length=64)
    type: ContaType
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class ConfigGastoFixoItem(BaseModel):
    name: str = Field(..., max_length=64)
    tag_name: str = Field(..., max_length=64)
    tag_type: TagType
    expected_value: Decimal
    default_account_name: Optional[str] = Field(default=None, max_length=64)
    default_account_type: Optional[ContaType] = None
    default_payment_method: Optional[PaymentMethod] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    start_year: int
    start_month: int = Field(..., ge=1, le=12)


class ConfigOrcamentoItem(BaseModel):
    tag_name: str = Field(..., max_length=64)
    tag_type: TagType
    limit_value: Decimal
    start_year: int
    start_month: int = Field(..., ge=1, le=12)


class ConfigImportBody(BaseModel):
    tags: List[ConfigTagItem] = []
    contas: List[ConfigContaItem] = []
    gastos_fixos: List[ConfigGastoFixoItem] = []
    orcamentos: List[ConfigOrcamentoItem] = []


class ConfigTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    type: TagType
    color: str


class ConfigContaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    type: ContaType
    color: str


@router.get("/export")
def export_configs(db: Session = Depends(get_db)) -> Dict[str, Any]:
    tags = db.query(Tag).filter(Tag.active.is_(True)).all()
    contas = db.query(Conta).filter(Conta.active.is_(True)).all()
    gastos_fixos = db.query(GastoFixo).filter(GastoFixo.active.is_(True)).all()
    orcamentos = db.query(Orcamento).filter(Orcamento.active.is_(True)).all()
    return {
        "tags": [{"name": t.name, "type": t.type, "color": t.color} for t in tags],
        "contas": [{"name": c.name, "type": c.type, "color": c.color} for c in contas],
        "orcamentos": [
            {
                "tag_name": o.tag.name,
                "tag_type": o.tag.type,
                "limit_value": o.limit_value,
                "start_year": o.start_year,
                "start_month": o.start_month,
            }
            for o in orcamentos
        ],
        "gastos_fixos": [
            {
                "name": gf.name,
                "tag_name": gf.tag.name,
                "tag_type": gf.tag.type,
                "expected_value": gf.expected_value,
                "default_account_name": gf.default_account.name if gf.default_account else None,
                "default_account_type": gf.default_account.type if gf.default_account else None,
                "default_payment_method": gf.default_payment_method,
                "due_day": gf.due_day,
                "start_year": gf.start_year,
                "start_month": gf.start_month,
            }
            for gf in gastos_fixos
        ],
    }


@router.post("/import", status_code=HTTPStatus.OK)
def import_configs(payload: ConfigImportBody, db: Session = Depends(get_db)) -> Dict[str, Any]:
    tags_criadas = 0
    tags_ignoradas = 0
    contas_criadas = 0
    contas_ignoradas = 0

    for item in payload.tags:
        existing_active = (
            db.query(Tag)
            .filter(Tag.name == item.name, Tag.type == item.type, Tag.active.is_(True))
            .first()
        )
        if existing_active:
            tags_ignoradas += 1
            continue

        existing_inactive = (
            db.query(Tag)
            .filter(Tag.name == item.name, Tag.type == item.type, Tag.active.is_(False))
            .first()
        )
        if existing_inactive:
            existing_inactive.active = True
            existing_inactive.color = item.color
            db.flush()
        else:
            db.add(Tag(name=item.name, type=item.type, color=item.color))
            db.flush()
        tags_criadas += 1

    for item in payload.contas:
        existing_active = (
            db.query(Conta)
            .filter(Conta.name == item.name, Conta.active.is_(True))
            .first()
        )
        if existing_active:
            contas_ignoradas += 1
            continue

        existing_inactive = (
            db.query(Conta)
            .filter(Conta.name == item.name, Conta.active.is_(False))
            .first()
        )
        if existing_inactive:
            existing_inactive.active = True
            existing_inactive.color = item.color
            existing_inactive.type = item.type
            db.flush()
        else:
            db.add(Conta(name=item.name, type=item.type, color=item.color))
            db.flush()
        contas_criadas += 1

    orcamentos_criados = 0
    orcamentos_ignorados = 0

    for item in payload.orcamentos:
        tag = _resolve_or_create_tag(db, item.tag_name, item.tag_type)

        existing_active = (
            db.query(Orcamento)
            .filter(Orcamento.tag_id == tag.id, Orcamento.active.is_(True))
            .first()
        )
        if existing_active:
            orcamentos_ignorados += 1
            continue

        existing_inactive = (
            db.query(Orcamento)
            .filter(Orcamento.tag_id == tag.id, Orcamento.active.is_(False))
            .first()
        )
        target = existing_inactive or Orcamento(tag_id=tag.id)
        if existing_inactive:
            existing_inactive.active = True
        else:
            db.add(target)

        target.limit_value = item.limit_value
        target.start_year = item.start_year
        target.start_month = item.start_month
        db.flush()
        orcamentos_criados += 1

    gastos_criados = 0
    gastos_ignorados = 0

    for item in payload.gastos_fixos:
        tag = _resolve_or_create_tag(db, item.tag_name, item.tag_type)

        conta = None
        if item.default_account_name:
            conta = _resolve_or_create_conta(
                db, item.default_account_name, item.default_account_type
            )

        existing_active = (
            db.query(GastoFixo)
            .filter(
                GastoFixo.name == item.name,
                GastoFixo.tag_id == tag.id,
                GastoFixo.active.is_(True),
            )
            .first()
        )
        if existing_active:
            gastos_ignorados += 1
            continue

        existing_inactive = (
            db.query(GastoFixo)
            .filter(
                GastoFixo.name == item.name,
                GastoFixo.tag_id == tag.id,
                GastoFixo.active.is_(False),
            )
            .first()
        )
        target = existing_inactive or GastoFixo(name=item.name, tag_id=tag.id)
        if existing_inactive:
            existing_inactive.active = True
        else:
            db.add(target)

        target.expected_value = item.expected_value
        target.default_account_id = conta.id if conta else None
        target.default_payment_method = item.default_payment_method
        target.due_day = item.due_day
        target.start_year = item.start_year
        target.start_month = item.start_month
        db.flush()
        gastos_criados += 1

    db.commit()

    return {
        "tags": {"criadas": tags_criadas, "ignoradas": tags_ignoradas},
        "contas": {"criadas": contas_criadas, "ignoradas": contas_ignoradas},
        "orcamentos": {"criadas": orcamentos_criados, "ignoradas": orcamentos_ignorados},
        "gastos_fixos": {"criadas": gastos_criados, "ignoradas": gastos_ignorados},
    }


def _resolve_or_create_tag(db: Session, name: str, type: TagType) -> Tag:
    tag = (
        db.query(Tag)
        .filter(Tag.name == name, Tag.type == type, Tag.active.is_(True))
        .first()
    )
    if tag:
        return tag
    tag = Tag(name=name, type=type, color=DEFAULT_COLOR)
    db.add(tag)
    db.flush()
    return tag


def _resolve_or_create_conta(
    db: Session, name: str, type: Optional[ContaType]
) -> Conta:
    conta = (
        db.query(Conta)
        .filter(Conta.name == name, Conta.active.is_(True))
        .first()
    )
    if conta:
        return conta
    conta = Conta(name=name, type=type or ContaType.banco, color=DEFAULT_COLOR)
    db.add(conta)
    db.flush()
    return conta
