import pytest


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_tag_despesa(client, name="Alimentação", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": "despesa", "color": color})
    assert r.status_code == 201
    return r.json()


def make_tag_receita(client, name="Salário", color="#00FF00"):
    r = client.post("/tags", json={"name": name, "type": "receita", "color": color})
    assert r.status_code == 201
    return r.json()


def make_tag_investimento(client, name="Fundos", color="#0000FF"):
    r = client.post("/tags", json={"name": name, "type": "investimento", "color": color})
    assert r.status_code == 201
    return r.json()


def make_orcamento(client, tag_id, year=2026, month=5, limit_value="1000.00"):
    r = client.post("/orcamentos", json={
        "tag_id": tag_id, "year": year, "month": month, "limit_value": str(limit_value)
    })
    return r


# ─── POST /orcamentos ─────────────────────────────────────────────────────────

def test_create_orcamento_success(client):
    """124 - POST /orcamentos success: valid despesa tag → 201 + body"""
    tag = make_tag_despesa(client)
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["active"] is True
    assert data["tag_id"] == tag["id"]
    assert data["year"] == 2026
    assert data["month"] == 5
    assert float(data["limit_value"]) == 1000.00


def test_create_orcamento_missing_tag_id(client):
    """125 - POST /orcamentos missing tag_id → 422"""
    res = client.post("/orcamentos", json={"year": 2026, "month": 5, "limit_value": "1000.00"})
    assert res.status_code == 422


def test_create_orcamento_missing_year(client):
    """126 - POST /orcamentos missing year → 422"""
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "month": 5, "limit_value": "1000.00"})
    assert res.status_code == 422


def test_create_orcamento_missing_month(client):
    """127 - POST /orcamentos missing month → 422"""
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "year": 2026, "limit_value": "1000.00"})
    assert res.status_code == 422


def test_create_orcamento_missing_limit_value(client):
    """128 - POST /orcamentos missing limit_value → 422"""
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "year": 2026, "month": 5})
    assert res.status_code == 422


def test_create_orcamento_tag_type_receita(client):
    """129 - POST /orcamentos tag type=receita → 422"""
    tag = make_tag_receita(client)
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 422


def test_create_orcamento_tag_type_investimento(client):
    """130 - POST /orcamentos tag type=investimento → 422"""
    tag = make_tag_investimento(client)
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 422


def test_create_orcamento_nonexistent_tag(client):
    """131 - POST /orcamentos tag_id=99999 nonexistent → 422"""
    res = make_orcamento(client, tag_id=99999)
    assert res.status_code == 422


def test_create_orcamento_inactive_tag(client):
    """132 - POST /orcamentos tag inactive → 422"""
    tag = make_tag_despesa(client)
    client.delete(f"/tags/{tag['id']}")
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 422


def test_create_orcamento_month_out_of_range(client):
    """133 - POST /orcamentos month=0 or month=13 → 422"""
    tag = make_tag_despesa(client)
    res0 = client.post("/orcamentos", json={"tag_id": tag["id"], "year": 2026, "month": 0, "limit_value": "1000.00"})
    assert res0.status_code == 422
    res13 = client.post("/orcamentos", json={"tag_id": tag["id"], "year": 2026, "month": 13, "limit_value": "1000.00"})
    assert res13.status_code == 422


def test_create_orcamento_negative_limit_value(client):
    """134 - POST /orcamentos limit_value=-100 → 422"""
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "year": 2026, "month": 5, "limit_value": "-100"})
    assert res.status_code == 422


def test_create_orcamento_zero_limit_value(client):
    """135 - POST /orcamentos limit_value=0 → 422"""
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "year": 2026, "month": 5, "limit_value": "0"})
    assert res.status_code == 422


def test_create_orcamento_duplicate_active(client):
    """136 - POST /orcamentos duplicate (tag_id, year, month) among active → 409 on second"""
    tag = make_tag_despesa(client)
    res1 = make_orcamento(client, tag_id=tag["id"])
    assert res1.status_code == 201
    res2 = make_orcamento(client, tag_id=tag["id"])
    assert res2.status_code == 409


