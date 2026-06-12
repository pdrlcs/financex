from calendar import monthrange
from datetime import date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models import (
    Conta,
    Orcamento,
    Tag,
    TagType,
    Transacao,
    TransacaoType,
    PaymentMethod,
)

MONTH_LABELS_PT = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

PAYMENT_METHOD_LABELS = {
    PaymentMethod.pix: "Pix",
    PaymentMethod.card: "Cartão",
    PaymentMethod.cash: "Dinheiro",
    PaymentMethod.transfer: "Transferência",
}

PAYMENT_METHOD_COLORS = {
    PaymentMethod.pix: "#10B981",
    PaymentMethod.card: "#3B82F6",
    PaymentMethod.cash: "#84CC16",
    PaymentMethod.transfer: "#A855F7",
}

DOW_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


def _base_query(db: Session, date_from: date, date_to: date, exclude_tags: List[int]):
    q = db.query(Transacao).filter(
        Transacao.active.is_(True),
        Transacao.date >= date_from,
        Transacao.date <= date_to,
    )
    if exclude_tags:
        q = q.filter(~Transacao.tag_id.in_(exclude_tags))
    return q


def _sum_type(db: Session, t_type: TransacaoType, date_from: date, date_to: date, exclude_tags: List[int]) -> float:
    result = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == t_type)
        .with_entities(func.coalesce(func.sum(Transacao.value), 0))
        .scalar()
    )
    return float(result or 0)


def _format_period_label(truncated_date, granularity: str) -> str:
    """Format a period label from a truncated date."""
    if truncated_date is None:
        return ""
    if hasattr(truncated_date, 'year'):
        d = truncated_date
    else:
        d = truncated_date
    if granularity == "month":
        return f"{MONTH_LABELS_PT[d.month - 1]}/{str(d.year)[2:]}"
    elif granularity == "week":
        return f"W{d.isocalendar()[1]}/{str(d.year)[2:]}"
    elif granularity == "day":
        return d.strftime("%d/%m")
    elif granularity == "year":
        return str(d.year)
    return str(d)


# ─── RESUMO ──────────────────────────────────────────────────────────────────

def resumo(db: Session, date_from: date, date_to: date, exclude_tags: List[int] = []) -> dict:
    receitas = _sum_type(db, TransacaoType.receita, date_from, date_to, exclude_tags)
    despesas = _sum_type(db, TransacaoType.despesa, date_from, date_to, exclude_tags)
    investimento = _sum_type(db, TransacaoType.investimento, date_from, date_to, exclude_tags)
    retirada = _sum_type(db, TransacaoType.retirada_investimento, date_from, date_to, exclude_tags)

    saldo = receitas - despesas
    investido_liquido = investimento - retirada
    taxa_poupanca = (investido_liquido / receitas) if receitas > 0 else None

    return {
        "receitas": receitas,
        "despesas": despesas,
        "saldo": saldo,
        "investido_liquido": investido_liquido,
        "taxa_poupanca": taxa_poupanca,
    }


# ─── POR TAG (doughnut) ───────────────────────────────────────────────────────

def por_tag(db: Session, date_from: date, date_to: date, type: str = "despesa", exclude_tags: List[int] = []) -> dict:
    t_type = TransacaoType(type)

    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == t_type, Transacao.tag_id.isnot(None))
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(Tag.name, Tag.color, func.sum(Transacao.value).label("total"))
        .group_by(Tag.id, Tag.name, Tag.color)
        .order_by(func.sum(Transacao.value).desc())
        .all()
    )

    if not rows:
        return {"labels": [], "datasets": [{"data": [], "backgroundColor": []}]}

    total_all = sum(float(r.total) for r in rows)
    if total_all == 0:
        return {"labels": [], "datasets": [{"data": [], "backgroundColor": []}]}

    main_labels = []
    main_data = []
    main_colors = []
    outros_total = 0.0

    for r in rows:
        val = float(r.total)
        pct = val / total_all
        if pct < 0.03:
            outros_total += val
        else:
            main_labels.append(r.name)
            main_data.append(round(val, 2))
            main_colors.append(r.color)

    if outros_total > 0:
        main_labels.append("Outros")
        main_data.append(round(outros_total, 2))
        main_colors.append("#9CA3AF")

    return {
        "labels": main_labels,
        "datasets": [{"data": main_data, "backgroundColor": main_colors}],
    }


