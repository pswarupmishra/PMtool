from sqlalchemy import inspect, text

from app.db.session import engine


def ensure_runtime_columns() -> None:
    inspector = inspect(engine)

    kpi_columns = {column["name"] for column in inspector.get_columns("kpi_definitions")}
    if "formula_components" not in kpi_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE kpi_definitions ADD COLUMN formula_components JSON DEFAULT '[]'"))
    if "threshold" not in kpi_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE kpi_definitions ADD COLUMN threshold FLOAT"))
    if "monitor_period_weeks" not in kpi_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE kpi_definitions ADD COLUMN monitor_period_weeks INTEGER DEFAULT 3"))

    entry_columns = {column["name"] for column in inspector.get_columns("weekly_kpi_entries")}
    if "component_values" not in entry_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE weekly_kpi_entries ADD COLUMN component_values JSON DEFAULT '{}'"))
    if "applicability_status" not in entry_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE weekly_kpi_entries ADD COLUMN applicability_status VARCHAR(30) DEFAULT 'applicable'"))
            connection.execute(text("UPDATE weekly_kpi_entries SET applicability_status = 'applicable' WHERE applicability_status IS NULL"))
    if "applicability_reason" not in entry_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE weekly_kpi_entries ADD COLUMN applicability_reason VARCHAR(500)"))

    project_columns = {column["name"] for column in inspector.get_columns("projects")}
    project_additions = {
        "location": "ALTER TABLE projects ADD COLUMN location VARCHAR(120) DEFAULT ''",
        "vendor": "ALTER TABLE projects ADD COLUMN vendor VARCHAR(120) DEFAULT ''",
        "project_type": "ALTER TABLE projects ADD COLUMN project_type VARCHAR(80) DEFAULT ''",
    }
    with engine.begin() as connection:
            for column, statement in project_additions.items():
                if column not in project_columns:
                    connection.execute(text(statement))

    dimension_columns = {column["name"] for column in inspector.get_columns("health_dimensions")}
    if "score_percent" not in dimension_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE health_dimensions ADD COLUMN score_percent FLOAT"))

    if "project_phases" in inspector.get_table_names():
        phase_columns = {column["name"] for column in inspector.get_columns("project_phases")}
        phase_additions = {
            "start_date": "ALTER TABLE project_phases ADD COLUMN start_date DATE",
            "end_date": "ALTER TABLE project_phases ADD COLUMN end_date DATE",
        }
        with engine.begin() as connection:
            for column, statement in phase_additions.items():
                if column not in phase_columns:
                    connection.execute(text(statement))
