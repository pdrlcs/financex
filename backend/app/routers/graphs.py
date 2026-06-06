from calendar import monthrange
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.graphs import queries

router = APIRouter(prefix="/graphs", tags=["graphs"])


def _defaults():
    today = date.today()
    return (
        date(today.year, today.month, 1),
        date(today.year, today.month, monthrange(today.year, today.month)[1]),
    )


def _parse_exclude(exclude_tags: str) -> List[int]:
    return [int(x) for x in exclude_tags.split(",") if x.strip()]


# ─── RESUMO ───────────────────────────────────────────────────────────────────

@router.get("/resumo")
def resumo(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.resumo(db, date_from or first, date_to or last, _parse_exclude(exclude_tags))


# ─── POR TAG ──────────────────────────────────────────────────────────────────

@router.get("/por-tag")
def por_tag(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: str = "despesa",
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.por_tag(db, date_from or first, date_to or last, type, _parse_exclude(exclude_tags))


# ─── POR TAG TEMPORAL ─────────────────────────────────────────────────────────

@router.get("/por-tag-temporal")
def por_tag_temporal(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: str = "despesa",
    granularity: str = "month",
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.por_tag_temporal(
        db, date_from or first, date_to or last, type, granularity, _parse_exclude(exclude_tags)
    )


# ─── RANKING TAGS ─────────────────────────────────────────────────────────────

@router.get("/ranking-tags")
def ranking_tags(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: str = "despesa",
    exclude_tags: str = "",
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.ranking_tags(
        db, date_from or first, date_to or last, type, _parse_exclude(exclude_tags), limit
    )


# ─── VARIACAO TAGS ────────────────────────────────────────────────────────────

@router.get("/variacao-tags")
def variacao_tags(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: str = "despesa",
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.variacao_tags(
        db, date_from or first, date_to or last, type, _parse_exclude(exclude_tags)
    )


# ─── POR MES ──────────────────────────────────────────────────────────────────

@router.get("/por-mes")
def por_mes(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    granularity: str = "month",
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.por_mes(
        db, date_from or first, date_to or last, granularity, _parse_exclude(exclude_tags)
    )


# ─── POR CONTA ────────────────────────────────────────────────────────────────

@router.get("/por-conta")
def por_conta(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: Optional[str] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.por_conta(
        db, date_from or first, date_to or last, type, _parse_exclude(exclude_tags)
    )


# ─── POR METODO ───────────────────────────────────────────────────────────────

@router.get("/por-metodo")
def por_metodo(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.por_metodo(db, date_from or first, date_to or last, _parse_exclude(exclude_tags))


# ─── INVESTIMENTOS / APORTE ───────────────────────────────────────────────────

@router.get("/investimentos/aporte")
def investimentos_aporte(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    granularity: str = "month",
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.investimentos_aporte(
        db, date_from or first, date_to or last, granularity, _parse_exclude(exclude_tags)
    )


# ─── INVESTIMENTOS / ACUMULADO ────────────────────────────────────────────────

@router.get("/investimentos/acumulado")
def investimentos_acumulado(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    granularity: str = "month",
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.investimentos_acumulado(
        db, date_from or first, date_to or last, granularity, _parse_exclude(exclude_tags)
    )


# ─── HEATMAP ──────────────────────────────────────────────────────────────────

@router.get("/heatmap")
def heatmap(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.heatmap(db, date_from or first, date_to or last, _parse_exclude(exclude_tags))


# ─── POR DIA SEMANA ───────────────────────────────────────────────────────────

@router.get("/por-dia-semana")
def por_dia_semana(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_tags: str = "",
    agregacao: str = "media",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.por_dia_semana(
        db, date_from or first, date_to or last, _parse_exclude(exclude_tags), agregacao
    )


# ─── BURNDOWN ─────────────────────────────────────────────────────────────────

@router.get("/burndown")
def burndown(
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    return queries.burndown(db, _parse_exclude(exclude_tags))


# ─── POR DIA MES ──────────────────────────────────────────────────────────────

@router.get("/por-dia-mes")
def por_dia_mes(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.por_dia_mes(db, date_from or first, date_to or last, _parse_exclude(exclude_tags))


# ─── PREVISAO / RUN RATE ──────────────────────────────────────────────────────

@router.get("/previsao/run-rate")
def previsao_run_rate(
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    return queries.previsao_run_rate(db, _parse_exclude(exclude_tags))


# ─── PREVISAO / MEDIA MOVEL ───────────────────────────────────────────────────

@router.get("/previsao/media-movel")
def previsao_media_movel(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    type: str = "despesa",
    exclude_tags: str = "",
    window: int = 3,
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.previsao_media_movel(
        db, date_from or first, date_to or last, type, _parse_exclude(exclude_tags), window
    )


# ─── PREVISAO / TENDENCIA ─────────────────────────────────────────────────────

@router.get("/previsao/tendencia")
def previsao_tendencia(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.previsao_tendencia(
        db, date_from or first, date_to or last, _parse_exclude(exclude_tags)
    )


# ─── PREVISAO / SAZONALIDADE ──────────────────────────────────────────────────

@router.get("/previsao/sazonalidade")
def previsao_sazonalidade(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    first, last = _defaults()
    return queries.previsao_sazonalidade(
        db, date_from or first, date_to or last, _parse_exclude(exclude_tags)
    )


# ─── ORCAMENTO / REALIZADO ────────────────────────────────────────────────────

@router.get("/orcamento/realizado")
def orcamento_realizado(
    year: Optional[int] = None,
    month: Optional[int] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    today = date.today()
    y = year or today.year
    m = month or today.month
    return queries.orcamento_realizado(db, y, m, _parse_exclude(exclude_tags))


# ─── ORCAMENTO / PROGRESSO ────────────────────────────────────────────────────

@router.get("/orcamento/progresso")
def orcamento_progresso(
    year: Optional[int] = None,
    month: Optional[int] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    today = date.today()
    y = year or today.year
    m = month or today.month
    return queries.orcamento_progresso(db, y, m, _parse_exclude(exclude_tags))


# ─── ORCAMENTO / ALERTA ESTOURO ───────────────────────────────────────────────

@router.get("/orcamento/alerta-estouro")
def orcamento_alerta_estouro(
    year: Optional[int] = None,
    month: Optional[int] = None,
    exclude_tags: str = "",
    db: Session = Depends(get_db),
):
    today = date.today()
    y = year or today.year
    m = month or today.month
    return queries.orcamento_alerta_estouro(db, y, m, _parse_exclude(exclude_tags))
