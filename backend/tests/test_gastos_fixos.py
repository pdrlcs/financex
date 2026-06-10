def make_tag_despesa(client, name="Moradia", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": "despesa", "color": color})
    assert r.status_code == 201
    return r.json()


def make_tag_receita(client, name="Salário", color="#00FF00"):
    r = client.post("/tags", json={"name": name, "type": "receita", "color": color})
    assert r.status_code == 201
    return r.json()


def make_conta(client, name="Nubank", color="#820AD1"):
    r = client.post("/contas", json={"name": name, "type": "banco", "color": color})
    assert r.status_code == 201
    return r.json()


def make_gasto_fixo(client, tag_id, **over):
    body = {
        "name": "Aluguel",
        "tag_id": tag_id,
        "expected_value": "1500.00",
        "start_year": 2026,
        "start_month": 6,
    }
    body.update(over)
    return client.post("/gastos-fixos/", json=body)


def test_create_gasto_fixo_success(client):
    tag = make_tag_despesa(client)
    res = make_gasto_fixo(client, tag["id"])
    assert res.status_code == 201
    data = res.json()
    assert data["active"] is True
    assert data["name"] == "Aluguel"
    assert data["tag_id"] == tag["id"]
    assert float(data["expected_value"]) == 1500.00
    assert data["start_month"] == 6


def test_create_rejects_non_despesa_tag(client):
    tag = make_tag_receita(client)
    res = make_gasto_fixo(client, tag["id"])
    assert res.status_code == 422


def test_create_rejects_invalid_account(client):
    tag = make_tag_despesa(client)
    res = make_gasto_fixo(client, tag["id"], default_account_id=9999)
    assert res.status_code == 422


def test_list_only_active(client):
    tag = make_tag_despesa(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    client.delete(f"/gastos-fixos/{gf['id']}")
    res = client.get("/gastos-fixos/")
    assert res.status_code == 200
    assert all(g["id"] != gf["id"] for g in res.json())


def test_update_and_delete(client):
    tag = make_tag_despesa(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    r = client.put(f"/gastos-fixos/{gf['id']}", json={"expected_value": "1600.00"})
    assert r.status_code == 200
    assert float(r.json()["expected_value"]) == 1600.00
    r = client.delete(f"/gastos-fixos/{gf['id']}")
    assert r.status_code == 204
    assert client.get(f"/gastos-fixos/{gf['id']}").status_code == 404


# ─── Status mensal + marcar pago + desmarcar ───────────────────────────────────

def _pagar(client, gid, year, month, value="1500.00", account_id=None, method="pix"):
    body = {"value": value, "date": f"{year}-{month:02d}-10", "payment_method": method}
    if account_id is not None:
        body["account_id"] = account_id
    return client.post(f"/gastos-fixos/{gid}/marcar-pago?year={year}&month={month}", json=body)


def test_status_pendente_depois_pago(client):
    tag = make_tag_despesa(client)
    conta = make_conta(client)
    gf = make_gasto_fixo(client, tag["id"], start_year=2026, start_month=6).json()

    r = client.get("/gastos-fixos/status?year=2026&month=6")
    assert r.status_code == 200
    item = next(i for i in r.json() if i["gasto_fixo"]["id"] == gf["id"])
    assert item["pago"] is False
    assert item["transacao"] is None

    pr = _pagar(client, gf["id"], 2026, 6, account_id=conta["id"])
    assert pr.status_code == 201
    tx = pr.json()
    assert tx["type"] == "despesa"
    assert tx["tag_id"] == tag["id"]
    assert tx["gasto_fixo_id"] == gf["id"]

    r = client.get("/gastos-fixos/status?year=2026&month=6")
    item = next(i for i in r.json() if i["gasto_fixo"]["id"] == gf["id"])
    assert item["pago"] is True
    assert item["transacao"]["id"] == tx["id"]


def test_status_respeita_mes_de_inicio(client):
    tag = make_tag_despesa(client)
    make_gasto_fixo(client, tag["id"], start_year=2026, start_month=6)
    # Mês anterior ao início → não aparece
    r = client.get("/gastos-fixos/status?year=2026&month=5")
    assert all(i["gasto_fixo"]["name"] != "Aluguel" for i in r.json())


def test_marcar_pago_duplicado_falha(client):
    tag = make_tag_despesa(client)
    conta = make_conta(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    assert _pagar(client, gf["id"], 2026, 6, account_id=conta["id"]).status_code == 201
    assert _pagar(client, gf["id"], 2026, 6, account_id=conta["id"]).status_code == 422


def test_desmarcar_pagamento(client):
    tag = make_tag_despesa(client)
    conta = make_conta(client)
    gf = make_gasto_fixo(client, tag["id"]).json()
    tx = _pagar(client, gf["id"], 2026, 6, account_id=conta["id"]).json()

    r = client.delete(f"/gastos-fixos/{gf['id']}/pagamento?year=2026&month=6")
    assert r.status_code == 204

    item = next(
        i for i in client.get("/gastos-fixos/status?year=2026&month=6").json()
        if i["gasto_fixo"]["id"] == gf["id"]
    )
    assert item["pago"] is False
    # transação ficou inativa, não apagada
    assert client.get(f"/transacoes/{tx['id']}").status_code == 404
    assert client.get("/transacoes/?active=false").status_code == 200
