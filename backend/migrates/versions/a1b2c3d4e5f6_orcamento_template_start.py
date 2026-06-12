"""orcamento template: year/month -> start_year/start_month

Revision ID: a1b2c3d4e5f6
Revises: 91501cf113ee
Create Date: 2026-06-12 05:00:00.000000

"""
from collections import defaultdict
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "91501cf113ee"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Colunas novas (nullable por enquanto).
    op.add_column("orcamento", sa.Column("start_year", sa.Integer(), nullable=True))
    op.add_column("orcamento", sa.Column("start_month", sa.Integer(), nullable=True))

    conn = op.get_bind()

    # 2. Backfill: cada linha herda o próprio (year, month).
    conn.execute(sa.text("UPDATE orcamento SET start_year = year, start_month = month"))

    # 3. Colapsa duplicatas por tag entre os ativos: mantém um template com
    #    start = mês mais antigo e limit_value = do mês mais recente; os demais
    #    ativos da mesma tag viram inativos.
    rows = conn.execute(
        sa.text(
            "SELECT id, tag_id, year, month FROM orcamento WHERE active = true"
        )
    ).mappings().all()

    groups: dict[int, list] = defaultdict(list)
    for r in rows:
        groups[r["tag_id"]].append(r)

    for items in groups.values():
        if len(items) < 2:
            continue
        items.sort(key=lambda r: r["year"] * 12 + r["month"])
        earliest = items[0]
        winner = items[-1]  # mantém o mais recente (limite mais atual)
        conn.execute(
            sa.text(
                "UPDATE orcamento SET start_year = :sy, start_month = :sm WHERE id = :id"
            ),
            {"sy": earliest["year"], "sm": earliest["month"], "id": winner["id"]},
        )
        for it in items:
            if it["id"] != winner["id"]:
                conn.execute(
                    sa.text("UPDATE orcamento SET active = false WHERE id = :id"),
                    {"id": it["id"]},
                )

    # 4. NOT NULL + dropa as colunas antigas.
    op.alter_column("orcamento", "start_year", nullable=False)
    op.alter_column("orcamento", "start_month", nullable=False)
    op.drop_column("orcamento", "year")
    op.drop_column("orcamento", "month")


def downgrade() -> None:
    op.add_column("orcamento", sa.Column("year", sa.Integer(), nullable=True))
    op.add_column("orcamento", sa.Column("month", sa.Integer(), nullable=True))

    conn = op.get_bind()
    conn.execute(sa.text("UPDATE orcamento SET year = start_year, month = start_month"))

    op.alter_column("orcamento", "year", nullable=False)
    op.alter_column("orcamento", "month", nullable=False)
    op.drop_column("orcamento", "start_year")
    op.drop_column("orcamento", "start_month")
