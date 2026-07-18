from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dashboard import ProjectHeatmapRead, ProjectHealthRead
from app.services.dashboard_service import get_project_health, get_project_heatmap

router = APIRouter()


@router.get("/projects/{project_id}/health", response_model=ProjectHealthRead)
def project_health(project_id: int, db: Session = Depends(get_db)):
    return get_project_health(db, project_id)


@router.get("/projects/{project_id}/heatmap", response_model=ProjectHeatmapRead)
def project_heatmap(
    project_id: int,
    mode: str = "latest",
    week_start: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return get_project_heatmap(db, project_id, mode, week_start)
