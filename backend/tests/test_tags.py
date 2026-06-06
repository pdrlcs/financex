import pytest


def make_tag(client, name="Alimentação", type="despesa", color="#FF5733"):
    return client.post("/tags", json={"name": name, "type": type, "color": color})


# ─── POST /tags ───────────────────────────────────────────────────────────────

def test_create_tag_success(client):
    """1 - POST /tags success: valid payload → 201 + id + active=True"""
    res = make_tag(client)
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["active"] is True
    assert data["name"] == "Alimentação"
    assert data["type"] == "despesa"
    assert data["color"] == "#FF5733"


def test_create_tag_missing_name(client):
    """2 - POST /tags missing name → 422"""
    res = client.post("/tags", json={"type": "despesa", "color": "#FF5733"})
    assert res.status_code == 422


def test_create_tag_missing_type(client):
    """3 - POST /tags missing type → 422"""
    res = client.post("/tags", json={"name": "Test", "color": "#FF5733"})
    assert res.status_code == 422


def test_create_tag_missing_color(client):
    """4 - POST /tags missing color → 422"""
    res = client.post("/tags", json={"name": "Test", "type": "despesa"})
    assert res.status_code == 422


def test_create_tag_invalid_type(client):
    """5 - POST /tags invalid type → 422"""
    res = client.post("/tags", json={"name": "Test", "type": "outro", "color": "#FF5733"})
    assert res.status_code == 422


def test_create_tag_invalid_color_format(client):
    """6 - POST /tags invalid color format → 422"""
    res = client.post("/tags", json={"name": "Test", "type": "despesa", "color": "vermelho"})
    assert res.status_code == 422


def test_create_tag_duplicate_name_type_active(client):
    """7 - POST /tags duplicate name+type among active → 409 on second"""
    make_tag(client, name="Alimentação", type="despesa")
    res = make_tag(client, name="Alimentação", type="despesa")
    assert res.status_code == 409


def test_create_tag_same_name_different_type(client):
    """8 - POST /tags same name, different type → 201 both"""
    r1 = make_tag(client, name="Alimentação", type="despesa")
    r2 = make_tag(client, name="Alimentação", type="receita")
    assert r1.status_code == 201
    assert r2.status_code == 201


def test_create_tag_name_of_soft_deleted_same_type(client):
    """9 - POST /tags name of soft-deleted tag same type → 201"""
    res = make_tag(client, name="Moradia", type="despesa")
    tag_id = res.json()["id"]
    client.delete(f"/tags/{tag_id}")
    res2 = make_tag(client, name="Moradia", type="despesa")
    assert res2.status_code == 201


def test_create_tag_name_64_chars(client):
    """10 - POST /tags name=64 chars → 201"""
    name = "A" * 64
    res = make_tag(client, name=name)
    assert res.status_code == 201


def test_create_tag_name_65_chars(client):
    """11 - POST /tags name=65 chars → 422"""
    name = "A" * 65
    res = make_tag(client, name=name)
    assert res.status_code == 422


# ─── GET /tags ────────────────────────────────────────────────────────────────

def test_list_tags_active_default(client):
    """12 - GET /tags list active (default) → 200 + only active=True"""
    make_tag(client, name="Tag1", type="despesa")
    res_del = make_tag(client, name="Tag2", type="receita")
    client.delete(f"/tags/{res_del.json()['id']}")

    res = client.get("/tags")
    assert res.status_code == 200
    tags = res.json()
    assert all(t["active"] is True for t in tags)
    names = [t["name"] for t in tags]
    assert "Tag1" in names
    assert "Tag2" not in names


def test_list_tags_filter_by_type(client):
    """13 - GET /tags filter ?type=despesa → 200 + only despesa"""
    make_tag(client, name="Despesa1", type="despesa")
    make_tag(client, name="Receita1", type="receita")

    res = client.get("/tags?type=despesa")
    assert res.status_code == 200
    tags = res.json()
    assert all(t["type"] == "despesa" for t in tags)


def test_list_tags_filter_active_false(client):
    """14 - GET /tags filter ?active=false → 200 + only inactive"""
    res_del = make_tag(client, name="Inactive1", type="despesa")
    client.delete(f"/tags/{res_del.json()['id']}")
    make_tag(client, name="Active1", type="receita")

    res = client.get("/tags?active=false")
    assert res.status_code == 200
    tags = res.json()
    assert all(t["active"] is False for t in tags)


def test_list_tags_filter_type_and_active_false(client):
    """15 - GET /tags filter ?type=receita&active=false → 200 + inactive receita"""
    r1 = make_tag(client, name="InactiveReceita", type="receita")
    client.delete(f"/tags/{r1.json()['id']}")
    r2 = make_tag(client, name="InactiveDespesa", type="despesa")
    client.delete(f"/tags/{r2.json()['id']}")
    make_tag(client, name="ActiveReceita", type="receita")

    res = client.get("/tags?type=receita&active=false")
    assert res.status_code == 200
    tags = res.json()
    assert all(t["type"] == "receita" and t["active"] is False for t in tags)


