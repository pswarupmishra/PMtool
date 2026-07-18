from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.kpi import KpiDefinitionCreate, KpiDefinitionRead, KpiDefinitionUpdate
from app.services import kpi_service

router = APIRouter()


@router.get("/", response_model=list[KpiDefinitionRead])
def list_kpis(active_only: bool = False, db: Session = Depends(get_db)):
    return kpi_service.list_kpis(db, active_only)


@router.post("/", response_model=KpiDefinitionRead, status_code=201)
def create_kpi(kpi: KpiDefinitionCreate, db: Session = Depends(get_db)):
    return kpi_service.create_kpi(db, kpi)


@router.patch("/{kpi_id}", response_model=KpiDefinitionRead)
def update_kpi(kpi_id: int, kpi: KpiDefinitionUpdate, db: Session = Depends(get_db)):
    return kpi_service.update_kpi(db, kpi_id, kpi)


@router.delete("/{kpi_id}", status_code=204)
def delete_kpi(kpi_id: int, db: Session = Depends(get_db)):
    kpi_service.delete_kpi(db, kpi_id)
    return Response(status_code=204)
