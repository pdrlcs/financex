from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import ContaType, Indexador


class ContaCreate(BaseModel):
    name: str = Field(..., max_length=64)
    type: ContaType
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    indexador: Optional[Indexador] = None
    indexador_percent: Optional[Decimal] = None

    @model_validator(mode="after")
    def check_indexador(self):
        if self.indexador is not None:
            if self.type != ContaType.investimento:
                raise ValueError("indexador requires type 'investimento'")
            if self.indexador_percent is None or self.indexador_percent <= 0:
                raise ValueError("indexador_percent is required and must be > 0")
        return self


class ContaUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=64)
    type: Optional[ContaType] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    indexador: Optional[Indexador] = None
    indexador_percent: Optional[Decimal] = None


class ContaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    active: bool
    created_at: datetime
    updated_at: datetime
    name: str
    type: ContaType
    color: str
    indexador: Optional[Indexador]
    indexador_percent: Optional[Decimal]
