from fastapi import APIRouter

from app.api.v1.routes import dashboard, health_dimensions, kpis, project_phases, projects, tasks, weekly_entries

api_router = APIRouter()
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(health_dimensions.router, prefix="/health-dimensions", tags=["health dimensions"])
api_router.include_router(kpis.router, prefix="/kpis", tags=["kpis"])
api_router.include_router(project_phases.router, prefix="/project-phases", tags=["project phases"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(weekly_entries.router, prefix="/weekly-entries", tags=["weekly entries"])
