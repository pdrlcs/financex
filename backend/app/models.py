import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransacaoType(str, enum.Enum):
    despesa = "despesa"
    receita = "receita"
    investimento = "investimento"
    retirada_investimento = "retirada_investimento"
    compra_cripto = "compra_cripto"
    venda_cripto = "venda_cripto"


class TagType(str, enum.Enum):
    despesa = "despesa"
    receita = "receita"
    investimento = "investimento"


class PaymentMethod(str, enum.Enum):
    pix = "pix"
    card = "card"
    cash = "cash"
    transfer = "transfer"


class ContaType(str, enum.Enum):
    banco = "banco"
    investimento = "investimento"
    carteira = "carteira"


class TimestampMixin:
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Tag(TimestampMixin, Base):
    __tablename__ = "tag"

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[TagType] = mapped_column(
        Enum(TagType, name="tag_type"), nullable=False
    )
    color: Mapped[str] = mapped_column(String(7), nullable=False)


class Conta(TimestampMixin, Base):
    __tablename__ = "conta"

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[ContaType] = mapped_column(
        Enum(ContaType, name="conta_type"), nullable=False
    )
    color: Mapped[str] = mapped_column(String(7), nullable=False)


class Transacao(TimestampMixin, Base):
    __tablename__ = "transacao"

    type: Mapped[TransacaoType] = mapped_column(
        Enum(TransacaoType, name="transacao_type"), nullable=False
    )
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("conta.id"), nullable=False
    )
    tag_id: Mapped[int | None] = mapped_column(
        ForeignKey("tag.id"), nullable=True
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=True
    )
    quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 8), nullable=True
    )

    account: Mapped["Conta"] = relationship("Conta")
    tag: Mapped["Tag | None"] = relationship("Tag")


class Orcamento(TimestampMixin, Base):
    __tablename__ = "orcamento"

    tag_id: Mapped[int] = mapped_column(ForeignKey("tag.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    limit_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    tag: Mapped["Tag"] = relationship("Tag")