def test_list_tags_empty_db(client):
    """16 - GET /tags empty DB → 200 + []"""
    res = client.get("/tags")
    assert res.status_code == 200
    assert res.json() == []


# ─── GET /tags/{id} ───────────────────────────────────────────────────────────

def test_get_tag_active(client):
    """17 - GET /tags/{id} active tag → 200 + full body"""
    created = make_tag(client).json()
    res = client.get(f"/tags/{created['id']}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == created["id"]
    assert data["name"] == created["name"]
    assert data["type"] == created["type"]
    assert data["color"] == created["color"]
    assert data["active"] is True
    assert "created_at" in data
    assert "updated_at" in data


def test_get_tag_not_found(client):
    """18 - GET /tags/{id} not found → 404"""
    res = client.get("/tags/99999")
    assert res.status_code == 404


def test_get_tag_soft_deleted(client):
    """19 - GET /tags/{id} soft deleted → 404"""
    res = make_tag(client)
    tag_id = res.json()["id"]
    client.delete(f"/tags/{tag_id}")
    res2 = client.get(f"/tags/{tag_id}")
    assert res2.status_code == 404


# ─── PUT /tags/{id} ───────────────────────────────────────────────────────────

def test_update_tag_name(client):
    """20 - PUT /tags/{id} update name → 200 + updated"""
    tag_id = make_tag(client).json()["id"]
    res = client.put(f"/tags/{tag_id}", json={"name": "NovoNome"})
    assert res.status_code == 200
    assert res.json()["name"] == "NovoNome"


def test_update_tag_color(client):
    """21 - PUT /tags/{id} update color → 200 + updated"""
    tag_id = make_tag(client).json()["id"]
    res = client.put(f"/tags/{tag_id}", json={"color": "#AABBCC"})
    assert res.status_code == 200
    assert res.json()["color"] == "#AABBCC"


def test_update_tag_type(client):
    """22 - PUT /tags/{id} update type → 200 + updated"""
    tag_id = make_tag(client).json()["id"]
    res = client.put(f"/tags/{tag_id}", json={"type": "receita"})
    assert res.status_code == 200
    assert res.json()["type"] == "receita"


def test_update_tag_conflict_name_type_with_other_active(client):
    """23 - PUT /tags/{id} conflict name+type with other active → 409"""
    make_tag(client, name="Conflito", type="despesa")
    tag_id = make_tag(client, name="Outro", type="despesa").json()["id"]
    res = client.put(f"/tags/{tag_id}", json={"name": "Conflito"})
    assert res.status_code == 409


def test_update_tag_name_of_inactive_same_type(client):
    """24 - PUT /tags/{id} name of inactive same type → 200"""
    r_del = make_tag(client, name="Deletada", type="despesa")
    client.delete(f"/tags/{r_del.json()['id']}")
    tag_id = make_tag(client, name="Ativa", type="despesa").json()["id"]
    res = client.put(f"/tags/{tag_id}", json={"name": "Deletada"})
    assert res.status_code == 200
    assert res.json()["name"] == "Deletada"


def test_update_tag_not_found(client):
    """25 - PUT /tags/{id} not found → 404"""
    res = client.put("/tags/99999", json={"name": "Test"})
    assert res.status_code == 404


def test_update_tag_empty_body(client):
    """26 - PUT /tags/{id} empty body → 200 + unchanged"""
    tag = make_tag(client).json()
    res = client.put(f"/tags/{tag['id']}", json={})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == tag["name"]
    assert data["type"] == tag["type"]
    assert data["color"] == tag["color"]


def test_update_tag_invalid_color(client):
    """27 - PUT /tags/{id} invalid color → 422"""
    tag_id = make_tag(client).json()["id"]
    res = client.put(f"/tags/{tag_id}", json={"color": "#GGG123"})
    assert res.status_code == 422


# ─── DELETE /tags/{id} ────────────────────────────────────────────────────────

def test_delete_tag_success(client, db):
    """28 - DELETE /tags/{id} success soft delete → 204 + record has active=False"""
    from app.models import Tag

    tag_id = make_tag(client).json()["id"]
    res = client.delete(f"/tags/{tag_id}")
    assert res.status_code == 204
    record = db.get(Tag, tag_id)
    assert record is not None
    assert record.active is False


def test_delete_tag_not_found(client):
    """29 - DELETE /tags/{id} not found → 404"""
    res = client.delete("/tags/99999")
    assert res.status_code == 404


def test_delete_tag_already_inactive(client):
    """30 - DELETE /tags/{id} already inactive → 404"""
    tag_id = make_tag(client).json()["id"]
    client.delete(f"/tags/{tag_id}")
    res = client.delete(f"/tags/{tag_id}")
    assert res.status_code == 404
