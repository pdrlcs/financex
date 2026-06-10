import pytest

from app.services import quotes


@pytest.fixture()
def fake_cdi(monkeypatch):
    monkeypatch.setattr(
        quotes, "get_cdi_anual",
        lambda: {"available": True, "annual_rate": 10.0, "date": "08/06/2026",
                 "source": "fake"},
    )


def _conta_cdi(client, percent="100.00"):
    return client.post("/contas", json={
        "name": "CDB", "type": "investimento", "color": "#10B981",
        "indexador": "cdi", "indexador_percent": percent,
    }).json()


def _tag_inv(client):
    return client.post("/tags", json={
        "name": "Renda Fixa", "type": "investimento", "color": "#10B981",
    }).json()


def _aporte(client, conta, tag, value, date):
    return client.post("/transacoes/", json={
        "type": "investimento", "value": value, "date": date,
        "account_id": conta["id"], "tag_id": tag["id"],
    })


def test_mercado_cdi(client, fake_cdi):
    r = client.get("/mercado/cdi")
    assert r.status_code == 200
    assert r.json()["annual_rate"] == 10.0


def test_cdi_resumo_compounds(client, fake_cdi):
    conta = _conta_cdi(client, percent="100.00")
    tag = _tag_inv(client)
    # aporte de 1000 há exatamente 1 ano → ~10% (cdi 10% * 100%)
    _aporte(client, conta, tag, "1000.00", "2025-06-09")

    body = client.get("/investimentos/cdi/resumo").json()
    assert body["available"] is True
    item = next(i for i in body["contas"] if i["conta_id"] == conta["id"])
    assert round(item["principal"], 2) == 1000.0
    # montante ~ 1000 * 1.10^(365/365) = 1100 (tolerância p/ dias corridos)
    assert 1090 < item["valor_atual"] < 1110
    assert item["rendimento"] > 80


def test_cdi_resumo_sem_contas(client, fake_cdi):
    body = client.get("/investimentos/cdi/resumo").json()
    assert body["contas"] == []
