# Architecture

Document key technical decisions, data flows, and integration boundaries here.

## Stack

- Backend: FastAPI
- Database: SQLite
- Frontend: React

## Local Flow

The React frontend calls the FastAPI backend over HTTP. FastAPI persists dashboard data to SQLite through SQLAlchemy models. During local development, the database file should live under `data/`.