# ─── POR TAG TEMPORAL (multi-line) ───────────────────────────────────────────

def por_tag_temporal(
    db: Session,
    date_from: date,
    date_to: date,
    type: str = "despesa",
    granularity: str = "month",
    exclude_tags: List[int] = [],
) -> dict:
    t_type = TransacaoType(type)

    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == t_type, Transacao.tag_id.isnot(None))
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(
            func.date_trunc(granularity, Transacao.date).label("period"),
            Tag.id.label("tag_id"),
            Tag.name.label("tag_name"),
            Tag.color.label("tag_color"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("period", Tag.id, Tag.name, Tag.color)
        .order_by("period")
        .all()
    )

    if not rows:
        return {"labels": [], "datasets": []}

    periods_seen: list = []
    period_set: set = set()
    tags_map: dict = {}

    for r in rows:
        p = r.period
        if p not in period_set:
            period_set.add(p)
            periods_seen.append(p)
        tid = r.tag_id
        if tid not in tags_map:
            tags_map[tid] = {"label": r.tag_name, "color": r.tag_color, "data": {}}
        tags_map[tid]["data"][p] = float(r.total)

    labels = [_format_period_label(p, granularity) for p in periods_seen]

    datasets = []
    for tid, info in tags_map.items():
        data = [round(info["data"].get(p, 0.0), 2) for p in periods_seen]
        datasets.append({
            "label": info["label"],
            "data": data,
            "borderColor": info["color"],
            "backgroundColor": info["color"],
        })

    return {"labels": labels, "datasets": datasets}


# ─── RANKING TAGS ─────────────────────────────────────────────────────────────

def ranking_tags(
    db: Session,
    date_from: date,
    date_to: date,
    type: str = "despesa",
    exclude_tags: List[int] = [],
    limit: Optional[int] = None,
) -> dict:
    t_type = TransacaoType(type)

    q = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == t_type, Transacao.tag_id.isnot(None))
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(Tag.name, Tag.color, func.sum(Transacao.value).label("total"))
        .group_by(Tag.id, Tag.name, Tag.color)
        .order_by(func.sum(Transacao.value).desc())
    )

    if limit is not None:
        q = q.limit(limit)

    rows = q.all()

    labels = [r.name for r in rows]
    data = [round(float(r.total), 2) for r in rows]
    colors = [r.color for r in rows]

    return {
        "labels": labels,
        "datasets": [{"data": data, "backgroundColor": colors}],
    }


# ─── VARIACAO TAGS ────────────────────────────────────────────────────────────

def variacao_tags(
    db: Session,
    date_from: date,
    date_to: date,
    type: str = "despesa",
    exclude_tags: List[int] = [],
) -> dict:
    t_type = TransacaoType(type)

    # Previous period: same-length window immediately preceding date_from
    import datetime as _dt
    duration_days = (date_to - date_from).days + 1  # inclusive day count of current period
    prev_date_to = date_from - _dt.timedelta(days=1)
    prev_date_from = prev_date_to - _dt.timedelta(days=duration_days - 1)
    # If date_from is the 1st of a month and date_to is the last of that month,
    # use the previous calendar month (more natural for financial comparisons)
    if date_from.day == 1 and date_to == date(date_to.year, date_to.month, monthrange(date_to.year, date_to.month)[1]):
        # previous calendar month
        prev_month = date_from.month - 1 or 12
        prev_year = date_from.year if date_from.month > 1 else date_from.year - 1
        prev_date_from = date(prev_year, prev_month, 1)
        prev_date_to = date(prev_year, prev_month, monthrange(prev_year, prev_month)[1])

    def _get_tag_totals(df: date, dt: date) -> dict:
        rows = (
            _base_query(db, df, dt, exclude_tags)
            .filter(Transacao.type == t_type, Transacao.tag_id.isnot(None))
            .join(Tag, Transacao.tag_id == Tag.id)
            .with_entities(Tag.name, Tag.color, func.sum(Transacao.value).label("total"))
            .group_by(Tag.id, Tag.name, Tag.color)
            .all()
        )
        return {r.name: {"total": float(r.total), "color": r.color} for r in rows}

    current = _get_tag_totals(date_from, date_to)
    previous = _get_tag_totals(prev_date_from, prev_date_to)

    all_tags = sorted(set(list(current.keys()) + list(previous.keys())))

    labels = []
    variations = []
    absolutos = {}

    for tag_name in all_tags:
        cur_val = current.get(tag_name, {}).get("total", 0.0)
        prev_val = previous.get(tag_name, {}).get("total", 0.0)
        if prev_val > 0:
            pct = ((cur_val - prev_val) / prev_val) * 100
        elif cur_val > 0:
            pct = 100.0
        else:
            pct = 0.0
        labels.append(tag_name)
        variations.append(round(pct, 2))
        absolutos[tag_name] = {"atual": cur_val, "anterior": prev_val}

    return {
        "labels": labels,
        "datasets": [{"label": "Variação %", "data": variations}],
        "meta": {"absolutos": absolutos},
    }


