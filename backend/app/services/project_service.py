from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.metadata_lock_service import has_project_weekly_entries


def list_projects(db: Session) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.id)))


def create_project(db: Session, project: ProjectCreate) -> Project:
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project(db: Session, project_id: int, project: ProjectUpdate) -> Project:
    db_project = db.get(Project, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if has_project_weekly_entries(db, project_id):
        raise HTTPException(
            status_code=409,
            detail="Project metadata is locked because weekly KPI entries already exist for this project.",
        )

    for field, value in project.model_dump(exclude_unset=True).items():
        setattr(db_project, field, value)

    db.commit()
    db.refresh(db_project)
    return db_project
