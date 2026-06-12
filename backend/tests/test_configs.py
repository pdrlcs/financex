def make_tag(client, name="Alimentação", type="despesa", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": type, "color": color})
    assert r.status_code == 201
    return r.json()


def make_conta(client, name="Nubank", type="banco", color="#820AD1"):
    r = client.post("/contas", json={"name": name, "type": type, "color": color})
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
    r = client.post("/gastos-fixos/", json=body)
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


# Gastos fixos no export/import


def test_export_includes_gastos_fixos(client):
    tag = make_tag(client, name="Moradia", type="despesa", color="#FF6384")
    conta = make_conta(client, name="Nubank", type="banco", color="#820AD1")
    make_gasto_fixo(
        client,
        tag["id"],
        name="Aluguel",
        default_account_id=conta["id"],
        default_payment_method="pix",
        due_day=10,
    )

    data = client.get("/configs/export").json()
    assert "gastos_fixos" in data
    gf = next(g for g in data["gastos_fixos"] if g["name"] == "Aluguel")
    assert gf["tag_name"] == "Moradia"
    assert gf["tag_type"] == "despesa"
    assert gf["default_account_name"] == "Nubank"
    assert gf["default_account_type"] == "banco"
    assert gf["default_payment_method"] == "pix"
    assert gf["due_day"] == 10
    assert float(gf["expected_value"]) == 1500.00
    assert gf["start_year"] == 2026
    assert gf["start_month"] == 6


def test_export_gasto_fixo_without_account(client):
    tag = make_tag(client, name="Moradia", type="despesa", color="#FF6384")
    make_gasto_fixo(client, tag["id"], name="Internet")

    data = client.get("/configs/export").json()
    gf = next(g for g in data["gastos_fixos"] if g["name"] == "Internet")
    assert gf["default_account_name"] is None
    assert gf["default_account_type"] is None


def test_export_excludes_inactive_gasto_fixo(client):
    tag = make_tag(client, name="Moradia", type="despesa", color="#FF6384")
    gf = make_gasto_fixo(client, tag["id"], name="Aluguel")
    client.delete(f"/gastos-fixos/{gf['id']}")

    data = client.get("/configs/export").json()
    assert all(g["name"] != "Aluguel" for g in data["gastos_fixos"])


def test_export_empty_db_has_gastos_fixos_key(client):
    data = client.get("/configs/export").json()
    assert data["gastos_fixos"] == []


def test_import_creates_gasto_fixo(client):
    r = client.post("/configs/import", json={
        "tags": [{"name": "Moradia", "type": "despesa", "color": "#FF6384"}],
        "contas": [{"name": "Nubank", "type": "banco", "color": "#820AD1"}],
        "gastos_fixos": [{
            "name": "Aluguel",
            "tag_name": "Moradia",
            "tag_type": "despesa",
            "expected_value": "1500.00",
            "default_account_name": "Nubank",
            "default_account_type": "banco",
            "default_payment_method": "pix",
            "due_day": 10,
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["gastos_fixos"]["criadas"] == 1
    assert data["gastos_fixos"]["ignoradas"] == 0

    listed = client.get("/gastos-fixos/").json()
    gf = next(g for g in listed if g["name"] == "Aluguel")
    tag = next(t for t in client.get("/tags").json() if t["name"] == "Moradia")
    conta = next(c for c in client.get("/contas").json() if c["name"] == "Nubank")
    assert gf["tag_id"] == tag["id"]
    assert gf["default_account_id"] == conta["id"]
    assert gf["default_payment_method"] == "pix"


def test_import_skips_existing_active_gasto_fixo(client):
    tag = make_tag(client, name="Moradia", type="despesa", color="#FF6384")
    make_gasto_fixo(client, tag["id"], name="Aluguel")

    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [],
        "gastos_fixos": [{
            "name": "Aluguel",
            "tag_name": "Moradia",
            "tag_type": "despesa",
            "expected_value": "1500.00",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["gastos_fixos"]["criadas"] == 0
    assert data["gastos_fixos"]["ignoradas"] == 1


def test_import_restores_soft_deleted_gasto_fixo(client):
    tag = make_tag(client, name="Moradia", type="despesa", color="#FF6384")
    gf = make_gasto_fixo(client, tag["id"], name="Aluguel", expected_value="1000.00")
    client.delete(f"/gastos-fixos/{gf['id']}")

    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [],
        "gastos_fixos": [{
            "name": "Aluguel",
            "tag_name": "Moradia",
            "tag_type": "despesa",
            "expected_value": "1800.00",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    assert r.json()["gastos_fixos"]["criadas"] == 1

    listed = client.get("/gastos-fixos/").json()
    restored = next(g for g in listed if g["name"] == "Aluguel")
    assert restored["active"] is True
    assert float(restored["expected_value"]) == 1800.00


def test_import_autocreates_missing_tag_for_gasto_fixo(client):
    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [],
        "gastos_fixos": [{
            "name": "Aluguel",
            "tag_name": "Moradia",
            "tag_type": "despesa",
            "expected_value": "1500.00",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    assert r.json()["gastos_fixos"]["criadas"] == 1

    tags = client.get("/tags").json()
    created = next((t for t in tags if t["name"] == "Moradia"), None)
    assert created is not None
    assert created["type"] == "despesa"

    listed = client.get("/gastos-fixos/").json()
    gf = next(g for g in listed if g["name"] == "Aluguel")
    assert gf["tag_id"] == created["id"]


def test_import_autocreates_missing_account_for_gasto_fixo(client):
    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [],
        "gastos_fixos": [{
            "name": "Aluguel",
            "tag_name": "Moradia",
            "tag_type": "despesa",
            "expected_value": "1500.00",
            "default_account_name": "Itau",
            "default_account_type": "banco",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200

    contas = client.get("/contas").json()
    created = next((c for c in contas if c["name"] == "Itau"), None)
    assert created is not None
    assert created["type"] == "banco"


def test_roundtrip_gasto_fixo(client):
    tag = make_tag(client, name="Moradia", type="despesa", color="#FF6384")
    conta = make_conta(client, name="Nubank", type="banco", color="#820AD1")
    make_gasto_fixo(
        client,
        tag["id"],
        name="Aluguel",
        default_account_id=conta["id"],
        due_day=5,
    )

    export = client.get("/configs/export").json()

    # wipe everything
    for g in client.get("/gastos-fixos/").json():
        client.delete(f"/gastos-fixos/{g['id']}")
    for t in client.get("/tags").json():
        client.delete(f"/tags/{t['id']}")
    for c in client.get("/contas").json():
        client.delete(f"/contas/{c['id']}")

    r = client.post("/configs/import", json=export)
    assert r.status_code == 200
    assert r.json()["gastos_fixos"]["criadas"] == 1

    listed = client.get("/gastos-fixos/").json()
    gf = next(g for g in listed if g["name"] == "Aluguel")
    assert gf["due_day"] == 5
    assert float(gf["expected_value"]) == 1500.00


# Orçamentos no export/import


def make_orcamento(client, tag_id, start_year=2026, start_month=6, limit_value="220.00"):
    r = client.post("/orcamentos", json={
        "tag_id": tag_id,
        "start_year": start_year,
        "start_month": start_month,
        "limit_value": limit_value,
    })
    assert r.status_code == 201, r.text
    return r.json()


def test_export_includes_orcamentos(client):
    tag = make_tag(client, name="Delivery", type="despesa", color="#EF4444")
    make_orcamento(client, tag["id"], start_year=2026, start_month=6, limit_value="220.00")

    data = client.get("/configs/export").json()
    assert "orcamentos" in data
    orc = next(o for o in data["orcamentos"] if o["tag_name"] == "Delivery")
    assert orc["tag_type"] == "despesa"
    assert float(orc["limit_value"]) == 220.00
    assert orc["start_year"] == 2026
    assert orc["start_month"] == 6


def test_export_excludes_inactive_orcamento(client):
    tag = make_tag(client, name="Delivery", type="despesa", color="#EF4444")
    orc = make_orcamento(client, tag["id"])
    client.delete(f"/orcamentos/{orc['id']}")

    data = client.get("/configs/export").json()
    assert all(o["tag_name"] != "Delivery" for o in data["orcamentos"])


def test_export_empty_db_has_orcamentos_key(client):
    data = client.get("/configs/export").json()
    assert data["orcamentos"] == []


def test_import_creates_orcamento(client):
    r = client.post("/configs/import", json={
        "tags": [{"name": "Delivery", "type": "despesa", "color": "#EF4444"}],
        "contas": [],
        "orcamentos": [{
            "tag_name": "Delivery",
            "tag_type": "despesa",
            "limit_value": "220.00",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["orcamentos"]["criadas"] == 1
    assert data["orcamentos"]["ignoradas"] == 0

    listed = client.get("/orcamentos").json()
    tag = next(t for t in client.get("/tags").json() if t["name"] == "Delivery")
    orc = next(o for o in listed if o["tag_id"] == tag["id"])
    assert float(orc["limit_value"]) == 220.00
    assert orc["start_month"] == 6


def test_import_skips_existing_active_orcamento(client):
    tag = make_tag(client, name="Delivery", type="despesa", color="#EF4444")
    make_orcamento(client, tag["id"])

    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [],
        "orcamentos": [{
            "tag_name": "Delivery",
            "tag_type": "despesa",
            "limit_value": "999.00",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    assert r.json()["orcamentos"]["criadas"] == 0
    assert r.json()["orcamentos"]["ignoradas"] == 1


def test_import_restores_soft_deleted_orcamento(client):
    tag = make_tag(client, name="Delivery", type="despesa", color="#EF4444")
    orc = make_orcamento(client, tag["id"], limit_value="220.00")
    client.delete(f"/orcamentos/{orc['id']}")

    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [],
        "orcamentos": [{
            "tag_name": "Delivery",
            "tag_type": "despesa",
            "limit_value": "300.00",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    assert r.json()["orcamentos"]["criadas"] == 1

    listed = client.get("/orcamentos").json()
    restored = next(o for o in listed if o["tag_id"] == tag["id"])
    assert restored["active"] is True
    assert float(restored["limit_value"]) == 300.00


def test_import_autocreates_missing_tag_for_orcamento(client):
    r = client.post("/configs/import", json={
        "tags": [],
        "contas": [],
        "orcamentos": [{
            "tag_name": "Delivery",
            "tag_type": "despesa",
            "limit_value": "220.00",
            "start_year": 2026,
            "start_month": 6,
        }],
    })
    assert r.status_code == 200
    assert r.json()["orcamentos"]["criadas"] == 1

    tag = next((t for t in client.get("/tags").json() if t["name"] == "Delivery"), None)
    assert tag is not None
    assert tag["type"] == "despesa"


def test_roundtrip_orcamento(client):
    tag = make_tag(client, name="Delivery", type="despesa", color="#EF4444")
    make_orcamento(client, tag["id"], start_year=2026, start_month=6, limit_value="220.00")

    export = client.get("/configs/export").json()

    for o in client.get("/orcamentos").json():
        client.delete(f"/orcamentos/{o['id']}")
    for t in client.get("/tags").json():
        client.delete(f"/tags/{t['id']}")

    r = client.post("/configs/import", json=export)
    assert r.status_code == 200
    assert r.json()["orcamentos"]["criadas"] == 1

    listed = client.get("/orcamentos").json()
    orc = listed[0]
    assert float(orc["limit_value"]) == 220.00
    assert orc["start_month"] == 6


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
