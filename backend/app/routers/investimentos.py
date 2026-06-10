from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import Transacao, TransacaoType
from app.services import quotes

router = APIRouter(tags=["investimentos"])


def _sum(db: Session, t_type: TransacaoType, col) -> Decimal:
    result = (
        db.query(func.coalesce(func.sum(col), 0))
        .filter(Transacao.active.is_(True), Transacao.type == t_type)
        .scalar()
    )
    return Decimal(str(result or 0))


@router.get("/mercado/btc")
def mercado_btc():
    return quotes.get_btc_brl()


@router.get("/investimentos/btc/resumo")
def btc_resumo(db: Session = Depends(get_db)):
    qty_compra = _sum(db, TransacaoType.compra_cripto, Transacao.quantity)
    qty_venda = _sum(db, TransacaoType.venda_cripto, Transacao.quantity)
    val_compra = _sum(db, TransacaoType.compra_cripto, Transacao.value)
    val_venda = _sum(db, TransacaoType.venda_cripto, Transacao.value)

    quantidade = qty_compra - qty_venda
    custo_medio = float(val_compra / qty_compra) if qty_compra > 0 else None
    investido_liquido = float(val_compra - val_venda)

    quote = quotes.get_btc_brl()
    available = bool(quote.get("available"))
    preco = quote.get("price") if available else None

    valor_atual = None
    lucro = None
    lucro_pct = None
    if preco is not None:
        valor_atual = float(quantidade) * preco
        base = float(quantidade) * custo_medio if custo_medio is not None else 0.0
        lucro = valor_atual - base
        lucro_pct = (lucro / base * 100) if base > 0 else None

    return {
        "available": available,
        "quantidade_btc": float(quantidade),
        "custo_medio": custo_medio,
        "investido_liquido": investido_liquido,
        "preco_atual": preco,
        "valor_atual": valor_atual,
        "lucro_prejuizo": lucro,
        "lucro_pct": lucro_pct,
        "updated_at": quote.get("updated_at"),
    }
