from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OrcamentoCreate(BaseModel):
    tag_id: int
    year: int
    month: int = Field(..., ge=1, le=12)
    limit_value: Decimal

    @field_validator("limit_value")
    @classmethod
    def limit_value_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("limit_value must be greater than 0")
        return v


class OrcamentoUpdate(BaseModel):
    tag_id: Optional[int] = None
    year: Optional[int] = None
    month: Optional[int] = Field(default=None, ge=1, le=12)
    limit_value: Optional[Decimal] = None

    @field_validator("limit_value")
    @classmethod
    def limit_value_must_be_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("limit_value must be greater than 0")
        return v


class OrcamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    active: bool
    created_at: datetime
    updated_at: datetime
    tag_id: int
    year: int
    month: int
    limit_value: Decimal