# ─── POR MÊS (bar+line chart) ─────────────────────────────────────────────────

def por_mes(
    db: Session,
    date_from: date,
    date_to: date,
    granularity: str = "month",
    exclude_tags: List[int] = [],
) -> dict:
    def _get_period_totals(t_type: TransacaoType):
        rows = (
            _base_query(db, date_from, date_to, exclude_tags)
            .filter(Transacao.type == t_type)
            .with_entities(
                func.date_trunc(granularity, Transacao.date).label("period"),
                func.sum(Transacao.value).label("total"),
            )
            .group_by("period")
            .order_by("period")
            .all()
        )
        return {r.period: float(r.total) for r in rows}

    receitas_map = _get_period_totals(TransacaoType.receita)
    despesas_map = _get_period_totals(TransacaoType.despesa)

    all_periods = sorted(set(list(receitas_map.keys()) + list(despesas_map.keys())))

    if not all_periods:
        return {
            "labels": [],
            "datasets": [
                {"label": "Receitas", "data": [], "type": "bar"},
                {"label": "Despesas", "data": [], "type": "bar"},
                {"label": "Saldo", "data": [], "type": "line"},
            ],
        }

    labels = [_format_period_label(p, granularity) for p in all_periods]
    receitas_data = [round(receitas_map.get(p, 0.0), 2) for p in all_periods]
    despesas_data = [round(despesas_map.get(p, 0.0), 2) for p in all_periods]
    saldo_data = [round(r - d, 2) for r, d in zip(receitas_data, despesas_data)]

    return {
        "labels": labels,
        "datasets": [
            {"label": "Receitas", "data": receitas_data, "type": "bar", "backgroundColor": "#22C55E"},
            {"label": "Despesas", "data": despesas_data, "type": "bar", "backgroundColor": "#EF4444"},
            {"label": "Saldo", "data": saldo_data, "type": "line", "borderColor": "#3B82F6"},
        ],
    }


# ─── POR CONTA ────────────────────────────────────────────────────────────────

def por_conta(
    db: Session,
    date_from: date,
    date_to: date,
    type: Optional[str] = None,
    exclude_tags: List[int] = [],
) -> dict:
    q = _base_query(db, date_from, date_to, exclude_tags)
    if type is not None:
        q = q.filter(Transacao.type == TransacaoType(type))

    rows = (
        q.join(Conta, Transacao.account_id == Conta.id)
        .with_entities(Conta.name, Conta.color, func.sum(Transacao.value).label("total"))
        .group_by(Conta.id, Conta.name, Conta.color)
        .order_by(func.sum(Transacao.value).desc())
        .all()
    )

    labels = [r.name for r in rows]
    data = [round(float(r.total), 2) for r in rows]
    colors = [r.color for r in rows]

    return {
        "labels": labels,
        "datasets": [{"data": data, "backgroundColor": colors}],
    }


# ─── INVESTIMENTOS / APORTE ───────────────────────────────────────────────────

