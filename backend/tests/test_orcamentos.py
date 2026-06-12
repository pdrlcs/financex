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


def make_orcamento(client, tag_id, start_year=2026, start_month=5, limit_value="1000.00"):
    return client.post("/orcamentos", json={
        "tag_id": tag_id,
        "start_year": start_year,
        "start_month": start_month,
        "limit_value": str(limit_value),
    })


# ─── POST /orcamentos ─────────────────────────────────────────────────────────

def test_create_orcamento_success(client):
    tag = make_tag_despesa(client)
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["active"] is True
    assert data["tag_id"] == tag["id"]
    assert data["start_year"] == 2026
    assert data["start_month"] == 5
    assert float(data["limit_value"]) == 1000.00


def test_create_orcamento_missing_tag_id(client):
    res = client.post("/orcamentos", json={"start_year": 2026, "start_month": 5, "limit_value": "1000.00"})
    assert res.status_code == 422


def test_create_orcamento_missing_start_year(client):
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "start_month": 5, "limit_value": "1000.00"})
    assert res.status_code == 422


def test_create_orcamento_missing_start_month(client):
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "start_year": 2026, "limit_value": "1000.00"})
    assert res.status_code == 422


def test_create_orcamento_missing_limit_value(client):
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "start_year": 2026, "start_month": 5})
    assert res.status_code == 422


def test_create_orcamento_tag_type_receita(client):
    tag = make_tag_receita(client)
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 422


def test_create_orcamento_tag_type_investimento(client):
    tag = make_tag_investimento(client)
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 422


def test_create_orcamento_nonexistent_tag(client):
    res = make_orcamento(client, tag_id=99999)
    assert res.status_code == 422


def test_create_orcamento_inactive_tag(client):
    tag = make_tag_despesa(client)
    client.delete(f"/tags/{tag['id']}")
    res = make_orcamento(client, tag_id=tag["id"])
    assert res.status_code == 422


def test_create_orcamento_start_month_out_of_range(client):
    tag = make_tag_despesa(client)
    res0 = client.post("/orcamentos", json={"tag_id": tag["id"], "start_year": 2026, "start_month": 0, "limit_value": "1000.00"})
    assert res0.status_code == 422
    res13 = client.post("/orcamentos", json={"tag_id": tag["id"], "start_year": 2026, "start_month": 13, "limit_value": "1000.00"})
    assert res13.status_code == 422


def test_create_orcamento_negative_limit_value(client):
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "start_year": 2026, "start_month": 5, "limit_value": "-100"})
    assert res.status_code == 422


def test_create_orcamento_zero_limit_value(client):
    tag = make_tag_despesa(client)
    res = client.post("/orcamentos", json={"tag_id": tag["id"], "start_year": 2026, "start_month": 5, "limit_value": "0"})
    assert res.status_code == 422


def test_create_orcamento_duplicate_active_per_tag(client):
    """Um orçamento ativo por tag: segundo ativo na mesma tag → 409."""
    tag = make_tag_despesa(client)
    assert make_orcamento(client, tag_id=tag["id"], start_month=5).status_code == 201
    assert make_orcamento(client, tag_id=tag["id"], start_month=6).status_code == 409


def test_create_orcamento_different_tags_ok(client):
    tag1 = make_tag_despesa(client, name="Tag1", color="#111111")
    tag2 = make_tag_despesa(client, name="Tag2", color="#222222")
    assert make_orcamento(client, tag_id=tag1["id"]).status_code == 201
    assert make_orcamento(client, tag_id=tag2["id"]).status_code == 201


def test_create_orcamento_same_tag_as_soft_deleted(client):
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    client.delete(f"/orcamentos/{orc_id}")
    res2 = make_orcamento(client, tag_id=tag["id"])
    assert res2.status_code == 201


# ─── GET /orcamentos ──────────────────────────────────────────────────────────

def test_list_orcamentos_active_default(client):
    tag1 = make_tag_despesa(client, name="Tag1", color="#111111")
    tag2 = make_tag_despesa(client, name="Tag2", color="#222222")
    make_orcamento(client, tag_id=tag1["id"])
    res_del = make_orcamento(client, tag_id=tag2["id"])
    client.delete(f"/orcamentos/{res_del.json()['id']}")

    res = client.get("/orcamentos")
    assert res.status_code == 200
    data = res.json()
    assert all(o["active"] is True for o in data)
    tag_ids = [o["tag_id"] for o in data]
    assert tag1["id"] in tag_ids
    assert tag2["id"] not in tag_ids


def test_list_orcamentos_projects_started_templates(client):
    """?year&month retorna templates ativos cujo início é <= (year, month)."""
    tag = make_tag_despesa(client)
    make_orcamento(client, tag_id=tag["id"], start_year=2026, start_month=5)

    # mês de início e meses futuros: presente
    assert any(o["tag_id"] == tag["id"] for o in client.get("/orcamentos?year=2026&month=5").json())
    assert any(o["tag_id"] == tag["id"] for o in client.get("/orcamentos?year=2026&month=9").json())
    assert any(o["tag_id"] == tag["id"] for o in client.get("/orcamentos?year=2027&month=1").json())

    # antes do início: ausente
    assert all(o["tag_id"] != tag["id"] for o in client.get("/orcamentos?year=2026&month=4").json())
    assert all(o["tag_id"] != tag["id"] for o in client.get("/orcamentos?year=2025&month=12").json())


