import datetime as _dt
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models import PaymentMethod, TransacaoType


class TransacaoCreate(BaseModel):
    type: TransacaoType
    value: Decimal
    date: _dt.date
    description: Optional[str] = None
    account_id: int
    tag_id: Optional[int] = None
    payment_method: Optional[PaymentMethod] = None
    quantity: Optional[Decimal] = None

    @field_validator("value")
    @classmethod
    def value_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v

    @model_validator(mode="after")
    def check_quantity(self):
        cripto = self.type in (TransacaoType.compra_cripto, TransacaoType.venda_cripto)
        if cripto:
            if self.quantity is None or self.quantity <= 0:
                raise ValueError("quantity is required and must be > 0 for crypto transactions")
        elif self.quantity is not None:
            raise ValueError("quantity is only allowed for crypto transactions")
        return self


class TransacaoUpdate(BaseModel):
    type: Optional[TransacaoType] = None
    value: Optional[Decimal] = None
    date: Optional[_dt.date] = None
    description: Optional[str] = None
    account_id: Optional[int] = None
    tag_id: Optional[int] = None
    payment_method: Optional[PaymentMethod] = None
    quantity: Optional[Decimal] = None

    @field_validator("value")
    @classmethod
    def value_must_be_positive(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("value must be greater than 0")
        return v


class TransacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    active: bool
    created_at: _dt.datetime
    updated_at: _dt.datetime
    type: TransacaoType
    value: Decimal
    date: _dt.date
    description: Optional[str]
    account_id: int
    tag_id: Optional[int]
    payment_method: Optional[PaymentMethod]
    quantity: Optional[Decimal]
