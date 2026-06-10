import pytest


def make_conta(client, name="Conta Corrente", type="banco", color="#1A2B3C"):
    return client.post("/contas", json={"name": name, "type": type, "color": color})


# ─── POST /contas ──────────────────────────────────────────────────────────────

def test_create_conta_success(client):
    """31 - POST /contas success: valid payload → 201 + body"""
    res = make_conta(client)
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["active"] is True
    assert data["name"] == "Conta Corrente"
    assert data["type"] == "banco"
    assert data["color"] == "#1A2B3C"


def test_create_conta_missing_name(client):
    """32 - POST /contas missing name → 422"""
    res = client.post("/contas", json={"type": "banco", "color": "#1A2B3C"})
    assert res.status_code == 422


def test_create_conta_missing_type(client):
    """33 - POST /contas missing type → 422"""
    res = client.post("/contas", json={"name": "Test", "color": "#1A2B3C"})
    assert res.status_code == 422


def test_create_conta_missing_color(client):
    """34 - POST /contas missing color → 422"""
    res = client.post("/contas", json={"name": "Test", "type": "banco"})
    assert res.status_code == 422


def test_create_conta_invalid_type(client):
    """35 - POST /contas invalid type → 422"""
    res = client.post("/contas", json={"name": "Test", "type": "poupança", "color": "#1A2B3C"})
    assert res.status_code == 422


def test_create_conta_invalid_color(client):
    """36 - POST /contas invalid color → 422"""
    res = client.post("/contas", json={"name": "Test", "type": "banco", "color": "azul"})
    assert res.status_code == 422


def test_create_conta_duplicate_name_active(client):
    """37 - POST /contas duplicate name among active → 409 on second"""
    make_conta(client, name="Minha Conta", type="banco")
    res = make_conta(client, name="Minha Conta", type="carteira")
    assert res.status_code == 409


def test_create_conta_name_of_inactive(client):
    """38 - POST /contas name of inactive conta → 201"""
    res = make_conta(client, name="Conta Deletada", type="banco")
    conta_id = res.json()["id"]
    client.delete(f"/contas/{conta_id}")
    res2 = make_conta(client, name="Conta Deletada", type="investimento")
    assert res2.status_code == 201


def test_create_conta_name_64_chars(client):
    """39 - POST /contas name=64 chars → 201"""
    name = "A" * 64
    res = make_conta(client, name=name)
    assert res.status_code == 201


def test_create_conta_name_65_chars(client):
    """40 - POST /contas name=65 chars → 422"""
    name = "A" * 65
    res = make_conta(client, name=name)
    assert res.status_code == 422


# ─── GET /contas ───────────────────────────────────────────────────────────────

def test_list_contas_active_default(client):
    """41 - GET /contas list active (default) → 200 + only active=True"""
    make_conta(client, name="Conta1", type="banco")
    res_del = make_conta(client, name="Conta2", type="carteira")
    client.delete(f"/contas/{res_del.json()['id']}")

    res = client.get("/contas")
    assert res.status_code == 200
    contas = res.json()
    assert all(c["active"] is True for c in contas)
    names = [c["name"] for c in contas]
    assert "Conta1" in names
    assert "Conta2" not in names


def test_list_contas_filter_by_type(client):
    """42 - GET /contas filter ?type=banco → 200 + only banco"""
    make_conta(client, name="Banco1", type="banco")
    make_conta(client, name="Investimento1", type="investimento")

    res = client.get("/contas?type=banco")
    assert res.status_code == 200
    contas = res.json()
    assert all(c["type"] == "banco" for c in contas)


def test_list_contas_filter_active_false(client):
    """43 - GET /contas filter ?active=false → 200 + only inactive"""
    res_del = make_conta(client, name="Inativa1", type="banco")
    client.delete(f"/contas/{res_del.json()['id']}")
    make_conta(client, name="Ativa1", type="carteira")

    res = client.get("/contas?active=false")
    assert res.status_code == 200
    contas = res.json()
    assert all(c["active"] is False for c in contas)


def test_list_contas_empty_db(client):
    """44 - GET /contas empty DB → 200 + []"""
    res = client.get("/contas")
    assert res.status_code == 200
    assert res.json() == []


# ─── GET /contas/{id} ─────────────────────────────────────────────────────────

