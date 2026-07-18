from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.settings import settings
from app.db.base import Base
from app.db.schema import ensure_runtime_columns
from app.db.session import SessionLocal, engine
from app.services.seed_service import seed_defaults

Base.metadata.create_all(bind=engine)
ensure_runtime_columns()
with SessionLocal() as db:
    seed_defaults(db)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
