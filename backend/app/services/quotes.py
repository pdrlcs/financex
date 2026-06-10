"""Cotações externas (BTC, CDI) com cache em memória e degradação graciosa.

Nunca lança para o caller: em erro/timeout devolve {"available": False}.
Os routers chamam `quotes.get_btc_brl()` (importando o módulo) para que os
testes possam monkeypatchar a função.
"""
import time
from typing import Optional

import httpx

_BTC_URL = "https://economia.awesomeapi.com.br/last/BTC-BRL"
_BTC_TTL = 60  # segundos
_btc_cache: Optional[dict] = None
_btc_at: float = 0.0


def get_btc_brl() -> dict:
    global _btc_cache, _btc_at
    now = time.time()
    if _btc_cache is not None and (now - _btc_at) < _BTC_TTL:
        return _btc_cache
    try:
        resp = httpx.get(_BTC_URL, timeout=5.0)
        resp.raise_for_status()
        node = resp.json()["BTCBRL"]
        data = {
            "available": True,
            "price": float(node["bid"]),
            "change_pct": float(node.get("pctChange", 0.0)),
            "updated_at": node.get("create_date"),
            "source": "awesomeapi",
        }
        _btc_cache = data
        _btc_at = now
        return data
    except Exception:
        if _btc_cache is not None:
            return _btc_cache
        return {"available": False, "source": "awesomeapi"}