def test_get_conta_active(client):
    """45 - GET /contas/{id} active → 200 + full body"""
    created = make_conta(client).json()
    res = client.get(f"/contas/{created['id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == created["id"]
    assert data["name"] == created["name"]
    assert data["type"] == created["type"]
    assert data["color"] == created["color"]
    assert data["active"] is True
    assert "created_at" in data
    assert "updated_at" in data


def test_get_conta_not_found(client):
    """46 - GET /contas/{id} not found → 404"""
    res = client.get("/contas/99999")
    assert res.status_code == 404


def test_get_conta_inactive(client):
    """47 - GET /contas/{id} inactive → 404"""
    res = make_conta(client)
    conta_id = res.json()["id"]
    client.delete(f"/contas/{conta_id}")
    res2 = client.get(f"/contas/{conta_id}")
    assert res2.status_code == 404


# ─── PUT /contas/{id} ─────────────────────────────────────────────────────────

def test_update_conta_name(client):
    """48 - PUT /contas/{id} update name → 200 + updated"""
    conta_id = make_conta(client).json()["id"]
    res = client.put(f"/contas/{conta_id}", json={"name": "Novo Nome"})
    assert res.status_code == 200
    assert res.json()["name"] == "Novo Nome"


def test_update_conta_color(client):
    """49 - PUT /contas/{id} update color → 200 + updated"""
    conta_id = make_conta(client).json()["id"]
    res = client.put(f"/contas/{conta_id}", json={"color": "#AABBCC"})
    assert res.status_code == 200
    assert res.json()["color"] == "#AABBCC"


def test_update_conta_type(client):
    """50 - PUT /contas/{id} update type → 200 + updated"""
    conta_id = make_conta(client).json()["id"]
    res = client.put(f"/contas/{conta_id}", json={"type": "investimento"})
    assert res.status_code == 200
    assert res.json()["type"] == "investimento"


def test_update_conta_conflict_name_with_other_active(client):
    """51 - PUT /contas/{id} conflict name with other active → 409"""
    make_conta(client, name="Conflito", type="banco")
    conta_id = make_conta(client, name="Outro", type="carteira").json()["id"]
    res = client.put(f"/contas/{conta_id}", json={"name": "Conflito"})
    assert res.status_code == 409


def test_update_conta_name_of_inactive(client):
    """52 - PUT /contas/{id} name of inactive conta → 200"""
    r_del = make_conta(client, name="Deletada", type="banco")
    client.delete(f"/contas/{r_del.json()['id']}")
    conta_id = make_conta(client, name="Ativa", type="carteira").json()["id"]
    res = client.put(f"/contas/{conta_id}", json={"name": "Deletada"})
    assert res.status_code == 200
    assert res.json()["name"] == "Deletada"


def test_update_conta_not_found(client):
    """53 - PUT /contas/{id} not found → 404"""
    res = client.put("/contas/99999", json={"name": "Test"})
    assert res.status_code == 404


def test_update_conta_empty_body(client):
    """54 - PUT /contas/{id} empty body → 200 + unchanged"""
    conta = make_conta(client).json()
    res = client.put(f"/contas/{conta['id']}", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == conta["name"]
    assert data["type"] == conta["type"]
    assert data["color"] == conta["color"]


# ─── DELETE /contas/{id} ──────────────────────────────────────────────────────

def test_delete_conta_success(client, db):
    """55 - DELETE /contas/{id} soft delete → 204 + active=False"""
    from app.models import Conta

    conta_id = make_conta(client).json()["id"]
    res = client.delete(f"/contas/{conta_id}")
    assert res.status_code == 204
    record = db.get(Conta, conta_id)
    assert record is not None
    assert record.active is False


def test_delete_conta_not_found(client):
    """56 - DELETE /contas/{id} not found → 404"""
    res = client.delete("/contas/99999")
    assert res.status_code == 404


def test_delete_conta_already_inactive(client):
    """57 - DELETE /contas/{id} already inactive → 404"""
    conta_id = make_conta(client).json()["id"]
    client.delete(f"/contas/{conta_id}")
    res = client.delete(f"/contas/{conta_id}")
    assert res.status_code == 404


# ─── Indexador (CDI) ───────────────────────────────────────────────────────────

def test_create_conta_cdi_ok(client):
    res = client.post("/contas", json={
        "name": "CDB 110", "type": "investimento", "color": "#10B981",
        "indexador": "cdi", "indexador_percent": "110.00",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["indexador"] == "cdi"
    assert float(data["indexador_percent"]) == 110.0


def test_create_conta_cdi_requires_percent(client):
    res = client.post("/contas", json={
        "name": "CDB sem pct", "type": "investimento", "color": "#10B981",
        "indexador": "cdi",
    })
    assert res.status_code == 422


def test_create_conta_cdi_requires_investimento_type(client):
    res = client.post("/contas", json={
        "name": "Banco CDI", "type": "banco", "color": "#10B981",
        "indexador": "cdi", "indexador_percent": "100.00",
    })
    assert res.status_code == 422


def test_update_conta_set_and_clear_indexador(client):
    base = client.post("/contas", json={
        "name": "Reserva", "type": "investimento", "color": "#10B981",
    }).json()
    r = client.put(f"/contas/{base['id']}", json={
        "indexador": "cdi", "indexador_percent": "100.00",
    })
    assert r.status_code == 200
    assert r.json()["indexador"] == "cdi"
    r = client.put(f"/contas/{base['id']}", json={"indexador": None, "indexador_percent": None})
    assert r.status_code == 200
    assert r.json()["indexador"] is None
