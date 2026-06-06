def make_tag(client, name="Alimentação", type="despesa", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": type, "color": color})
    assert r.status_code == 201
    return r.json()


def make_conta(client, name="Nubank", type="banco", color="#820AD1"):
    r = client.post("/contas", json={"name": name, "type": type, "color": color})
    assert r.status_code == 201
    return r.json()


# GET /configs/export


def test_export_returns_active_tags_and_contas(client):
    make_tag(client, name="Alimentação", type="despesa", color="#FF6384")
    make_conta(client, name="Nubank", type="banco", color="#820AD1")

    r = client.get("/configs/export")
    assert r.status_code == 200
    data = r.json()
    assert "tags" in data and "contas" in data
    tag_names = [t["name"] for t in data["tags"]]
    conta_names = [c["name"] for c in data["contas"]]
    assert "Alimentação" in tag_names
    assert "Nubank" in conta_names


def test_export_excludes_inactive(client):
    tag = make_tag(client, name="Inativa", type="despesa", color="#000000")
    client.delete(f"/tags/{tag['id']}")

    r = client.get("/configs/export")
    assert r.status_code == 200
    tag_names = [t["name"] for t in r.json()["tags"]]
    assert "Inativa" not in tag_names


def test_export_empty_db(client):
    r = client.get("/configs/export")
    assert r.status_code == 200
    data = r.json()
    assert data["tags"] == []
    assert data["contas"] == []


# POST /configs/import


def test_import_creates_new_tags(client):
    r = client.post("/configs/import", json={
        "tags": [{"name": "Alimentação", "type": "despesa", "color": "#FF6384"}],
        "contas": []
    })
    assert r.status_code == 200
    data = r.json()
    assert data["tags"]["criadas"] == 1
    assert data["tags"]["ignoradas"] == 0

    listed = client.get("/tags").json()
    assert any(t["name"] == "Alimentação" for t in listed)


def test_import_creates_new_contas(client):
    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [{"name": "Nubank", "type": "banco", "color": "#820AD1"}]
    })
    assert r.status_code == 200
    data = r.json()
    assert data["contas"]["criadas"] == 1
    assert data["contas"]["ignoradas"] == 0

    listed = client.get("/contas").json()
    assert any(c["name"] == "Nubank" for c in listed)


def test_import_skips_existing_active_tag(client):
    make_tag(client, name="Alimentação", type="despesa", color="#FF6384")

    r = client.post("/configs/import", json={
        "tags": [{"name": "Alimentação", "type": "despesa", "color": "#FF6384"}],
        "contas": []
    })
    assert r.status_code == 200
    data = r.json()
    assert data["tags"]["criadas"] == 0
    assert data["tags"]["ignoradas"] == 1


def test_import_skips_existing_active_conta(client):
    make_conta(client, name="Nubank", type="banco", color="#820AD1")

    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [{"name": "Nubank", "type": "banco", "color": "#820AD1"}]
    })
    assert r.status_code == 200
    data = r.json()
    assert data["contas"]["criadas"] == 0
    assert data["contas"]["ignoradas"] == 1


def test_import_restores_soft_deleted_tag(client):
    tag = make_tag(client, name="Restaurada", type="despesa", color="#111111")
    client.delete(f"/tags/{tag['id']}")

    r = client.post("/configs/import", json={
        "tags": [{"name": "Restaurada", "type": "despesa", "color": "#AABBCC"}],
        "contas": []
    })
    assert r.status_code == 200
    data = r.json()
    assert data["tags"]["criadas"] == 1

    listed = client.get("/tags").json()
    restored = next((t for t in listed if t["name"] == "Restaurada"), None)
    assert restored is not None
    assert restored["active"] is True
    assert restored["color"] == "#AABBCC"


def test_import_restores_soft_deleted_conta(client):
    conta = make_conta(client, name="Restaurada", type="banco", color="#111111")
    client.delete(f"/contas/{conta['id']}")

    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [{"name": "Restaurada", "type": "banco", "color": "#AABBCC"}]
    })
    assert r.status_code == 200
    data = r.json()
    assert data["contas"]["criadas"] == 1

    listed = client.get("/contas").json()
    restored = next((c for c in listed if c["name"] == "Restaurada"), None)
    assert restored is not None
    assert restored["active"] is True


def test_import_empty_arrays(client):
    r = client.post("/configs/import", json={"tags": [], "contas": []})
    assert r.status_code == 200
    data = r.json()
    assert data["tags"] == {"criadas": 0, "ignoradas": 0}
    assert data["contas"] == {"criadas": 0, "ignoradas": 0}


def test_import_missing_arrays_defaults_to_empty(client):
    r = client.post("/configs/import", json={})
    assert r.status_code == 200
    data = r.json()
    assert data["tags"] == {"criadas": 0, "ignoradas": 0}
    assert data["contas"] == {"criadas": 0, "ignoradas": 0}


def test_import_mix_new_and_existing_tags(client):
    make_tag(client, name="Existente", type="despesa", color="#FF0000")

    r = client.post("/configs/import", json={
        "tags": [
            {"name": "Existente", "type": "despesa", "color": "#FF0000"},
            {"name": "Nova", "type": "receita", "color": "#00FF00"},
        ],
        "contas": []
    })
    assert r.status_code == 200
    data = r.json()
    assert data["tags"]["criadas"] == 1
    assert data["tags"]["ignoradas"] == 1


def test_export_import_roundtrip(client):
    make_tag(client, name="Alimentação", type="despesa", color="#FF6384")
    make_tag(client, name="Salário", type="receita", color="#36A2EB")
    make_conta(client, name="Nubank", type="banco", color="#820AD1")

    export = client.get("/configs/export").json()

    # soft delete all
    for t in client.get("/tags").json():
        client.delete(f"/tags/{t['id']}")
    for c in client.get("/contas").json():
        client.delete(f"/contas/{c['id']}")

    assert client.get("/tags").json() == []
    assert client.get("/contas").json() == []

    r = client.post("/configs/import", json=export)
    assert r.status_code == 200
    data = r.json()
    assert data["tags"]["criadas"] == 2
    assert data["contas"]["criadas"] == 1

    assert len(client.get("/tags").json()) == 2
    assert len(client.get("/contas").json()) == 1
