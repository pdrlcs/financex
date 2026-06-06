from http import HTTPStatus
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Conta, ContaType, Tag, TagType

router = APIRouter(prefix="/configs", tags=["configs"])


class ConfigTagItem(BaseModel):
    name: str = Field(..., max_length=64)
    type: TagType
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class ConfigContaItem(BaseModel):
    name: str = Field(..., max_length=64)
    type: ContaType
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class ConfigImportBody(BaseModel):
    tags: List[ConfigTagItem] = []
    contas: List[ConfigContaItem] = []


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
    return {
        "tags": [{"name": t.name, "type": t.type, "color": t.color} for t in tags],
        "contas": [{"name": c.name, "type": c.type, "color": c.color} for c in contas],
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

    db.commit()

    return {
        "tags": {"criadas": tags_criadas, "ignoradas": tags_ignoradas},
        "contas": {"criadas": contas_criadas, "ignoradas": contas_ignoradas},
    }
