from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.kpi import KpiDefinition
from app.schemas.kpi import KpiDefinitionCreate, KpiDefinitionUpdate


def list_kpis(db: Session, active_only: bool = False) -> list[KpiDefinition]:
    query = select(KpiDefinition).order_by(KpiDefinition.category, KpiDefinition.metric)
    if active_only:
        query = query.where(KpiDefinition.is_active.is_(True))
    return list(db.scalars(query))


def create_kpi(db: Session, kpi: KpiDefinitionCreate) -> KpiDefinition:
    db_kpi = KpiDefinition(**kpi.model_dump())
    db.add(db_kpi)
    db.commit()
    db.refresh(db_kpi)
    return db_kpi


def update_kpi(db: Session, kpi_id: int, kpi: KpiDefinitionUpdate) -> KpiDefinition:
    db_kpi = db.get(KpiDefinition, kpi_id)
    if db_kpi is None:
        raise HTTPException(status_code=404, detail="KPI definition not found")

    for field, value in kpi.model_dump(exclude_unset=True).items():
        setattr(db_kpi, field, value)

    db.commit()
    db.refresh(db_kpi)
    return db_kpi


def delete_kpi(db: Session, kpi_id: int) -> None:
    db_kpi = db.get(KpiDefinition, kpi_id)
    if db_kpi is None:
        raise HTTPException(status_code=404, detail="KPI definition not found")
    db_kpi.is_active = False
    db.commit()
