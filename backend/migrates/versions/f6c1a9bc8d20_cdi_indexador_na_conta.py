"""cdi: indexador na conta

Revision ID: f6c1a9bc8d20
Revises: d908d7f3c8ec
Create Date: 2026-06-10 20:05:33.606546

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6c1a9bc8d20'
down_revision: Union[str, None] = 'd908d7f3c8ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    indexador_enum = sa.Enum('cdi', name='indexador')
    indexador_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('conta', sa.Column('indexador', indexador_enum, nullable=True))
    op.add_column('conta', sa.Column('indexador_percent', sa.Numeric(precision=6, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('conta', 'indexador_percent')
    op.drop_column('conta', 'indexador')
    sa.Enum(name='indexador').drop(op.get_bind(), checkfirst=True)
