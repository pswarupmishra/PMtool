from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services import project_service

router = APIRouter()


@router.get("/", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return project_service.list_projects(db)


@router.post("/", response_model=ProjectRead, status_code=201)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    return project_service.create_project(db, project)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)):
    return project_service.update_project(db, project_id, project)
