from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.project_phase import ProjectPhaseCreate, ProjectPhaseRead, ProjectPhaseUpdate
from app.services import project_phase_service

router = APIRouter()


@router.get("/", response_model=list[ProjectPhaseRead])
def list_project_phases(
    project_id: Optional[int] = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    return project_phase_service.list_project_phases(db, project_id, active_only)


@router.post("/", response_model=ProjectPhaseRead, status_code=201)
def create_project_phase(phase: ProjectPhaseCreate, db: Session = Depends(get_db)):
    return project_phase_service.create_project_phase(db, phase)


@router.patch("/{phase_id}", response_model=ProjectPhaseRead)
def update_project_phase(phase_id: int, phase: ProjectPhaseUpdate, db: Session = Depends(get_db)):
    return project_phase_service.update_project_phase(db, phase_id, phase)


@router.delete("/{phase_id}", status_code=204)
def delete_project_phase(phase_id: int, db: Session = Depends(get_db)):
    project_phase_service.delete_project_phase(db, phase_id)
    return Response(status_code=204)
