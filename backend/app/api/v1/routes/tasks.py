from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.task import TaskCreate, TaskRead
from app.services import task_service

router = APIRouter()


@router.get("/", response_model=list[TaskRead])
def list_tasks(db: Session = Depends(get_db)):
    return task_service.list_tasks(db)


@router.post("/", response_model=TaskRead, status_code=201)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    return task_service.create_task(db, task)
