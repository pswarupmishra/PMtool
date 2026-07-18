import { useEffect, useMemo, useState } from "react";

import { apiGet } from "../../lib/api/client";

type ProjectConfig = {
  id: number;
  name: string;
};

type ProjectPhaseConfig = {
  id: number;
  name: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type ProgressMonitorPageProps = {
  weekStart: string;
};

const dayMs = 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(parseDate(value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pct(date: Date, min: Date, max: Date) {
  const range = max.getTime() - min.getTime() || dayMs;
  return clamp(((date.getTime() - min.getTime()) / range) * 100, 0, 100);
}

export function ProgressMonitorPage({ weekStart }: ProgressMonitorPageProps) {
  const [projectName, setProjectName] = useState("Project");
  const [phases, setPhases] = useState<ProjectPhaseConfig[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    async function loadProgressData() {
      setStatus("loading");
      const projects = await apiGet<ProjectConfig[]>("/api/v1/projects/");
      const project = projects[0];
      if (!project) {
        setStatus("empty");
        return;
      }

      const phaseData = await apiGet<ProjectPhaseConfig[]>(
        `/api/v1/project-phases/?project_id=${project.id}&active_only=true`,
      );
      setProjectName(project.name);
      setPhases(phaseData.sort((a, b) => a.sort_order - b.sort_order));
      setStatus(phaseData.length ? "ready" : "empty");
    }

    loadProgressData().catch(() => setStatus("empty"));
  }, []);

  const datedPhases = phases.filter((phase) => phase.start_date && phase.end_date);
  const effectiveWeekStart = weekStart || new Date().toISOString().slice(0, 10);
  const currentWeek = parseDate(effectiveWeekStart);
  const timeline = useMemo(() => {
    if (!datedPhases.length) return null;
    const starts = datedPhases.map((phase) => parseDate(phase.start_date as string).getTime());
    const ends = datedPhases.map((phase) => parseDate(phase.end_date as string).getTime());
    const min = new Date(Math.min(...starts, currentWeek.getTime()));
    const max = new Date(Math.max(...ends, currentWeek.getTime()));
    return { min, max };
  }, [currentWeek, datedPhases]);

  const ongoingPhase = datedPhases.find((phase) => {
    const start = parseDate(phase.start_date as string);
    const end = parseDate(phase.end_date as string);
    return currentWeek >= start && currentWeek <= end;
  });

  return (
    <section className="panel progress-monitor">
      <div className="section-heading">
        <div>
          <p>Phase execution</p>
          <h2>Progress Monitor</h2>
        </div>
        <div className="catalog-status">
          <strong>{formatDate(effectiveWeekStart)}</strong>
          <span>{ongoingPhase ? `${ongoingPhase.name} ongoing` : "No active phase this week"}</span>
        </div>
      </div>

      <div className="progress-summary">
        <div>
          <span>Project</span>
          <strong>{projectName}</strong>
        </div>
        <div>
          <span>Configured phases</span>
          <strong>{phases.length}</strong>
        </div>
        <div>
          <span>Current phase</span>
          <strong>{ongoingPhase?.name ?? "-"}</strong>
        </div>
      </div>

      {status === "loading" ? <div className="empty-state">Loading progress timeline</div> : null}
      {status === "empty" || (status === "ready" && !timeline) ? (
        <div className="empty-state">Configure phase start and end dates to view the Gantt chart.</div>
      ) : null}

      {timeline ? (
        <div className="gantt-wrap">
          <div className="gantt-scale">
            <span>{formatDate(timeline.min.toISOString().slice(0, 10))}</span>
            <span>{formatDate(effectiveWeekStart)}</span>
            <span>{formatDate(timeline.max.toISOString().slice(0, 10))}</span>
          </div>
          <div className="gantt-chart">
            <span
              className="gantt-today-line"
              style={{ left: `${pct(currentWeek, timeline.min, timeline.max)}%` }}
            />
            {phases.map((phase) => {
              const hasDates = Boolean(phase.start_date && phase.end_date);
              const start = hasDates ? parseDate(phase.start_date as string) : null;
              const end = hasDates ? parseDate(phase.end_date as string) : null;
              const isOngoing = Boolean(start && end && currentWeek >= start && currentWeek <= end);
              const left = start ? pct(start, timeline.min, timeline.max) : 0;
              const width = start && end ? Math.max(pct(end, timeline.min, timeline.max) - left, 2) : 0;
              const elapsed =
                start && end ? clamp(((currentWeek.getTime() - start.getTime()) / ((end.getTime() - start.getTime()) || dayMs)) * 100, 0, 100) : 0;

              return (
                <div className={isOngoing ? "gantt-row gantt-row-active" : "gantt-row"} key={phase.id}>
                  <div className="gantt-phase-name">
                    <strong>{phase.name}</strong>
                    <span>{formatDate(phase.start_date)} - {formatDate(phase.end_date)}</span>
                  </div>
                  <div className="gantt-track">
                    {hasDates ? (
                      <div className="gantt-bar" style={{ left: `${left}%`, width: `${width}%` }}>
                        <span style={{ width: `${elapsed}%` }} />
                      </div>
                    ) : (
                      <span className="gantt-missing-dates">Dates pending</span>
                    )}
                  </div>
                  <span className={isOngoing ? "status-pill status-pill-green" : "status-pill"}>
                    {isOngoing ? "Ongoing" : currentWeek > (end ?? currentWeek) ? "Done" : "Planned"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
