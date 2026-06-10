"""btc: compra/venda_cripto + quantity

Revision ID: d908d7f3c8ec
Revises: edd0ae888631
Create Date: 2026-06-10 19:59:33.474366

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd908d7f3c8ec'
down_revision: Union[str, None] = 'edd0ae888631'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE transacao_type ADD VALUE IF NOT EXISTS 'compra_cripto'")
    op.execute("ALTER TYPE transacao_type ADD VALUE IF NOT EXISTS 'venda_cripto'")
    op.add_column(
        "transacao",
        sa.Column("quantity", sa.Numeric(precision=18, scale=8), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transacao", "quantity")
    # Nota: Postgres não remove valores de enum; o downgrade deixa os valores
    # 'compra_cripto'/'venda_cripto' no tipo. Para reset total de dev use
    # DROP SCHEMA public CASCADE (ver spec §6).
