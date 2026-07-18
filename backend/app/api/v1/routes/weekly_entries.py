from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.schemas.weekly_entry import WeeklyKpiEntryCreate, WeeklyKpiEntryRead
from app.services import weekly_entry_service

router = APIRouter()


@router.get("/", response_model=list[WeeklyKpiEntryRead])
def list_entries(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    return weekly_entry_service.list_entries(db, project_id)


@router.post("/", response_model=WeeklyKpiEntryRead, status_code=201)
def upsert_entry(entry: WeeklyKpiEntryCreate, db: Session = Depends(get_db)):
    return weekly_entry_service.upsert_entry(db, entry)


@router.delete("/")
def delete_entries(
    project_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    deleted_count = weekly_entry_service.delete_entries(db, project_id, start_date, end_date)
    return {"deleted_count": deleted_count}
