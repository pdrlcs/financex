from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (ensure models are registered on Base.metadata)
from app.logging_config import setup_logging
from app.routers import configs, contas, graphs, orcamentos, tags, transacoes

setup_logging()

app = FastAPI(title="Gestor Financex")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tags.router)
app.include_router(contas.router)
app.include_router(transacoes.router)
app.include_router(orcamentos.router)
app.include_router(configs.router)
app.include_router(graphs.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
