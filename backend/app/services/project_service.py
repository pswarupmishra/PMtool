from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


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

    for field, value in project.model_dump(exclude_unset=True).items():
        setattr(db_project, field, value)

    db.commit()
    db.refresh(db_project)
    return db_project