def test_list_orcamentos_filter_by_tag_id(client):
    tag1 = make_tag_despesa(client, name="Tag1", color="#111111")
    tag2 = make_tag_despesa(client, name="Tag2", color="#222222")
    make_orcamento(client, tag_id=tag1["id"])
    make_orcamento(client, tag_id=tag2["id"])

    res = client.get(f"/orcamentos?tag_id={tag1['id']}")
    assert res.status_code == 200
    assert all(o["tag_id"] == tag1["id"] for o in res.json())


def test_list_orcamentos_filter_active_false(client):
    tag1 = make_tag_despesa(client, name="Tag1", color="#111111")
    tag2 = make_tag_despesa(client, name="Tag2", color="#222222")
    res_del = make_orcamento(client, tag_id=tag1["id"])
    client.delete(f"/orcamentos/{res_del.json()['id']}")
    make_orcamento(client, tag_id=tag2["id"])

    res = client.get("/orcamentos?active=false")
    assert res.status_code == 200
    data = res.json()
    assert all(o["active"] is False for o in data)


def test_list_orcamentos_empty_db(client):
    res = client.get("/orcamentos")
    assert res.status_code == 200
    assert res.json() == []


# ─── GET /orcamentos/{id} ─────────────────────────────────────────────────────

def test_get_orcamento_active(client):
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
    res = client.get("/orcamentos/99999")
    assert res.status_code == 404


def test_get_orcamento_inactive(client):
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    client.delete(f"/orcamentos/{orc_id}")
    res2 = client.get(f"/orcamentos/{orc_id}")
    assert res2.status_code == 404


# ─── PUT /orcamentos/{id} ─────────────────────────────────────────────────────

def test_update_orcamento_limit_value(client):
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    res = client.put(f"/orcamentos/{orc_id}", json={"limit_value": "2000.00"})
    assert res.status_code == 200
    assert float(res.json()["limit_value"]) == 2000.00


def test_update_orcamento_start_month(client):
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"], start_month=5).json()["id"]
    res = client.put(f"/orcamentos/{orc_id}", json={"start_month": 8})
    assert res.status_code == 200
    assert res.json()["start_month"] == 8


def test_update_orcamento_conflict_tag(client):
    """Mudar a tag para uma que já tem orçamento ativo → 409."""
    tag1 = make_tag_despesa(client, name="Tag1", color="#111111")
    tag2 = make_tag_despesa(client, name="Tag2", color="#222222")
    make_orcamento(client, tag_id=tag1["id"])
    orc2_id = make_orcamento(client, tag_id=tag2["id"]).json()["id"]
    res = client.put(f"/orcamentos/{orc2_id}", json={"tag_id": tag1["id"]})
    assert res.status_code == 409


def test_update_orcamento_negative_limit_value(client):
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    res = client.put(f"/orcamentos/{orc_id}", json={"limit_value": "-50"})
    assert res.status_code == 422


def test_update_orcamento_tag_non_despesa(client):
    tag_d = make_tag_despesa(client)
    tag_r = make_tag_receita(client)
    orc_id = make_orcamento(client, tag_id=tag_d["id"]).json()["id"]
    res = client.put(f"/orcamentos/{orc_id}", json={"tag_id": tag_r["id"]})
    assert res.status_code == 422


def test_update_orcamento_not_found(client):
    res = client.put("/orcamentos/99999", json={"limit_value": "500.00"})
    assert res.status_code == 404


def test_update_orcamento_empty_body(client):
    tag = make_tag_despesa(client)
    created = make_orcamento(client, tag_id=tag["id"]).json()
    res = client.put(f"/orcamentos/{created['id']}", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["tag_id"] == created["tag_id"]
    assert data["start_year"] == created["start_year"]
    assert data["start_month"] == created["start_month"]
    assert float(data["limit_value"]) == float(created["limit_value"])


# ─── DELETE /orcamentos/{id} ──────────────────────────────────────────────────

def test_delete_orcamento_success(client, db):
    from app.models import Orcamento

    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    res = client.delete(f"/orcamentos/{orc_id}")
    assert res.status_code == 204
    record = db.get(Orcamento, orc_id)
    assert record is not None
    assert record.active is False


def test_delete_orcamento_not_found(client):
    res = client.delete("/orcamentos/99999")
    assert res.status_code == 404


def test_delete_orcamento_already_inactive(client):
    tag = make_tag_despesa(client)
    orc_id = make_orcamento(client, tag_id=tag["id"]).json()["id"]
    client.delete(f"/orcamentos/{orc_id}")
    res = client.delete(f"/orcamentos/{orc_id}")
    assert res.status_code == 404
