# Backend

FastAPI service for the PM dashboard.

## Layout

- `app/main.py`: FastAPI application entry point.
- `app/core`: Settings and cross-cutting configuration.
- `app/db`: SQLite engine, sessions, and database initialization.
- `app/models`: SQLAlchemy models.
- `app/schemas`: Pydantic request and response schemas.
- `app/api`: Route modules grouped by API version.
- `app/services`: Business logic.
- `tests`: Backend tests.
