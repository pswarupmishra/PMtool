from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_phase import ProjectPhase
from app.schemas.project_phase import ProjectPhaseCreate, ProjectPhaseUpdate


def list_project_phases(
    db: Session,
    project_id: Optional[int] = None,
    active_only: bool = False,
) -> list[ProjectPhase]:
    query = select(ProjectPhase).order_by(ProjectPhase.sort_order, ProjectPhase.name)
    if project_id is not None:
        query = query.where(ProjectPhase.project_id == project_id)
    if active_only:
        query = query.where(ProjectPhase.is_active.is_(True))
    return list(db.scalars(query))


def create_project_phase(db: Session, phase: ProjectPhaseCreate) -> ProjectPhase:
    if db.get(Project, phase.project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db_phase = ProjectPhase(**phase.model_dump())
    db.add(db_phase)
    db.commit()
    db.refresh(db_phase)
    return db_phase


def update_project_phase(db: Session, phase_id: int, phase: ProjectPhaseUpdate) -> ProjectPhase:
    db_phase = db.get(ProjectPhase, phase_id)
    if db_phase is None:
        raise HTTPException(status_code=404, detail="Project phase not found")
    for field, value in phase.model_dump(exclude_unset=True).items():
        setattr(db_phase, field, value)
    db.commit()
    db.refresh(db_phase)
    return db_phase


def delete_project_phase(db: Session, phase_id: int) -> None:
    db_phase = db.get(ProjectPhase, phase_id)
    if db_phase is None:
        raise HTTPException(status_code=404, detail="Project phase not found")
    db_phase.is_active = False
    db.commit()
