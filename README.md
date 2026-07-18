# PM Dashboard

A product management dashboard with a FastAPI backend, SQLite database, and React frontend.

## Project Structure

- `backend`: FastAPI app, SQLite models, API routes, services, and backend tests.
- `frontend`: React app, UI components, feature modules, API client, and frontend tests.
- `docs`: Product notes, architecture decisions, and setup docs.
- `data`: Local database files and seed data.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

Key endpoints:

- `GET /api/v1/kpis`: KPI configuration and weightage.
- `PATCH /api/v1/kpis/{kpi_id}`: Update KPI weight, trend direction, formula, or active status.
- `GET /api/v1/weekly-entries?project_id=1`: Weekly PM-entered KPI values.
- `POST /api/v1/weekly-entries`: Create or update one weekly KPI submission. PMs can submit `component_values`; the API calculates the KPI value from the configured formula components.
- `GET /api/v1/dashboard/projects/1/health`: Weighted project health, dimension scores, and KPI trends.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## KPI Health Logic

Each KPI has an expected trend:

- `positive`: latest value should be greater than or equal to the prior week.
- `negative`: latest value should be less than or equal to the prior week.
- `equal`: latest value should stay unchanged.

The dashboard marks weekly KPI movement green or red, then calculates project health from the configured KPI weightage.

Weekly entry is phase-wise. Each KPI belongs to a phase, and each formula exposes its input components, for example `Actual` and `Planned` for `Actual / Planned`.
