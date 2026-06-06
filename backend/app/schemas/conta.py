from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import ContaType


class ContaCreate(BaseModel):
    name: str = Field(..., max_length=64)
    type: ContaType
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class ContaUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=64)
    type: Optional[ContaType] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class ContaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    active: bool
    created_at: datetime
    updated_at: datetime
    name: str
    type: ContaType
    color: str