def investimentos_aporte(
    db: Session,
    date_from: date,
    date_to: date,
    granularity: str = "month",
    exclude_tags: List[int] = [],
) -> dict:
    inv_rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == TransacaoType.investimento, Transacao.tag_id.isnot(None))
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(
            func.date_trunc(granularity, Transacao.date).label("period"),
            Tag.id.label("tag_id"),
            Tag.name.label("tag_name"),
            Tag.color.label("tag_color"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("period", Tag.id, Tag.name, Tag.color)
        .order_by("period")
        .all()
    )

    ret_rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == TransacaoType.retirada_investimento, Transacao.tag_id.isnot(None))
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(
            func.date_trunc(granularity, Transacao.date).label("period"),
            Tag.id.label("tag_id"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("period", Tag.id)
        .order_by("period")
        .all()
    )

    # Build a lookup for retiradas: {(tag_id, period): total}
    ret_map: dict = {}
    for r in ret_rows:
        ret_map[(r.tag_id, r.period)] = float(r.total)

    periods_seen: list = []
    period_set: set = set()
    tags_map: dict = {}

    for r in inv_rows:
        p = r.period
        if p not in period_set:
            period_set.add(p)
            periods_seen.append(p)
        tid = r.tag_id
        if tid not in tags_map:
            tags_map[tid] = {"label": r.tag_name, "color": r.tag_color, "data": {}}
        net = float(r.total) - ret_map.get((tid, p), 0.0)
        tags_map[tid]["data"][p] = net

    if not periods_seen:
        return {"labels": [], "datasets": []}

    labels = [_format_period_label(p, granularity) for p in periods_seen]
    datasets = []
    for tid, info in tags_map.items():
        data = [round(info["data"].get(p, 0.0), 2) for p in periods_seen]
        datasets.append({
            "label": info["label"],
            "data": data,
            "borderColor": info["color"],
            "backgroundColor": info["color"],
        })

    return {"labels": labels, "datasets": datasets}


# ─── INVESTIMENTOS / ACUMULADO ────────────────────────────────────────────────

def investimentos_acumulado(
    db: Session,
    date_from: date,
    date_to: date,
    granularity: str = "month",
    exclude_tags: List[int] = [],
) -> dict:
    # Get all investment transactions from the very beginning (not limited to date range for accumulation)
    # But we need to show only periods in range. We'll compute running totals.

    inv_rows = (
        db.query(Transacao)
        .filter(
            Transacao.active.is_(True),
            Transacao.type == TransacaoType.investimento,
            Transacao.date <= date_to,
        )
        .filter(~Transacao.tag_id.in_(exclude_tags) if exclude_tags else True)
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(
            func.date_trunc(granularity, Transacao.date).label("period"),
            Tag.id.label("tag_id"),
            Tag.name.label("tag_name"),
            Tag.color.label("tag_color"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("period", Tag.id, Tag.name, Tag.color)
        .order_by("period")
        .all()
    )

    ret_rows = (
        db.query(Transacao)
        .filter(
            Transacao.active.is_(True),
            Transacao.type == TransacaoType.retirada_investimento,
            Transacao.date <= date_to,
        )
        .filter(~Transacao.tag_id.in_(exclude_tags) if exclude_tags else True)
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(
            func.date_trunc(granularity, Transacao.date).label("period"),
            Tag.id.label("tag_id"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("period", Tag.id)
        .order_by("period")
        .all()
    )

    ret_map: dict = {}
    for r in ret_rows:
        ret_map[(r.tag_id, r.period)] = float(r.total)

    # Collect all periods from date_from to date_to
    all_periods_set: set = set()
    for r in inv_rows:
        all_periods_set.add(r.period)
    all_periods = sorted(all_periods_set)

    # Determine if period is before date_from
    def period_before_range(p) -> bool:
        try:
            pd = p.date() if hasattr(p, 'date') else p
            return pd < date_from
        except Exception:
            return False

    # For periods before range, accumulate into starting balance
    tags_map: dict = {}
    for r in inv_rows:
        tid = r.tag_id
        if tid not in tags_map:
            tags_map[tid] = {"label": r.tag_name, "color": r.tag_color, "period_net": {}, "pre_balance": 0.0}
        net = float(r.total) - ret_map.get((tid, r.period), 0.0)
        tags_map[tid]["period_net"][r.period] = net

    for tid, info in tags_map.items():
        pre = 0.0
        for p, net in sorted(info["period_net"].items()):
            if period_before_range(p):
                pre += net
        info["pre_balance"] = pre

    # Now get only in-range periods
    in_range_periods = sorted([p for p in all_periods if not period_before_range(p)])

    if not in_range_periods:
        return {"labels": [], "datasets": []}

    labels = [_format_period_label(p, granularity) for p in in_range_periods]
    datasets = []

    for tid, info in tags_map.items():
        running = info["pre_balance"]
        data = []
        for p in in_range_periods:
            running += info["period_net"].get(p, 0.0)
            data.append(round(running, 2))
        datasets.append({
            "label": info["label"],
            "data": data,
            "borderColor": info["color"],
            "backgroundColor": info["color"],
        })

    return {"labels": labels, "datasets": datasets}


# ─── HEATMAP ──────────────────────────────────────────────────────────────────

def heatmap(db: Session, date_from: date, date_to: date, exclude_tags: List[int] = []) -> dict:
    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa)
        .with_entities(Transacao.date, func.sum(Transacao.value).label("total"))
        .group_by(Transacao.date)
        .order_by(Transacao.date)
        .all()
    )

    dias = [{"date": str(r.date), "value": round(float(r.total), 2)} for r in rows]
    max_val = max((d["value"] for d in dias), default=0.0)

    return {"dias": dias, "max": max_val}


# ─── POR DIA SEMANA ───────────────────────────────────────────────────────────

def por_dia_semana(
    db: Session,
    date_from: date,
    date_to: date,
    exclude_tags: List[int] = [],
    agregacao: str = "media",
) -> dict:
    # isodow: 1=Mon ... 7=Sun; we want 0=Mon ... 6=Sun
    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa)
        .with_entities(
            extract("isodow", Transacao.date).label("dow"),
            Transacao.date.label("day"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("dow", Transacao.date)
        .order_by("dow")
        .all()
    )

    # Group by dow
    dow_data: dict = {i: [] for i in range(1, 8)}  # 1=Mon...7=Sun
    for r in rows:
        dow_key = int(r.dow)
        dow_data[dow_key].append(float(r.total))

    data = []
    for dow in range(1, 8):
        vals = dow_data[dow]
        if not vals:
            data.append(0.0)
        elif agregacao == "total":
            data.append(round(sum(vals), 2))
        else:  # media
            data.append(round(sum(vals) / len(vals), 2))

    return {
        "labels": DOW_LABELS,
        "datasets": [{"label": "Despesa", "data": data}],
    }


# ─── BURNDOWN ─────────────────────────────────────────────────────────────────

def burndown(db: Session, exclude_tags: List[int] = []) -> dict:
    today = date.today()
    first_of_month = date(today.year, today.month, 1)
    days_in_month = monthrange(today.year, today.month)[1]
    last_of_month = date(today.year, today.month, days_in_month)

    # Current month daily despesa
    rows = (
        _base_query(db, first_of_month, last_of_month, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa)
        .with_entities(Transacao.date, func.sum(Transacao.value).label("total"))
        .group_by(Transacao.date)
        .order_by(Transacao.date)
        .all()
    )

    day_totals = {r.date: float(r.total) for r in rows}

    # Build current accumulated (cumulative), future = None
    labels = []
    current_data = []
    running = 0.0
    for day_num in range(1, days_in_month + 1):
        d = date(today.year, today.month, day_num)
        labels.append(str(day_num))
        if d <= today:
            running += day_totals.get(d, 0.0)
            current_data.append(round(running, 2))
        else:
            current_data.append(None)

    # Historical average: avg monthly despesa per day across past months
    # Get all past months' daily data
    past_rows = (
        db.query(Transacao)
        .filter(
            Transacao.active.is_(True),
            Transacao.type == TransacaoType.despesa,
            Transacao.date < first_of_month,
        )
        .filter(~Transacao.tag_id.in_(exclude_tags) if exclude_tags else True)
        .with_entities(
            func.date_trunc("month", Transacao.date).label("month"),
            Transacao.date,
            func.sum(Transacao.value).label("total"),
        )
        .group_by("month", Transacao.date)
        .order_by(Transacao.date)
        .all()
    )

    # Group by day-of-month across all past months
    past_months: set = set()
    dom_totals: dict = {i: [] for i in range(1, 32)}

    for r in past_rows:
        past_months.add(r.month)
        dom = r.date.day
        dom_totals[dom].append(float(r.total))

    # Compute cumulative average per day of month
    avg_data = []
    running_avg_acc = 0.0
    for day_num in range(1, days_in_month + 1):
        vals = dom_totals.get(day_num, [])
        daily_avg = sum(vals) / len(vals) if vals else 0.0
        running_avg_acc += daily_avg
        avg_data.append(round(running_avg_acc, 2))

    return {
        "labels": labels,
        "datasets": [
            {"label": "Mês atual", "data": current_data, "type": "line"},
            {"label": "Média histórica", "data": avg_data, "type": "line"},
        ],
    }


# ─── POR DIA MES ──────────────────────────────────────────────────────────────

def por_dia_mes(db: Session, date_from: date, date_to: date, exclude_tags: List[int] = []) -> dict:
    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa)
        .with_entities(
            extract("day", Transacao.date).label("dom"),
            func.sum(Transacao.value).label("total"),
            func.count(func.distinct(Transacao.date)).label("cnt"),
        )
        .group_by("dom")
        .order_by("dom")
        .all()
    )

    dom_map = {int(r.dom): (float(r.total), int(r.cnt)) for r in rows}

    labels = [str(i) for i in range(1, 32)]
    data = []
    for dom in range(1, 32):
        if dom in dom_map:
            total, cnt = dom_map[dom]
            data.append(round(total / cnt, 2))
        else:
            data.append(0.0)

    return {
        "labels": labels,
        "datasets": [{"label": "Média por dia", "data": data}],
    }


# ─── POR METODO ───────────────────────────────────────────────────────────────

def por_metodo(db: Session, date_from: date, date_to: date, exclude_tags: List[int] = []) -> dict:
    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa, Transacao.payment_method.isnot(None))
        .with_entities(Transacao.payment_method, func.sum(Transacao.value).label("total"))
        .group_by(Transacao.payment_method)
        .all()
    )

    method_order = [PaymentMethod.pix, PaymentMethod.card, PaymentMethod.cash, PaymentMethod.transfer]
    method_map = {r.payment_method: float(r.total) for r in rows}

    labels = []
    data = []
    colors = []

    for pm in method_order:
        if pm in method_map:
            labels.append(PAYMENT_METHOD_LABELS[pm])
            data.append(round(method_map[pm], 2))
            colors.append(PAYMENT_METHOD_COLORS[pm])

    return {
        "labels": labels,
        "datasets": [{"data": data, "backgroundColor": colors}],
    }


