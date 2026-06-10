import datetime as _dt
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import PaymentMethod
from app.schemas.transacao import TransacaoOut


class GastoFixoCreate(BaseModel):
    name: str = Field(..., max_length=64)
    tag_id: int
    expected_value: Decimal
    default_account_id: Optional[int] = None
    default_payment_method: Optional[PaymentMethod] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    start_year: int
    start_month: int = Field(..., ge=1, le=12)

    @field_validator("expected_value")
    @classmethod
    def expected_value_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("expected_value must be greater than 0")
        return v


class GastoFixoUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=64)
    tag_id: Optional[int] = None
    expected_value: Optional[Decimal] = None
    default_account_id: Optional[int] = None
    default_payment_method: Optional[PaymentMethod] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    start_year: Optional[int] = None
    start_month: Optional[int] = Field(default=None, ge=1, le=12)

    @field_validator("expected_value")
    @classmethod
    def expected_value_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("expected_value must be greater than 0")
        return v


class GastoFixoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    active: bool
    created_at: _dt.datetime
    updated_at: _dt.datetime
    name: str
    tag_id: int
    expected_value: Decimal
    default_account_id: Optional[int]
    default_payment_method: Optional[PaymentMethod]
    due_day: Optional[int]
    start_year: int
    start_month: int


class MarcarPagoPayload(BaseModel):
    value: Decimal
    date: _dt.date
    account_id: int
    payment_method: Optional[PaymentMethod] = None

    @field_validator("value")
    @classmethod
    def value_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v


class GastoFixoStatusOut(BaseModel):
    gasto_fixo: GastoFixoOut
    pago: bool
    transacao: Optional[TransacaoOut] = None
