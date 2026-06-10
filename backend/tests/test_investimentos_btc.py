import pytest

from app.services import quotes


@pytest.fixture()
def fake_btc(monkeypatch):
    monkeypatch.setattr(
        quotes, "get_btc_brl",
        lambda: {"available": True, "price": 320000.0, "change_pct": 1.5,
                 "updated_at": "2026-06-09 16:00:00", "source": "fake"},
    )


def _conta(client):
    r = client.post("/contas", json={"name": "Cripto", "type": "investimento", "color": "#F7931A"})
    return r.json()


def _tag(client):
    r = client.post("/tags", json={"name": "Bitcoin", "type": "investimento", "color": "#F7931A"})
    return r.json()


def _compra(client, conta, tag, value, qty, date="2026-06-01"):
    return client.post("/transacoes/", json={
        "type": "compra_cripto", "value": value, "date": date,
        "account_id": conta["id"], "tag_id": tag["id"], "quantity": qty,
    })


def _venda(client, conta, tag, value, qty, date="2026-06-05"):
    return client.post("/transacoes/", json={
        "type": "venda_cripto", "value": value, "date": date,
        "account_id": conta["id"], "tag_id": tag["id"], "quantity": qty,
    })


def test_mercado_btc(client, fake_btc):
    r = client.get("/mercado/btc")
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is True
    assert body["price"] == 320000.0


def test_btc_resumo_sem_transacoes(client, fake_btc):
    r = client.get("/investimentos/btc/resumo")
    assert r.status_code == 200
    body = r.json()
    assert body["quantidade_btc"] == 0
    assert body["valor_atual"] == 0


def test_btc_resumo_compra_e_venda(client, fake_btc):
    conta = _conta(client)
    tag = _tag(client)
    # compra 0.01 BTC por 3000 → custo médio 300000/BTC
    _compra(client, conta, tag, "3000.00", "0.01000000")
    # vende 0.004 BTC por 1400
    _venda(client, conta, tag, "1400.00", "0.00400000")

    body = client.get("/investimentos/btc/resumo").json()
    assert round(body["quantidade_btc"], 8) == 0.006
    assert round(body["custo_medio"], 2) == 300000.0
    # valor_atual = 0.006 * 320000 = 1920
    assert round(body["valor_atual"], 2) == 1920.0
    # lucro = valor_atual - (0.006 * 300000=1800) = 120
    assert round(body["lucro_prejuizo"], 2) == 120.0


def test_btc_resumo_preco_indisponivel(client, monkeypatch):
    monkeypatch.setattr(quotes, "get_btc_brl", lambda: {"available": False, "source": "fake"})
    conta = _conta(client)
    tag = _tag(client)
    _compra(client, conta, tag, "3000.00", "0.01000000")
    body = client.get("/investimentos/btc/resumo").json()
    assert body["available"] is False
    assert round(body["quantidade_btc"], 8) == 0.01
    assert body["valor_atual"] is None