# ─── PREVISAO / RUN RATE ──────────────────────────────────────────────────────

def previsao_run_rate(db: Session, exclude_tags: List[int] = []) -> dict:
    today = date.today()
    first_of_month = date(today.year, today.month, 1)
    days_in_month = monthrange(today.year, today.month)[1]

    gasto = _sum_type(db, TransacaoType.despesa, first_of_month, today, exclude_tags)
    dia_atual = today.day

    if dia_atual > 0:
        projecao = (gasto / dia_atual) * days_in_month
    else:
        projecao = 0.0

    return {
        "gasto_ate_agora": round(gasto, 2),
        "dia_atual": dia_atual,
        "dias_no_mes": days_in_month,
        "projecao_fim_mes": round(projecao, 2),
    }


# ─── PREVISAO / MEDIA MOVEL ───────────────────────────────────────────────────

def previsao_media_movel(
    db: Session,
    date_from: date,
    date_to: date,
    type: str = "despesa",
    exclude_tags: List[int] = [],
    window: int = 3,
) -> dict:
    t_type = TransacaoType(type)

    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == t_type, Transacao.tag_id.isnot(None))
        .join(Tag, Transacao.tag_id == Tag.id)
        .with_entities(
            func.date_trunc("month", Transacao.date).label("period"),
            Tag.id.label("tag_id"),
            Tag.name.label("tag_name"),
            Tag.color.label("tag_color"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("period", Tag.id, Tag.name, Tag.color)
        .order_by("period")
        .all()
    )

    periods_seen: list = []
    period_set: set = set()
    tags_map: dict = {}

    for r in rows:
        p = r.period
        if p not in period_set:
            period_set.add(p)
            periods_seen.append(p)
        tid = r.tag_id
        if tid not in tags_map:
            tags_map[tid] = {"label": r.tag_name, "color": r.tag_color, "raw": {}}
        tags_map[tid]["raw"][p] = float(r.total)

    if not periods_seen:
        return {"labels": [], "datasets": []}

    labels = [_format_period_label(p, "month") for p in periods_seen]
    datasets = []

    for tid, info in tags_map.items():
        raw = [info["raw"].get(p, 0.0) for p in periods_seen]
        # Compute rolling average
        smoothed = []
        for i in range(len(raw)):
            start = max(0, i - window + 1)
            window_vals = raw[start:i + 1]
            smoothed.append(round(sum(window_vals) / len(window_vals), 2))
        datasets.append({
            "label": info["label"],
            "data": smoothed,
            "borderColor": info["color"],
            "backgroundColor": info["color"],
        })

    return {"labels": labels, "datasets": datasets}


# ─── PREVISAO / TENDENCIA ─────────────────────────────────────────────────────

def previsao_tendencia(db: Session, date_from: date, date_to: date, exclude_tags: List[int] = []) -> dict:
    rows = (
        _base_query(db, date_from, date_to, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa)
        .with_entities(
            func.date_trunc("month", Transacao.date).label("period"),
            func.sum(Transacao.value).label("total"),
        )
        .group_by("period")
        .order_by("period")
        .all()
    )

    if not rows:
        return {
            "labels": [],
            "datasets": [],
            "projecao": {"inclinacao": 0.0, "proximo_mes": None, "dois_meses": None},
        }

    periods = [r.period for r in rows]
    values = [float(r.total) for r in rows]
    n = len(values)

    # Simple OLS linear regression: y = a + b*x (x=0,1,2,...)
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    ss_xx = sum((x - mean_x) ** 2 for x in xs)
    ss_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    b = ss_xy / ss_xx if ss_xx != 0 else 0.0
    a = mean_y - b * mean_x

    trend_data = [round(a + b * x, 2) for x in xs]

    # Labels for historical
    labels = [_format_period_label(p, "month") for p in periods]

    # Project 2 more months
    proj_labels = list(labels)
    proj_data = list(trend_data)

    last_period = periods[-1]
    for i in range(1, 3):
        next_x = n - 1 + i
        proj_val = round(a + b * next_x, 2)
        # Compute next month label
        new_month = last_period.month + i
        new_year = last_period.year + (new_month - 1) // 12
        new_month = ((new_month - 1) % 12) + 1
        proj_labels.append(f"{MONTH_LABELS_PT[new_month - 1]}/{str(new_year)[2:]}")
        proj_data.append(proj_val)

    proximo_mes = proj_data[n] if len(proj_data) > n else None
    dois_meses = proj_data[n + 1] if len(proj_data) > n + 1 else None

    return {
        "labels": proj_labels,
        "datasets": [
            {"label": "Despesa real", "data": [v if i < n else None for i, v in enumerate(proj_data)]},
            {"label": "Tendência", "data": proj_data},
        ],
        "projecao": {
            "inclinacao": round(b, 2),
            "proximo_mes": proximo_mes,
            "dois_meses": dois_meses,
        },
    }


# ─── PREVISAO / SAZONALIDADE ──────────────────────────────────────────────────

def previsao_sazonalidade(db: Session, date_from: date, date_to: date, exclude_tags: List[int] = []) -> dict:
    today = date.today()
    current_year = today.year
    previous_year = current_year - 1

    def _get_monthly(year: int) -> dict:
        y_from = date(year, 1, 1)
        y_to = date(year, 12, 31)
        rows = (
            _base_query(db, y_from, y_to, exclude_tags)
            .filter(Transacao.type == TransacaoType.despesa)
            .with_entities(
                extract("month", Transacao.date).label("month"),
                func.sum(Transacao.value).label("total"),
            )
            .group_by("month")
            .all()
        )
        return {int(r.month): float(r.total) for r in rows}

    current_map = _get_monthly(current_year)
    previous_map = _get_monthly(previous_year)

    labels = MONTH_LABELS_PT[:]
    current_data = [round(current_map.get(m, 0.0), 2) for m in range(1, 13)]
    previous_data = [round(previous_map.get(m, 0.0), 2) for m in range(1, 13)]

    return {
        "labels": labels,
        "datasets": [
            {"label": str(current_year), "data": current_data},
            {"label": str(previous_year), "data": previous_data},
        ],
    }


# ─── ORCAMENTO / REALIZADO ────────────────────────────────────────────────────

def orcamento_realizado(db: Session, year: int, month: int, exclude_tags: List[int] = []) -> dict:
    budgets = (
        db.query(Orcamento)
        .filter(
            Orcamento.active.is_(True),
            (Orcamento.start_year * 12 + Orcamento.start_month) <= (year * 12 + month),
        )
        .join(Tag, Orcamento.tag_id == Tag.id)
        .all()
    )

    if not budgets:
        return {"labels": [], "datasets": [{"label": "Orçado", "data": []}, {"label": "Realizado", "data": []}]}

    first_of_month = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    last_of_month = date(year, month, last_day)

    # Get actuals
    rows = (
        _base_query(db, first_of_month, last_of_month, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa, Transacao.tag_id.isnot(None))
        .with_entities(Transacao.tag_id, func.sum(Transacao.value).label("total"))
        .group_by(Transacao.tag_id)
        .all()
    )
    actuals = {r.tag_id: float(r.total) for r in rows}

    labels = []
    orcado = []
    realizado = []

    for b in budgets:
        tag_name = b.tag.name
        labels.append(tag_name)
        orcado.append(round(float(b.limit_value), 2))
        realizado.append(round(actuals.get(b.tag_id, 0.0), 2))

    return {
        "labels": labels,
        "datasets": [
            {"label": "Orçado", "data": orcado, "backgroundColor": "#3B82F6"},
            {"label": "Realizado", "data": realizado, "backgroundColor": "#EF4444"},
        ],
    }


# ─── ORCAMENTO / PROGRESSO ────────────────────────────────────────────────────

def orcamento_progresso(db: Session, year: int, month: int, exclude_tags: List[int] = []) -> dict:
    budgets = (
        db.query(Orcamento)
        .filter(
            Orcamento.active.is_(True),
            (Orcamento.start_year * 12 + Orcamento.start_month) <= (year * 12 + month),
        )
        .join(Tag, Orcamento.tag_id == Tag.id)
        .all()
    )

    if not budgets:
        return {"itens": []}

    first_of_month = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    last_of_month = date(year, month, last_day)

    rows = (
        _base_query(db, first_of_month, last_of_month, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa, Transacao.tag_id.isnot(None))
        .with_entities(Transacao.tag_id, func.sum(Transacao.value).label("total"))
        .group_by(Transacao.tag_id)
        .all()
    )
    actuals = {r.tag_id: float(r.total) for r in rows}

    itens = []
    for b in budgets:
        limit = float(b.limit_value)
        spent = actuals.get(b.tag_id, 0.0)
        pct = (spent / limit * 100) if limit > 0 else 0.0
        if pct >= 100:
            status = "estourado"
        elif pct >= 70:
            status = "atencao"
        else:
            status = "ok"

        itens.append({
            "tag": b.tag.name,
            "limit_value": round(limit, 2),
            "realizado": round(spent, 2),
            "percentual": round(pct, 2),
            "status": status,
        })

    return {"itens": itens}


# ─── ORCAMENTO / ALERTA ESTOURO ───────────────────────────────────────────────

def orcamento_alerta_estouro(db: Session, year: int, month: int, exclude_tags: List[int] = []) -> dict:
    today = date.today()
    budgets = (
        db.query(Orcamento)
        .filter(
            Orcamento.active.is_(True),
            (Orcamento.start_year * 12 + Orcamento.start_month) <= (year * 12 + month),
        )
        .join(Tag, Orcamento.tag_id == Tag.id)
        .all()
    )

    if not budgets:
        return {"alertas": []}

    first_of_month = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    last_of_month = date(year, month, last_day)

    rows = (
        _base_query(db, first_of_month, last_of_month, exclude_tags)
        .filter(Transacao.type == TransacaoType.despesa, Transacao.tag_id.isnot(None))
        .with_entities(Transacao.tag_id, func.sum(Transacao.value).label("total"))
        .group_by(Transacao.tag_id)
        .all()
    )
    actuals = {r.tag_id: float(r.total) for r in rows}

    # Current day in month (for projection)
    if year == today.year and month == today.month:
        dia_atual = today.day
    else:
        dia_atual = last_day

    if dia_atual == 0:
        dia_atual = 1

    alertas = []
    for b in budgets:
        limit = float(b.limit_value)
        spent = actuals.get(b.tag_id, 0.0)
        # Project: (spent / dia_atual) * last_day
        projecao = (spent / dia_atual) * last_day if dia_atual > 0 else spent

        if projecao > limit:
            alertas.append({
                "tag": b.tag.name,
                "limit_value": round(limit, 2),
                "realizado": round(spent, 2),
                "projecao_fim_mes": round(projecao, 2),
                "excesso_projetado": round(projecao - limit, 2),
            })

    return {"alertas": alertas}
