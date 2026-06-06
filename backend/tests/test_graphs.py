import calendar
from datetime import date, timedelta

TODAY = date.today()
FIRST_OF_MONTH = date(TODAY.year, TODAY.month, 1)
LAST_OF_MONTH = date(TODAY.year, TODAY.month, calendar.monthrange(TODAY.year, TODAY.month)[1])


def make_tag(client, name, type="despesa", color="#FF0000"):
    r = client.post("/tags", json={"name": name, "type": type, "color": color})
    assert r.status_code == 201, r.text
    return r.json()


def make_conta(client, name="Nubank", type="banco", color="#820AD1"):
    r = client.post("/contas", json={"name": name, "type": type, "color": color})
    assert r.status_code == 201, r.text
    return r.json()


def make_transacao(client, account_id, type="despesa", value="100.00", date_str=None, tag_id=None, payment_method=None):
    if date_str is None:
        date_str = str(FIRST_OF_MONTH)
    body = {"type": type, "value": value, "date": date_str, "account_id": account_id}
    if tag_id:
        body["tag_id"] = tag_id
    if payment_method:
        body["payment_method"] = payment_method
    r = client.post("/transacoes", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def make_orcamento(client, tag_id, year=None, month=None, limit_value="1000.00"):
    year = year or TODAY.year
    month = month or TODAY.month
    r = client.post("/orcamentos", json={"tag_id": tag_id, "year": year, "month": month, "limit_value": limit_value})
    assert r.status_code == 201, r.text
    return r.json()


# ─── TEST 157 ─────────────────────────────────────────────────────────────────

def test_157_resumo_saldo_excludes_investimento(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="receita", value="5000.00")
    make_transacao(client, conta["id"], type="despesa", value="3000.00")
    make_transacao(client, conta["id"], type="investimento", value="1000.00")
    r = client.get("/graphs/resumo")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["receitas"] == 5000.0
    assert data["despesas"] == 3000.0
    assert data["saldo"] == 2000.0  # NOT 1000.0


# ─── TEST 158 ─────────────────────────────────────────────────────────────────

def test_158_resumo_investido_liquido(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="investimento", value="1000.00")
    make_transacao(client, conta["id"], type="retirada_investimento", value="200.00")
    r = client.get("/graphs/resumo")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["investido_liquido"] == 800.0


# ─── TEST 159 ─────────────────────────────────────────────────────────────────

def test_159_resumo_taxa_poupanca_null(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="100.00")
    r = client.get("/graphs/resumo")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["taxa_poupanca"] is None


# ─── TEST 160 ─────────────────────────────────────────────────────────────────

def test_160_exclude_tags(client):
    conta = make_conta(client)
    tag1 = make_tag(client, "Alimentação", color="#FF0000")
    tag2 = make_tag(client, "Transporte", color="#0000FF")
    make_transacao(client, conta["id"], type="despesa", value="100.00", tag_id=tag1["id"])
    make_transacao(client, conta["id"], type="despesa", value="200.00", tag_id=tag2["id"])
    r = client.get(f"/graphs/por-tag?exclude_tags={tag2['id']}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "Transporte" not in data["labels"]
    assert "Alimentação" in data["labels"]


# ─── TEST 161 ─────────────────────────────────────────────────────────────────

def test_161_outros_grouping(client):
    conta = make_conta(client)
    tag1 = make_tag(client, "Alimentação", color="#FF0000")
    tag2 = make_tag(client, "Pequeno", color="#00FF00")
    make_transacao(client, conta["id"], type="despesa", value="1000.00", tag_id=tag1["id"])
    make_transacao(client, conta["id"], type="despesa", value="10.00", tag_id=tag2["id"])  # ~0.98% → Outros
    r = client.get("/graphs/por-tag")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "Outros" in data["labels"]
    assert "Pequeno" not in data["labels"]


# ─── TEST 162 ─────────────────────────────────────────────────────────────────

def test_162_por_tag_colors(client):
    conta = make_conta(client)
    tag = make_tag(client, "Alimentação", color="#AABBCC")
    make_transacao(client, conta["id"], type="despesa", value="100.00", tag_id=tag["id"])
    r = client.get("/graphs/por-tag")
    assert r.status_code == 200, r.text
    data = r.json()
    idx = data["labels"].index("Alimentação")
    assert data["datasets"][0]["backgroundColor"][idx] == "#AABBCC"


# ─── TEST 163 ─────────────────────────────────────────────────────────────────

def test_163_por_tag_temporal(client):
    conta = make_conta(client)
    tag1 = make_tag(client, "Alimentação", color="#FF0000")
    tag2 = make_tag(client, "Transporte", color="#0000FF")
    make_transacao(client, conta["id"], type="despesa", value="100.00", tag_id=tag1["id"])
    make_transacao(client, conta["id"], type="despesa", value="50.00", tag_id=tag2["id"])
    r = client.get("/graphs/por-tag-temporal")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "labels" in data and "datasets" in data
    dataset_labels = [ds["label"] for ds in data["datasets"]]
    assert "Alimentação" in dataset_labels
    assert "Transporte" in dataset_labels


# ─── TEST 164 ─────────────────────────────────────────────────────────────────

def test_164_ranking_tags(client):
    conta = make_conta(client)
    tag1 = make_tag(client, "Alimentação", color="#FF0000")
    tag2 = make_tag(client, "Transporte", color="#0000FF")
    tag3 = make_tag(client, "Lazer", color="#FFFF00")
    make_transacao(client, conta["id"], type="despesa", value="300.00", tag_id=tag1["id"])
    make_transacao(client, conta["id"], type="despesa", value="100.00", tag_id=tag2["id"])
    make_transacao(client, conta["id"], type="despesa", value="200.00", tag_id=tag3["id"])
    r = client.get("/graphs/ranking-tags?limit=2")
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["labels"]) == 2
    assert data["labels"][0] == "Alimentação"  # highest


# ─── TEST 165 ─────────────────────────────────────────────────────────────────

def test_165_variacao_tags(client):
    conta = make_conta(client)
    tag = make_tag(client, "Alimentação", color="#FF0000")
    # Previous period: last month
    last_month = TODAY.replace(day=1) - timedelta(days=1)
    prev_first = last_month.replace(day=1)
    make_transacao(client, conta["id"], type="despesa", value="1000.00",
                   date_str=str(prev_first), tag_id=tag["id"])
    # Current period: this month
    make_transacao(client, conta["id"], type="despesa", value="1200.00",
                   date_str=str(FIRST_OF_MONTH), tag_id=tag["id"])
    r = client.get(f"/graphs/variacao-tags?date_from={FIRST_OF_MONTH}&date_to={LAST_OF_MONTH}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "labels" in data and "datasets" in data
    assert "meta" in data
    assert "absolutos" in data["meta"]
    idx = data["labels"].index("Alimentação")
    # 20% increase
    assert abs(data["datasets"][0]["data"][idx] - 20.0) < 0.1


# ─── TEST 166 ─────────────────────────────────────────────────────────────────

def test_166_por_mes(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="receita", value="5000.00")
    make_transacao(client, conta["id"], type="despesa", value="3000.00")
    make_transacao(client, conta["id"], type="investimento", value="1000.00")
    r = client.get("/graphs/por-mes")
    assert r.status_code == 200, r.text
    data = r.json()
    labels_in_datasets = [ds["label"] for ds in data["datasets"]]
    assert "Receitas" in labels_in_datasets
    assert "Despesas" in labels_in_datasets
    assert "Saldo" in labels_in_datasets


# ─── TEST 167 ─────────────────────────────────────────────────────────────────

def test_167_por_conta(client):
    conta1 = make_conta(client, name="Nubank", color="#820AD1")
    conta2 = make_conta(client, name="Inter", color="#FF7A00")
    make_transacao(client, conta1["id"], type="despesa", value="500.00")
    make_transacao(client, conta1["id"], type="receita", value="1000.00")
    make_transacao(client, conta2["id"], type="despesa", value="300.00")
    r = client.get("/graphs/por-conta")
    assert r.status_code == 200, r.text
    data = r.json()
    idx = data["labels"].index("Nubank")
    assert data["datasets"][0]["data"][idx] == 1500.0  # 500+1000 absolute


# ─── TEST 168 ─────────────────────────────────────────────────────────────────

def test_168_por_metodo(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="100.00", payment_method="pix")
    make_transacao(client, conta["id"], type="despesa", value="200.00", payment_method="card")
    r = client.get("/graphs/por-metodo")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "Pix" in data["labels"] or "pix" in [l.lower() for l in data["labels"]]
    assert "Cartão" in data["labels"] or "card" in [l.lower() for l in data["labels"]]


# ─── TEST 169 ─────────────────────────────────────────────────────────────────

def test_169_investimentos_aporte(client):
    conta = make_conta(client)
    tag_inv = make_tag(client, "Tesouro", type="investimento", color="#16A34A")
    make_transacao(client, conta["id"], type="investimento", value="500.00", tag_id=tag_inv["id"])
    r = client.get("/graphs/investimentos/aporte")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "datasets" in data
    dataset_labels = [ds["label"] for ds in data["datasets"]]
    assert "Tesouro" in dataset_labels


# ─── TEST 170 ─────────────────────────────────────────────────────────────────

def test_170_investimentos_acumulado(client):
    conta = make_conta(client)
    tag_inv = make_tag(client, "Ações", type="investimento", color="#2563EB")
    # Two months of investments
    prev_month = (TODAY.replace(day=1) - timedelta(days=1)).replace(day=1)
    make_transacao(client, conta["id"], type="investimento", value="500.00",
                   date_str=str(prev_month), tag_id=tag_inv["id"])
    make_transacao(client, conta["id"], type="investimento", value="500.00",
                   date_str=str(FIRST_OF_MONTH), tag_id=tag_inv["id"])
    r = client.get(f"/graphs/investimentos/acumulado?date_from={prev_month}&date_to={LAST_OF_MONTH}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "datasets" in data
    dataset = next(ds for ds in data["datasets"] if ds["label"] == "Ações")
    values = [v for v in dataset["data"] if v is not None]
    assert values == sorted(values)  # monotonically non-decreasing


# ─── TEST 171 ─────────────────────────────────────────────────────────────────

def test_171_heatmap(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="142.50")
    make_transacao(client, conta["id"], type="despesa", value="38.00")
    r = client.get("/graphs/heatmap")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "dias" in data and "max" in data
    total = sum(d["value"] for d in data["dias"])
    assert abs(total - 180.50) < 0.01
    assert data["max"] >= 142.50


# ─── TEST 172 ─────────────────────────────────────────────────────────────────

def test_172_por_dia_semana(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="100.00")
    r_media = client.get("/graphs/por-dia-semana?agregacao=media")
    r_total = client.get("/graphs/por-dia-semana?agregacao=total")
    assert r_media.status_code == 200
    assert r_total.status_code == 200
    # Both should return 7 labels
    assert len(r_media.json()["labels"]) == 7
    assert len(r_total.json()["labels"]) == 7


# ─── TEST 173 ─────────────────────────────────────────────────────────────────

def test_173_burndown(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="100.00")
    r = client.get("/graphs/burndown")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "labels" in data and "datasets" in data
    current_dataset = next(ds for ds in data["datasets"] if "atual" in ds["label"].lower())
    # Future days should be null
    today_day = TODAY.day
    days_in_month = calendar.monthrange(TODAY.year, TODAY.month)[1]
    if today_day < days_in_month:
        assert current_dataset["data"][-1] is None


# ─── TEST 174 ─────────────────────────────────────────────────────────────────

def test_174_por_dia_mes(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="200.00")
    r = client.get("/graphs/por-dia-mes")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "labels" in data and "datasets" in data
    assert len(data["labels"]) == 31


# ─── TEST 175 ─────────────────────────────────────────────────────────────────

def test_175_granularity_week(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="receita", value="1000.00")
    r = client.get("/graphs/por-mes?granularity=week")
    assert r.status_code == 200
    assert "labels" in r.json()


# ─── TEST 176 ─────────────────────────────────────────────────────────────────

def test_176_default_period(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="100.00")
    # Also create one outside current month
    old_date = date(2020, 1, 15)
    make_transacao(client, conta["id"], type="despesa", value="9999.00", date_str=str(old_date))
    r = client.get("/graphs/resumo")
    assert r.status_code == 200, r.text
    data = r.json()
    # Only current month transactions counted
    assert data["despesas"] == 100.0


# ─── TEST 177 ─────────────────────────────────────────────────────────────────

def test_177_run_rate(client):
    conta = make_conta(client)
    # Spend 100 on day 1
    make_transacao(client, conta["id"], type="despesa", value="100.00",
                   date_str=str(FIRST_OF_MONTH))
    r = client.get("/graphs/previsao/run-rate")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "gasto_ate_agora" in data
    assert "projecao_fim_mes" in data
    assert data["gasto_ate_agora"] >= 100.0


# ─── TEST 178 ─────────────────────────────────────────────────────────────────

def test_178_media_movel(client):
    conta = make_conta(client)
    tag = make_tag(client, "Alimentação", color="#FF0000")
    make_transacao(client, conta["id"], type="despesa", value="100.00", tag_id=tag["id"])
    r = client.get("/graphs/previsao/media-movel?window=3")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "datasets" in data


# ─── TEST 179 ─────────────────────────────────────────────────────────────────

def test_179_tendencia(client):
    conta = make_conta(client)
    make_transacao(client, conta["id"], type="despesa", value="100.00")
    r = client.get("/graphs/previsao/tendencia")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "projecao" in data
    assert "inclinacao" in data["projecao"]


# ─── TEST 180 ─────────────────────────────────────────────────────────────────

def test_180_orcamento_realizado(client):
    conta = make_conta(client)
    tag = make_tag(client, "Alimentação", color="#FF0000")
    make_orcamento(client, tag["id"], limit_value="1000.00")
    make_transacao(client, conta["id"], type="despesa", value="800.00",
                   date_str=str(FIRST_OF_MONTH), tag_id=tag["id"])
    r = client.get(f"/graphs/orcamento/realizado?year={TODAY.year}&month={TODAY.month}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "datasets" in data
    labels_in_ds = [ds["label"] for ds in data["datasets"]]
    assert "Orçado" in labels_in_ds
    assert "Realizado" in labels_in_ds


# ─── TEST 181 ─────────────────────────────────────────────────────────────────

def test_181_orcamento_progresso(client):
    conta = make_conta(client)
    tag_ok = make_tag(client, "Transporte", color="#0000FF")
    tag_atencao = make_tag(client, "Alimentação", color="#FF0000")
    tag_estourado = make_tag(client, "Lazer", color="#FFFF00")
    make_orcamento(client, tag_ok["id"], limit_value="1000.00")
    make_orcamento(client, tag_atencao["id"], limit_value="1000.00")
    make_orcamento(client, tag_estourado["id"], limit_value="1000.00")
    # ok: <70% = 500
    make_transacao(client, conta["id"], type="despesa", value="500.00", tag_id=tag_ok["id"], date_str=str(FIRST_OF_MONTH))
    # atencao: 70-99% = 800
    make_transacao(client, conta["id"], type="despesa", value="800.00", tag_id=tag_atencao["id"], date_str=str(FIRST_OF_MONTH))
    # estourado: >=100% = 1200
    make_transacao(client, conta["id"], type="despesa", value="1200.00", tag_id=tag_estourado["id"], date_str=str(FIRST_OF_MONTH))
    r = client.get(f"/graphs/orcamento/progresso?year={TODAY.year}&month={TODAY.month}")
    assert r.status_code == 200, r.text
    data = r.json()
    statuses = {item["tag"]: item["status"] for item in data["itens"]}
    assert statuses["Transporte"] == "ok"
    assert statuses["Alimentação"] == "atencao"
    assert statuses["Lazer"] == "estourado"


# ─── TEST 182 ─────────────────────────────────────────────────────────────────

def test_182_orcamento_alerta_estouro(client):
    conta = make_conta(client)
    tag = make_tag(client, "Lazer", color="#FFFF00")
    make_orcamento(client, tag["id"], limit_value="500.00")
    # Already spent 400 with 10 days in — will project over 500
    make_transacao(client, conta["id"], type="despesa", value="400.00",
                   date_str=str(FIRST_OF_MONTH), tag_id=tag["id"])
    r = client.get(f"/graphs/orcamento/alerta-estouro?year={TODAY.year}&month={TODAY.month}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "alertas" in data
    # Result depends on when in month we are, just check structure
    for alerta in data["alertas"]:
        assert "tag" in alerta
        assert "projecao_fim_mes" in alerta
