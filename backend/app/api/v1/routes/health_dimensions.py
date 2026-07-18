from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.health_dimension import (
    HealthDimensionCreate,
    HealthDimensionRead,
    HealthDimensionUpdate,
)
from app.services import health_dimension_service

router = APIRouter()


@router.get("/", response_model=list[HealthDimensionRead])
def list_health_dimensions(active_only: bool = False, db: Session = Depends(get_db)):
    return health_dimension_service.list_health_dimensions(db, active_only)


@router.post("/", response_model=HealthDimensionRead, status_code=201)
def create_health_dimension(dimension: HealthDimensionCreate, db: Session = Depends(get_db)):
    return health_dimension_service.create_health_dimension(db, dimension)


@router.patch("/{dimension_id}", response_model=HealthDimensionRead)
def update_health_dimension(
    dimension_id: int,
    dimension: HealthDimensionUpdate,
    db: Session = Depends(get_db),
):
    return health_dimension_service.update_health_dimension(db, dimension_id, dimension)


@router.delete("/{dimension_id}", status_code=204)
def delete_health_dimension(dimension_id: int, db: Session = Depends(get_db)):
    health_dimension_service.delete_health_dimension(db, dimension_id)
    return Response(status_code=204)