def test_create_orcamento_same_tag_year_different_month(client):
    """137 - POST /orcamentos same tag+year, different month → 201"""
    tag = make_tag_despesa(client)
    res1 = make_orcamento(client, tag_id=tag["id"], month=5)
    assert res1.status_code == 201
    res2 = make_orcamento(client, tag_id=tag["id"], month=6)
    assert res2.status_code == 201


def test_create_orcamento_same_combo_as_soft_deleted(client):
    """138 - POST /orcamentos same combo as soft-deleted → 201"""
    tag = make_tag_despesa(client)
    res1 = make_orcamento(client, tag_id=tag["id"])
    assert res1.status_code == 201
    orc_id = res1.json()["id"]
    client.delete(f"/orcamentos/{orc_id}")
    res2 = make_orcamento(client, tag_id=tag["id"])
    assert res2.status_code == 201


# ─── GET /orcamentos ──────────────────────────────────────────────────────────

def test_list_orcamentos_active_default(client):
    """139 - GET /orcamentos list all active → 200 + active list"""
    tag = make_tag_despesa(client)
    make_orcamento(client, tag_id=tag["id"], month=1)
    res_del = make_orcamento(client, tag_id=tag["id"], month=2)
    client.delete(f"/orcamentos/{res_del.json()['id']}")

    res = client.get("/orcamentos")
    assert res.status_code == 200
    data = res.json()
    assert all(o["active"] is True for o in data)
    months = [o["month"] for o in data]
    assert 1 in months
    assert 2 not in months


def test_list_orcamentos_filter_by_year(client):
    """140 - GET /orcamentos ?year=2026 → 200 + only year 2026"""
    tag = make_tag_despesa(client)
    make_orcamento(client, tag_id=tag["id"], year=2026, month=1)
    make_orcamento(client, tag_id=tag["id"], year=2025, month=1)

    res = client.get("/orcamentos?year=2026")
    assert res.status_code == 200
    data = res.json()
    assert all(o["year"] == 2026 for o in data)


def test_list_orcamentos_filter_by_month(client):
    """141 - GET /orcamentos ?month=5 → 200 + only month 5"""
    tag = make_tag_despesa(client)
    make_orcamento(client, tag_id=tag["id"], month=5)
    make_orcamento(client, tag_id=tag["id"], month=6)

    res = client.get("/orcamentos?month=5")
    assert res.status_code == 200
    data = res.json()
    assert all(o["month"] == 5 for o in data)


def test_list_orcamentos_filter_by_tag_id(client):
    """142 - GET /orcamentos ?tag_id=N → 200 + only that tag"""
    tag1 = make_tag_despesa(client, name="Tag1", color="#111111")
    tag2 = make_tag_despesa(client, name="Tag2", color="#222222")
    make_orcamento(client, tag_id=tag1["id"], month=1)
    make_orcamento(client, tag_id=tag2["id"], month=2)

    res = client.get(f"/orcamentos?tag_id={tag1['id']}")
    assert res.status_code == 200
    data = res.json()
    assert all(o["tag_id"] == tag1["id"] for o in data)


def test_list_orcamentos_filter_active_false(client):
    """143 - GET /orcamentos ?active=false → 200 + only inactive"""
    tag = make_tag_despesa(client)
    res_del = make_orcamento(client, tag_id=tag["id"], month=3)
    client.delete(f"/orcamentos/{res_del.json()['id']}")
    make_orcamento(client, tag_id=tag["id"], month=4)

    res = client.get("/orcamentos?active=false")
    assert res.status_code == 200
    data = res.json()
    assert all(o["active"] is False for o in data)


def test_list_orcamentos_empty_db(client):
    """144 - GET /orcamentos empty DB → 200 + []"""
    res = client.get("/orcamentos")
    assert res.status_code == 200
    assert res.json() == []


# ─── GET /orcamentos/{id} ─────────────────────────────────────────────────────

