from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_dimension import HealthDimension
from app.schemas.health_dimension import HealthDimensionCreate, HealthDimensionUpdate


def list_health_dimensions(db: Session, active_only: bool = False) -> list[HealthDimension]:
    query = select(HealthDimension).order_by(HealthDimension.name)
    if active_only:
        query = query.where(HealthDimension.is_active.is_(True))
    return list(db.scalars(query))


def create_health_dimension(db: Session, dimension: HealthDimensionCreate) -> HealthDimension:
    db_dimension = HealthDimension(**dimension.model_dump())
    db.add(db_dimension)
    db.commit()
    db.refresh(db_dimension)
    return db_dimension


def update_health_dimension(
    db: Session,
    dimension_id: int,
    dimension: HealthDimensionUpdate,
) -> HealthDimension:
    db_dimension = db.get(HealthDimension, dimension_id)
    if db_dimension is None:
        raise HTTPException(status_code=404, detail="Health dimension not found")

    for field, value in dimension.model_dump(exclude_unset=True).items():
        setattr(db_dimension, field, value)

    db.commit()
    db.refresh(db_dimension)
    return db_dimension


def delete_health_dimension(db: Session, dimension_id: int) -> None:
    db_dimension = db.get(HealthDimension, dimension_id)
    if db_dimension is None:
        raise HTTPException(status_code=404, detail="Health dimension not found")
    db_dimension.is_active = False
    db.commit()
