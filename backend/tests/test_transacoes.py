import io
import csv

import pytest


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_tag(client, name="Alimentação", type="despesa", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": type, "color": color})
    assert r.status_code == 201
    return r.json()


def make_conta(client, name="Nubank", type="banco", color="#820AD1"):
    r = client.post("/contas", json={"name": name, "type": type, "color": color})
    assert r.status_code == 201
    return r.json()


def make_transacao(client, account_id, type="despesa", value="100.00",
                   date="2026-05-10", tag_id=None, payment_method=None):
    body = {"type": type, "value": value, "date": date, "account_id": account_id}
    if tag_id is not None:
        body["tag_id"] = tag_id
    if payment_method is not None:
        body["payment_method"] = payment_method
    r = client.post("/transacoes", json=body)
    return r.json()


# ─── POST /transacoes — successful creations ───────────────────────────────────

def test_58_create_despesa_with_tag_and_payment_method(client):
    """58 - POST /transacoes: despesa with tag(despesa) + payment_method → 201"""
    conta = make_conta(client, name="C58")
    tag = make_tag(client, name="T58", type="despesa")
    body = {
        "type": "despesa",
        "value": "100.00",
        "date": "2026-05-10",
        "account_id": conta["id"],
        "tag_id": tag["id"],
        "payment_method": "pix",
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "despesa"
    assert data["tag_id"] == tag["id"]
    assert data["payment_method"] == "pix"
    assert data["active"] is True
    assert "id" in data


def test_59_create_receita_with_tag(client):
    """59 - POST /transacoes: receita with tag(receita) → 201"""
    conta = make_conta(client, name="C59")
    tag = make_tag(client, name="T59", type="receita")
    body = {
        "type": "receita",
        "value": "200.00",
        "date": "2026-05-10",
        "account_id": conta["id"],
        "tag_id": tag["id"],
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    assert r.json()["type"] == "receita"


def test_60_create_investimento_with_tag(client):
    """60 - POST /transacoes: investimento with tag(investimento) → 201"""
    conta = make_conta(client, name="C60")
    tag = make_tag(client, name="T60", type="investimento")
    body = {
        "type": "investimento",
        "value": "500.00",
        "date": "2026-05-10",
        "account_id": conta["id"],
        "tag_id": tag["id"],
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    assert r.json()["type"] == "investimento"


def test_61_create_retirada_investimento_with_tag_investimento(client):
    """61 - POST /transacoes: retirada_investimento with tag(investimento) → 201"""
    conta = make_conta(client, name="C61")
    tag = make_tag(client, name="T61", type="investimento")
    body = {
        "type": "retirada_investimento",
        "value": "300.00",
        "date": "2026-05-10",
        "account_id": conta["id"],
        "tag_id": tag["id"],
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    assert r.json()["type"] == "retirada_investimento"


def test_62_create_no_tag_id(client):
    """62 - POST /transacoes: no tag_id (nullable) → 201"""
    conta = make_conta(client, name="C62")
    body = {
        "type": "despesa",
        "value": "50.00",
        "date": "2026-05-10",
        "account_id": conta["id"],
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    assert r.json()["tag_id"] is None


def test_63_create_no_payment_method(client):
    """63 - POST /transacoes: no payment_method (nullable) → 201"""
    conta = make_conta(client, name="C63")
    body = {
        "type": "despesa",
        "value": "50.00",
        "date": "2026-05-10",
        "account_id": conta["id"],
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    assert r.json()["payment_method"] is None


def test_64_create_no_description(client):
    """64 - POST /transacoes: no description (nullable) → 201"""
    conta = make_conta(client, name="C64")
    body = {
        "type": "despesa",
        "value": "50.00",
        "date": "2026-05-10",
        "account_id": conta["id"],
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    assert r.json()["description"] is None


def test_65_create_value_decimal_preserved(client):
    """65 - POST /transacoes: value=1234.56 (2 decimal places preserved) → 201, value matches"""
    conta = make_conta(client, name="C65")
    body = {
        "type": "receita",
        "value": "1234.56",
        "date": "2026-05-10",
        "account_id": conta["id"],
    }
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201
    from decimal import Decimal
    assert Decimal(str(r.json()["value"])) == Decimal("1234.56")


# ─── POST /transacoes — missing fields ────────────────────────────────────────

def test_66_create_missing_type(client):
    """66 - POST /transacoes: no type → 422"""
    conta = make_conta(client, name="C66")
    r = client.post("/transacoes", json={"value": "100.00", "date": "2026-05-10", "account_id": conta["id"]})
    assert r.status_code == 422


def test_67_create_missing_value(client):
    """67 - POST /transacoes: no value → 422"""
    conta = make_conta(client, name="C67")
    r = client.post("/transacoes", json={"type": "despesa", "date": "2026-05-10", "account_id": conta["id"]})
    assert r.status_code == 422


def test_68_create_missing_date(client):
    """68 - POST /transacoes: no date → 422"""
    conta = make_conta(client, name="C68")
    r = client.post("/transacoes", json={"type": "despesa", "value": "100.00", "account_id": conta["id"]})
    assert r.status_code == 422


def test_69_create_missing_account_id(client):
    """69 - POST /transacoes: no account_id → 422"""
    r = client.post("/transacoes", json={"type": "despesa", "value": "100.00", "date": "2026-05-10"})
    assert r.status_code == 422


# ─── POST /transacoes — domain validation ─────────────────────────────────────

def test_70_create_invalid_type(client):
    """70 - POST /transacoes: invalid type="outra" → 422"""
    conta = make_conta(client, name="C70")
    r = client.post("/transacoes", json={"type": "outra", "value": "100.00", "date": "2026-05-10", "account_id": conta["id"]})
    assert r.status_code == 422


def test_71_create_invalid_payment_method(client):
    """71 - POST /transacoes: invalid payment_method="boleto" → 422"""
    conta = make_conta(client, name="C71")
    r = client.post("/transacoes", json={
        "type": "despesa", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"], "payment_method": "boleto"
    })
    assert r.status_code == 422


def test_72_create_negative_value(client):
    """72 - POST /transacoes: value=-100 → 422"""
    conta = make_conta(client, name="C72")
    r = client.post("/transacoes", json={"type": "despesa", "value": "-100", "date": "2026-05-10", "account_id": conta["id"]})
    assert r.status_code == 422


def test_73_create_zero_value(client):
    """73 - POST /transacoes: value=0 → 422"""
    conta = make_conta(client, name="C73")
    r = client.post("/transacoes", json={"type": "despesa", "value": "0", "date": "2026-05-10", "account_id": conta["id"]})
    assert r.status_code == 422


def test_74_create_bad_date_format(client):
    """74 - POST /transacoes: date="32/13/2026" (bad format) → 422"""
    conta = make_conta(client, name="C74")
    r = client.post("/transacoes", json={"type": "despesa", "value": "100.00", "date": "32/13/2026", "account_id": conta["id"]})
    assert r.status_code == 422


# ─── POST /transacoes — tag type incompatibility ──────────────────────────────

def test_75_create_despesa_with_receita_tag(client):
    """75 - POST /transacoes: despesa + tag(receita) → 422"""
    conta = make_conta(client, name="C75")
    tag = make_tag(client, name="T75", type="receita")
    r = client.post("/transacoes", json={
        "type": "despesa", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"], "tag_id": tag["id"]
    })
    assert r.status_code == 422


def test_76_create_despesa_with_investimento_tag(client):
    """76 - POST /transacoes: despesa + tag(investimento) → 422"""
    conta = make_conta(client, name="C76")
    tag = make_tag(client, name="T76", type="investimento")
    r = client.post("/transacoes", json={
        "type": "despesa", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"], "tag_id": tag["id"]
    })
    assert r.status_code == 422


def test_77_create_receita_with_despesa_tag(client):
    """77 - POST /transacoes: receita + tag(despesa) → 422"""
    conta = make_conta(client, name="C77")
    tag = make_tag(client, name="T77", type="despesa")
    r = client.post("/transacoes", json={
        "type": "receita", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"], "tag_id": tag["id"]
    })
    assert r.status_code == 422


def test_78_create_investimento_with_despesa_tag(client):
    """78 - POST /transacoes: investimento + tag(despesa) → 422"""
    conta = make_conta(client, name="C78")
    tag = make_tag(client, name="T78", type="despesa")
    r = client.post("/transacoes", json={
        "type": "investimento", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"], "tag_id": tag["id"]
    })
    assert r.status_code == 422


def test_79_create_retirada_with_receita_tag(client):
    """79 - POST /transacoes: retirada_investimento + tag(receita) → 422"""
    conta = make_conta(client, name="C79")
    tag = make_tag(client, name="T79", type="receita")
    r = client.post("/transacoes", json={
        "type": "retirada_investimento", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"], "tag_id": tag["id"]
    })
    assert r.status_code == 422


def test_80_create_nonexistent_tag_id(client):
    """80 - POST /transacoes: tag_id=99999 (nonexistent) → 422"""
    conta = make_conta(client, name="C80")
    r = client.post("/transacoes", json={
        "type": "despesa", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"], "tag_id": 99999
    })
    assert r.status_code == 422


# ─── POST /transacoes — account validation ────────────────────────────────────

def test_81_create_inactive_account(client):
    """81 - POST /transacoes: account with active=False → 422"""
    conta = make_conta(client, name="C81")
    client.delete(f"/contas/{conta['id']}")
    r = client.post("/transacoes", json={
        "type": "despesa", "value": "100.00", "date": "2026-05-10",
        "account_id": conta["id"]
    })
    assert r.status_code == 422


def test_82_create_nonexistent_account_id(client):
    """82 - POST /transacoes: account_id=99999 (nonexistent) → 422"""
    r = client.post("/transacoes", json={
        "type": "despesa", "value": "100.00", "date": "2026-05-10",
        "account_id": 99999
    })
    assert r.status_code == 422


# ─── GET /transacoes — listing ────────────────────────────────────────────────

def test_83_list_active_default(client):
    """83 - GET /transacoes: list active (default) → 200 + active only"""
    conta = make_conta(client, name="C83")
    t1 = make_transacao(client, conta["id"], value="10.00")
    t2 = make_transacao(client, conta["id"], value="20.00")
    # soft-delete t2
    client.delete(f"/transacoes/{t2['id']}")

    r = client.get("/transacoes")
    assert r.status_code == 200
    items = r.json()
    assert all(t["active"] is True for t in items)
    ids = [t["id"] for t in items]
    assert t1["id"] in ids
    assert t2["id"] not in ids


def test_84_list_filter_by_type(client):
    """84 - GET /transacoes: ?type=despesa → 200 + only despesas"""
    conta = make_conta(client, name="C84")
    make_transacao(client, conta["id"], type="despesa", value="10.00")
    make_transacao(client, conta["id"], type="receita", value="20.00")

    r = client.get("/transacoes?type=despesa")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert all(t["type"] == "despesa" for t in items)


def test_85_list_filter_by_tag_id(client):
    """85 - GET /transacoes: ?tag_id=N → 200 + only that tag"""
    conta = make_conta(client, name="C85")
    tag = make_tag(client, name="T85", type="despesa")
    make_transacao(client, conta["id"], type="despesa", tag_id=tag["id"])
    make_transacao(client, conta["id"], type="despesa")  # no tag

    r = client.get(f"/transacoes?tag_id={tag['id']}")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert all(t["tag_id"] == tag["id"] for t in items)


def test_86_list_filter_by_account_id(client):
    """86 - GET /transacoes: ?account_id=N → 200 + only that account"""
    conta1 = make_conta(client, name="C86a")
    conta2 = make_conta(client, name="C86b")
    make_transacao(client, conta1["id"], value="10.00")
    make_transacao(client, conta2["id"], value="20.00")

    r = client.get(f"/transacoes?account_id={conta1['id']}")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert all(t["account_id"] == conta1["id"] for t in items)


def test_87_list_filter_date_from(client):
    """87 - GET /transacoes: ?date_from=2026-06-01 → 200 + from that date"""
    conta = make_conta(client, name="C87")
    make_transacao(client, conta["id"], date="2026-05-01", value="10.00")
    make_transacao(client, conta["id"], date="2026-06-15", value="20.00")

    r = client.get("/transacoes?date_from=2026-06-01")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert all(t["date"] >= "2026-06-01" for t in items)


def test_88_list_filter_date_to(client):
    """88 - GET /transacoes: ?date_to=2026-05-31 → 200 + up to that date"""
    conta = make_conta(client, name="C88")
    make_transacao(client, conta["id"], date="2026-05-01", value="10.00")
    make_transacao(client, conta["id"], date="2026-06-15", value="20.00")

    r = client.get("/transacoes?date_to=2026-05-31")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert all(t["date"] <= "2026-05-31" for t in items)


def test_89_list_filter_date_range(client):
    """89 - GET /transacoes: ?date_from=...&date_to=... → 200 + interval"""
    conta = make_conta(client, name="C89")
    make_transacao(client, conta["id"], date="2026-01-15", value="10.00")
    make_transacao(client, conta["id"], date="2026-06-15", value="20.00")
    make_transacao(client, conta["id"], date="2026-12-15", value="30.00")

    r = client.get("/transacoes?date_from=2026-06-01&date_to=2026-06-30")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    for t in items:
        assert "2026-06-01" <= t["date"] <= "2026-06-30"


def test_90_list_filter_active_false(client):
    """90 - GET /transacoes: ?active=false → 200 + only inactive"""
    conta = make_conta(client, name="C90")
    t = make_transacao(client, conta["id"], value="10.00")
    client.delete(f"/transacoes/{t['id']}")

    r = client.get("/transacoes?active=false")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert all(t["active"] is False for t in items)


def test_91_list_filter_combined(client):
    """91 - GET /transacoes: ?type=despesa&date_from=...&tag_id=N → 200 + intersection"""
    conta = make_conta(client, name="C91")
    tag = make_tag(client, name="T91", type="despesa")
    # matches all filters
    make_transacao(client, conta["id"], type="despesa", date="2026-06-10", tag_id=tag["id"])
    # wrong type
    make_transacao(client, conta["id"], type="receita", date="2026-06-10")
    # wrong date
    make_transacao(client, conta["id"], type="despesa", date="2026-01-10", tag_id=tag["id"])

    r = client.get(f"/transacoes?type=despesa&date_from=2026-06-01&tag_id={tag['id']}")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    for t in items:
        assert t["type"] == "despesa"
        assert t["date"] >= "2026-06-01"
        assert t["tag_id"] == tag["id"]


def test_92_list_empty_db(client):
    """92 - GET /transacoes: empty DB → 200 + []"""
    r = client.get("/transacoes")
    assert r.status_code == 200
    assert r.json() == []


# ─── GET /transacoes/{id} ─────────────────────────────────────────────────────

def test_93_get_active_valid_id(client):
    """93 - GET /transacoes/{id}: active, valid id → 200 + full body"""
    conta = make_conta(client, name="C93")
    t = make_transacao(client, conta["id"], value="123.45")

    r = client.get(f"/transacoes/{t['id']}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == t["id"]
    assert data["active"] is True
    assert "created_at" in data
    assert "updated_at" in data
    assert data["account_id"] == conta["id"]


def test_94_get_not_found(client):
    """94 - GET /transacoes/{id}: id=99999 → 404"""
    r = client.get("/transacoes/99999")
    assert r.status_code == 404


def test_95_get_inactive(client):
    """95 - GET /transacoes/{id}: inactive id → 404"""
    conta = make_conta(client, name="C95")
    t = make_transacao(client, conta["id"])
    client.delete(f"/transacoes/{t['id']}")

    r = client.get(f"/transacoes/{t['id']}")
    assert r.status_code == 404


# ─── PUT /transacoes/{id} ─────────────────────────────────────────────────────

def test_96_update_value(client):
    """96 - PUT /transacoes/{id}: update value → 200"""
    conta = make_conta(client, name="C96")
    t = make_transacao(client, conta["id"], value="100.00")

    r = client.put(f"/transacoes/{t['id']}", json={"value": "200.00"})
    assert r.status_code == 200
    from decimal import Decimal
    assert Decimal(str(r.json()["value"])) == Decimal("200.00")


def test_97_update_description(client):
    """97 - PUT /transacoes/{id}: update description → 200"""
    conta = make_conta(client, name="C97")
    t = make_transacao(client, conta["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"description": "Nova descrição"})
    assert r.status_code == 200
    assert r.json()["description"] == "Nova descrição"


def test_98_update_date(client):
    """98 - PUT /transacoes/{id}: update date → 200"""
    conta = make_conta(client, name="C98")
    t = make_transacao(client, conta["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"date": "2026-12-01"})
    assert r.status_code == 200
    assert r.json()["date"] == "2026-12-01"


def test_99_update_tag_id_compatible(client):
    """99 - PUT /transacoes/{id}: update tag_id to compatible tag → 200"""
    conta = make_conta(client, name="C99")
    tag1 = make_tag(client, name="T99a", type="despesa")
    tag2 = make_tag(client, name="T99b", type="despesa")
    t = make_transacao(client, conta["id"], type="despesa", tag_id=tag1["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"tag_id": tag2["id"]})
    assert r.status_code == 200
    assert r.json()["tag_id"] == tag2["id"]


def test_100_update_tag_id_incompatible(client):
    """100 - PUT /transacoes/{id}: update tag_id to incompatible tag → 422"""
    conta = make_conta(client, name="C100")
    tag_d = make_tag(client, name="T100d", type="despesa")
    tag_r = make_tag(client, name="T100r", type="receita")
    t = make_transacao(client, conta["id"], type="despesa", tag_id=tag_d["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"tag_id": tag_r["id"]})
    assert r.status_code == 422


def test_101_update_set_tag_id_null(client):
    """101 - PUT /transacoes/{id}: set tag_id=null → 200"""
    conta = make_conta(client, name="C101")
    tag = make_tag(client, name="T101", type="despesa")
    t = make_transacao(client, conta["id"], type="despesa", tag_id=tag["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"tag_id": None})
    assert r.status_code == 200
    assert r.json()["tag_id"] is None


def test_102_update_payment_method(client):
    """102 - PUT /transacoes/{id}: update payment_method → 200"""
    conta = make_conta(client, name="C102")
    t = make_transacao(client, conta["id"], payment_method="pix")

    r = client.put(f"/transacoes/{t['id']}", json={"payment_method": "card"})
    assert r.status_code == 200
    assert r.json()["payment_method"] == "card"


def test_103_update_set_payment_method_null(client):
    """103 - PUT /transacoes/{id}: set payment_method=null → 200"""
    conta = make_conta(client, name="C103")
    t = make_transacao(client, conta["id"], payment_method="pix")

    r = client.put(f"/transacoes/{t['id']}", json={"payment_method": None})
    assert r.status_code == 200
    assert r.json()["payment_method"] is None


def test_104_update_account_id_active(client):
    """104 - PUT /transacoes/{id}: update account_id to active conta → 200"""
    conta1 = make_conta(client, name="C104a")
    conta2 = make_conta(client, name="C104b")
    t = make_transacao(client, conta1["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"account_id": conta2["id"]})
    assert r.status_code == 200
    assert r.json()["account_id"] == conta2["id"]


def test_105_update_account_id_inactive(client):
    """105 - PUT /transacoes/{id}: update account_id to inactive conta → 422"""
    conta1 = make_conta(client, name="C105a")
    conta2 = make_conta(client, name="C105b")
    client.delete(f"/contas/{conta2['id']}")
    t = make_transacao(client, conta1["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"account_id": conta2["id"]})
    assert r.status_code == 422


def test_106_update_not_found(client):
    """106 - PUT /transacoes/{id}: id=99999 → 404"""
    r = client.put("/transacoes/99999", json={"value": "200.00"})
    assert r.status_code == 404


def test_107_update_empty_body(client):
    """107 - PUT /transacoes/{id}: {} (empty body) → 200 + unchanged"""
    conta = make_conta(client, name="C107")
    t = make_transacao(client, conta["id"], value="150.00", date="2026-05-10")

    r = client.put(f"/transacoes/{t['id']}", json={})
    assert r.status_code == 200
    data = r.json()
    from decimal import Decimal
    assert Decimal(str(data["value"])) == Decimal("150.00")
    assert data["date"] == "2026-05-10"


def test_108_update_negative_value(client):
    """108 - PUT /transacoes/{id}: value=-50 → 422"""
    conta = make_conta(client, name="C108")
    t = make_transacao(client, conta["id"])

    r = client.put(f"/transacoes/{t['id']}", json={"value": "-50"})
    assert r.status_code == 422


# ─── DELETE /transacoes/{id} ──────────────────────────────────────────────────

def test_109_delete_soft_delete(client, db):
    """109 - DELETE /transacoes/{id}: soft delete → 204 + active=False"""
    from app.models import Transacao
    conta = make_conta(client, name="C109")
    t = make_transacao(client, conta["id"])

    r = client.delete(f"/transacoes/{t['id']}")
    assert r.status_code == 204
    record = db.get(Transacao, t["id"])
    assert record is not None
    assert record.active is False


def test_110_delete_not_found(client):
    """110 - DELETE /transacoes/{id}: id=99999 → 404"""
    r = client.delete("/transacoes/99999")
    assert r.status_code == 404


def test_111_delete_already_inactive(client):
    """111 - DELETE /transacoes/{id}: already inactive → 404"""
    conta = make_conta(client, name="C111")
    t = make_transacao(client, conta["id"])
    client.delete(f"/transacoes/{t['id']}")

    r = client.delete(f"/transacoes/{t['id']}")
    assert r.status_code == 404


# ─── GET /transacoes/export/csv ───────────────────────────────────────────────

def test_112_export_csv_all_active(client):
    """112 - GET /transacoes/export/csv: export all active → 200, Content-Type text/csv"""
    conta = make_conta(client, name="C112")
    make_transacao(client, conta["id"], value="50.00")

    r = client.get("/transacoes/export/csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]


def test_113_export_csv_date_filter(client):
    """113 - GET /transacoes/export/csv: ?date_from=...&date_to=... filter → 200, CSV with only interval"""
    conta = make_conta(client, name="C113")
    make_transacao(client, conta["id"], date="2026-01-15", value="10.00")
    make_transacao(client, conta["id"], date="2026-06-15", value="20.00")
    make_transacao(client, conta["id"], date="2026-12-15", value="30.00")

    r = client.get("/transacoes/export/csv?date_from=2026-06-01&date_to=2026-06-30")
    assert r.status_code == 200
    content = r.text
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    assert len(rows) >= 1
    for row in rows:
        assert "2026-06-01" <= row["date"] <= "2026-06-30"


def test_114_export_csv_type_filter(client):
    """114 - GET /transacoes/export/csv: ?type=despesa → 200, only despesas"""
    conta = make_conta(client, name="C114")
    make_transacao(client, conta["id"], type="despesa", value="10.00")
    make_transacao(client, conta["id"], type="receita", value="20.00")

    r = client.get("/transacoes/export/csv?type=despesa")
    assert r.status_code == 200
    content = r.text
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    assert len(rows) >= 1
    assert all(row["type"] == "despesa" for row in rows)


def test_115_export_csv_no_results(client):
    """115 - GET /transacoes/export/csv: no results → 200, CSV with only header row"""
    r = client.get("/transacoes/export/csv")
    assert r.status_code == 200
    content = r.text
    lines = [line for line in content.strip().splitlines() if line]
    assert len(lines) == 1  # only header


def test_116_export_csv_correct_columns(client):
    """116 - GET /transacoes/export/csv: correct columns"""
    r = client.get("/transacoes/export/csv")
    assert r.status_code == 200
    content = r.text
    reader = csv.reader(io.StringIO(content))
    header = next(reader)
    expected = ["id", "type", "value", "date", "description", "account_id", "tag_id", "payment_method"]
    assert header == expected


# ─── POST /transacoes/import/csv ──────────────────────────────────────────────

def _make_csv_bytes(rows: list[dict], fieldnames=None) -> bytes:
    """Build a CSV file as bytes from a list of dicts."""
    if fieldnames is None:
        fieldnames = ["type", "value", "date", "description", "account_id", "tag_id", "payment_method"]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buf.getvalue().encode("utf-8")


def test_117_import_csv_valid(client):
    """117 - POST /transacoes/import/csv: valid CSV → 201 + {"importadas": N, "erros": 0}"""
    conta = make_conta(client, name="C117")
    data = _make_csv_bytes([
        {"type": "despesa", "value": "100.00", "date": "2026-05-10",
         "description": "test", "account_id": conta["id"], "tag_id": "", "payment_method": "pix"},
        {"type": "receita", "value": "200.00", "date": "2026-05-11",
         "description": "", "account_id": conta["id"], "tag_id": "", "payment_method": ""},
    ])
    r = client.post(
        "/transacoes/import/csv",
        files={"file": ("import.csv", data, "text/csv")},
    )
    assert r.status_code == 201
    result = r.json()
    assert result["importadas"] == 2
    assert result["erros"] == 0


def test_118_import_csv_bad_header(client):
    """118 - POST /transacoes/import/csv: CSV with bad header → 422"""
    data = b"wrong,columns,here\nval1,val2,val3\n"
    r = client.post(
        "/transacoes/import/csv",
        files={"file": ("import.csv", data, "text/csv")},
    )
    assert r.status_code == 422


def test_119_import_csv_invalid_type_line_skipped(client):
    """119 - POST /transacoes/import/csv: line with invalid type → skipped, counted in erros"""
    conta = make_conta(client, name="C119")
    data = _make_csv_bytes([
        {"type": "despesa", "value": "100.00", "date": "2026-05-10",
         "description": "", "account_id": conta["id"], "tag_id": "", "payment_method": ""},
        {"type": "invalido", "value": "50.00", "date": "2026-05-10",
         "description": "", "account_id": conta["id"], "tag_id": "", "payment_method": ""},
    ])
    r = client.post(
        "/transacoes/import/csv",
        files={"file": ("import.csv", data, "text/csv")},
    )
    assert r.status_code == 201
    result = r.json()
    assert result["importadas"] == 1
    assert result["erros"] == 1


def test_120_import_csv_nonexistent_account_skipped(client):
    """120 - POST /transacoes/import/csv: line with nonexistent account → skipped, counted"""
    conta = make_conta(client, name="C120")
    data = _make_csv_bytes([
        {"type": "despesa", "value": "100.00", "date": "2026-05-10",
         "description": "", "account_id": conta["id"], "tag_id": "", "payment_method": ""},
        {"type": "despesa", "value": "50.00", "date": "2026-05-10",
         "description": "", "account_id": "99999", "tag_id": "", "payment_method": ""},
    ])
    r = client.post(
        "/transacoes/import/csv",
        files={"file": ("import.csv", data, "text/csv")},
    )
    assert r.status_code == 201
    result = r.json()
    assert result["importadas"] == 1
    assert result["erros"] == 1


def test_121_import_csv_incompatible_tag_skipped(client):
    """121 - POST /transacoes/import/csv: line with incompatible tag → skipped, counted"""
    conta = make_conta(client, name="C121")
    tag = make_tag(client, name="T121", type="receita")
    data = _make_csv_bytes([
        {"type": "despesa", "value": "100.00", "date": "2026-05-10",
         "description": "", "account_id": conta["id"], "tag_id": "", "payment_method": ""},
        # despesa with receita tag → incompatible
        {"type": "despesa", "value": "50.00", "date": "2026-05-10",
         "description": "", "account_id": conta["id"], "tag_id": tag["id"], "payment_method": ""},
    ])
    r = client.post(
        "/transacoes/import/csv",
        files={"file": ("import.csv", data, "text/csv")},
    )
    assert r.status_code == 201
    result = r.json()
    assert result["importadas"] == 1
    assert result["erros"] == 1


def test_122_import_csv_only_header(client):
    """122 - POST /transacoes/import/csv: CSV with only header → 201 + {"importadas": 0, "erros": 0}"""
    data = b"type,value,date,description,account_id,tag_id,payment_method\n"
    r = client.post(
        "/transacoes/import/csv",
        files={"file": ("import.csv", data, "text/csv")},
    )
    assert r.status_code == 201
    result = r.json()
    assert result["importadas"] == 0
    assert result["erros"] == 0


def test_123_import_non_csv_file(client):
    """123 - POST /transacoes/import/csv: non-CSV file → 422"""
    data = b"This is not a CSV file at all, just plain text."
    r = client.post(
        "/transacoes/import/csv",
        files={"file": ("import.txt", data, "text/plain")},
    )
    assert r.status_code == 422
