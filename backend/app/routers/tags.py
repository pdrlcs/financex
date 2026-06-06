from http import HTTPStatus
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Tag, TagType
from app.schemas.tag import TagCreate, TagOut, TagUpdate

router = APIRouter(prefix="/tags", tags=["tags"])


def _check_uniqueness(
    db: Session,
    name: str,
    type: TagType,
    exclude_id: Optional[int] = None,
) -> None:
    """Raise 409 if there's already an active tag with the same name and type."""
    query = db.query(Tag).filter(
        Tag.name == name,
        Tag.type == type,
        Tag.active.is_(True),
    )
    if exclude_id is not None:
        query = query.filter(Tag.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="A tag with this name and type already exists.",
        )


@router.get("/", response_model=List[TagOut])
def list_tags(
    type: Optional[TagType] = None,
    active: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(Tag).filter(Tag.active.is_(active))
    if type is not None:
        query = query.filter(Tag.type == type)
    return query.all()


@router.post("/", response_model=TagOut, status_code=HTTPStatus.CREATED)
def create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    _check_uniqueness(db, payload.name, payload.type)
    tag = Tag(name=payload.name, type=payload.type, color=payload.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.get("/{tag_id}", response_model=TagOut)
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.active.is_(True)).first()
    if tag is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Tag not found.")
    return tag


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(tag_id: int, payload: TagUpdate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.active.is_(True)).first()
    if tag is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Tag not found.")

    new_name = payload.name if payload.name is not None else tag.name
    new_type = payload.type if payload.type is not None else tag.type

    # Only check uniqueness if something changed
    if payload.name is not None or payload.type is not None:
        _check_uniqueness(db, new_name, new_type, exclude_id=tag_id)

    if payload.name is not None:
        tag.name = payload.name
    if payload.type is not None:
        tag.type = payload.type
    if payload.color is not None:
        tag.color = payload.color

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.active.is_(True)).first()
    if tag is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="Tag not found.")
    tag.active = False
    db.commit()
