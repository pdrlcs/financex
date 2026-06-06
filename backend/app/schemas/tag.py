from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import TagType


class TagCreate(BaseModel):
    name: str = Field(..., max_length=64)
    type: TagType
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class TagUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=64)
    type: Optional[TagType] = None
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    active: bool
    created_at: datetime
    updated_at: datetime
    name: str
    type: TagType
    color: str