def test_get_orcamento_active(client):
    """145 - GET /orcamentos/{id} active → 200 + body"""
    tag = make_tag_despesa(client)
    created = make_orcamento(client, tag_id=tag["id"]).json()
    res = client.get(f"/orcamentos/{created['id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == created["id"]
    assert data["tag_id"] == tag["id"]
    assert data["active"] is True
    assert "created_at" in data
    assert "updated_at" in data


def test_get_orcamento_not_found(client):
    """146 - GET /orcamentos/{id} not found → 404"""
    res = client.get("/orcamentos/99999")
    assert res.status_code == 404


def test_get_orcamento_inactive(client):
    """147 - GET /orcamentos/{id} inactive → 404"""
    tag = make_tag_despesa(client)
    res = make_orcamento(client, tag_id=tag["id"])
    orc_id = res.json()["id"]
    client.delete(f"/orcamentos/{orc_id}")
    res2 = client.get(f"/orcamentos/{orc_id}")
    assert res2.status_code == 404


# ─── PUT /orcamentos/{id} ─────────────────────────────────────────────────────

def test_update_orcamento_limit_value(client):
    """148 - PUT /orcamentos/{id} update limit_value → 200"""
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    res = client.put(f"/orcamentos/{orc_id}", json={"limit_value": "2000.00"})
    assert res.status_code == 200
    assert float(res.json()["limit_value"]) == 2000.00


def test_update_orcamento_conflict_combo(client):
    """149 - PUT /orcamentos/{id} update to (tag_id, year, month) already used by another active → 409"""
    tag = make_tag_despesa(client)
    orc1_id = make_orcamento(client, tag_id=tag["id"], month=5).json()["id"]
    orc2_id = make_orcamento(client, tag_id=tag["id"], month=6).json()["id"]
    # Try to update orc2 to same combo as orc1
    res = client.put(f"/orcamentos/{orc2_id}", json={"month": 5})
    assert res.status_code == 409


def test_update_orcamento_negative_limit_value(client):
    """150 - PUT /orcamentos/{id} limit_value=-50 → 422"""
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    res = client.put(f"/orcamentos/{orc_id}", json={"limit_value": "-50"})
    assert res.status_code == 422


def test_update_orcamento_tag_non_despesa(client):
    """151 - PUT /orcamentos/{id} update tag_id to non-despesa tag → 422"""
    tag_d = make_tag_despesa(client)
    tag_r = make_tag_receita(client)
    orc_id = make_orcamento(client, tag_id=tag_d["id"]).json()["id"]
    res = client.put(f"/orcamentos/{orc_id}", json={"tag_id": tag_r["id"]})
    assert res.status_code == 422


def test_update_orcamento_not_found(client):
    """152 - PUT /orcamentos/{id} id=99999 → 404"""
    res = client.put("/orcamentos/99999", json={"limit_value": "500.00"})
    assert res.status_code == 404


def test_update_orcamento_empty_body(client):
    """153 - PUT /orcamentos/{id} empty body → 200 + unchanged"""
    tag = make_tag_despesa(client)
    created = make_orcamento(client, tag_id=tag["id"]).json()
    res = client.put(f"/orcamentos/{created['id']}", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["tag_id"] == created["tag_id"]
    assert data["year"] == created["year"]
    assert data["month"] == created["month"]
    assert float(data["limit_value"]) == float(created["limit_value"])


# ─── DELETE /orcamentos/{id} ──────────────────────────────────────────────────

def test_delete_orcamento_success(client, db):
    """154 - DELETE /orcamentos/{id} soft delete → 204 + active=False"""
    from app.models import Orcamento

    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    res = client.delete(f"/orcamentos/{orc_id}")
    assert res.status_code == 204
    record = db.get(Orcamento, orc_id)
    assert record is not None
    assert record.active is False


def test_delete_orcamento_not_found(client):
    """155 - DELETE /orcamentos/{id} not found → 404"""
    res = client.delete("/orcamentos/99999")
    assert res.status_code == 404


def test_delete_orcamento_already_inactive(client):
    """156 - DELETE /orcamentos/{id} already inactive → 404"""
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    client.delete(f"/orcamentos/{orc_id}")
    res = client.delete(f"/orcamentos/{orc_id}")
    assert res.status_code == 404
