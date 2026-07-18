import { useEffect, useMemo, useState } from "react";

import { apiDelete, apiGet, apiSend } from "../../lib/api/client";
import { phaseOrder, type ProjectPhase, type TrendDirection } from "./dashboardData";

type ProjectConfig = {
  id: number;
  name: string;
  owner: string;
  location: string;
  vendor: string;
  project_type: string;
  status: string;
};

type HealthDimension = {
  id: number;
  name: string;
  description: string;
  score_percent: number | null;
  is_active: boolean;
};

type ProjectPhaseConfig = {
  id: number;
  project_id: number;
  name: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type ApiKpi = {
  id: number;
  code: string;
  category: string;
  metric: string;
  formula: string;
  formula_components: Array<{ key: string; label: string; role: string }>;
  metric_type: string;
  phase: ProjectPhase;
  health_dimension: string;
  expected_trend: TrendDirection;
  threshold: number | null;
  monitor_period_weeks: number | null;
  weight: number;
  is_leading_indicator: boolean;
  is_active: boolean;
};

type KpiDraft = Omit<ApiKpi, "id" | "code" | "formula_components">;

const emptyKpi: KpiDraft = {
  category: "",
  metric: "",
  formula: "",
  metric_type: "",
  phase: "Requirement Analysis" as ProjectPhase,
  health_dimension: "",
  expected_trend: "positive" as TrendDirection,
  threshold: null,
  monitor_period_weeks: 3,
  weight: 5,
  is_leading_indicator: true,
  is_active: true,
};

function codeFromMetric(metric: string) {
  return metric
    .toLowerCase()
    .replace("%", "percent")
    .replace("/", " ")
    .replace("&", "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function componentsForFormula(formula: string) {
  if (formula.includes("/")) {
    const [left, right] = formula.split("/", 2).map((item) => item.trim());
    return [
      { key: codeFromMetric(left), label: left, role: "numerator" },
      { key: codeFromMetric(right), label: right, role: "denominator" },
    ];
  }
  return [{ key: codeFromMetric(formula), label: formula, role: formula.toLowerCase().includes("day") ? "days" : "value" }];
}

type ConfigurationPageProps = {
  onKpisChanged?: () => void;
};

export function ConfigurationPage({ onKpisChanged }: ConfigurationPageProps) {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [projectPhases, setProjectPhases] = useState<ProjectPhaseConfig[]>([]);
  const [dimensions, setDimensions] = useState<HealthDimension[]>([]);
  const [kpis, setKpis] = useState<ApiKpi[]>([]);
  const [newDimension, setNewDimension] = useState({ name: "", description: "", score_percent: "" });
  const [newPhase, setNewPhase] = useState({ name: "", sort_order: 1, start_date: "", end_date: "" });
  const [newKpi, setNewKpi] = useState(emptyKpi);
  const [selectedKpiPhase, setSelectedKpiPhase] = useState<ProjectPhase>("Requirement Analysis");
  const [selectedHealthDimension, setSelectedHealthDimension] = useState("all");
  const [resetStartDate, setResetStartDate] = useState("");
  const [resetEndDate, setResetEndDate] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  const selectedProject = projects[0];
  const activeDimensions = useMemo(() => dimensions.filter((dimension) => dimension.is_active), [dimensions]);
  const activeProjectPhases = useMemo(
    () => projectPhases.filter((phase) => phase.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [projectPhases],
  );
  const configuredPhaseNames = useMemo(
    () => activeProjectPhases.map((phase) => phase.name),
    [activeProjectPhases],
  );
  const visiblePhases = configuredPhaseNames.length ? configuredPhaseNames : phaseOrder;
  const kpiPhaseCounts = useMemo(
    () =>
      visiblePhases.map((phase) => ({
        phase,
        count: kpis.filter((kpi) => kpi.phase === phase).length,
      })),
    [kpis, visiblePhases],
  );
  const selectedPhaseKpis = useMemo(
    () =>
      kpis.filter(
        (kpi) =>
          kpi.phase === selectedKpiPhase &&
          (selectedHealthDimension === "all" || kpi.health_dimension === selectedHealthDimension),
      ),
    [kpis, selectedKpiPhase, selectedHealthDimension],
  );
  const healthDimensionCounts = useMemo(
    () =>
      activeDimensions.map((dimension) => ({
        name: dimension.name,
        count: kpis.filter((kpi) => kpi.health_dimension === dimension.name).length,
        phaseCount: kpis.filter(
          (kpi) => kpi.phase === selectedKpiPhase && kpi.health_dimension === dimension.name,
        ).length,
      })),
    [activeDimensions, kpis, selectedKpiPhase],
  );

  useEffect(() => {
    refreshConfig();
  }, []);

  async function refreshConfig() {
    const [projectData, dimensionData, kpiData] = await Promise.all([
      apiGet<ProjectConfig[]>("/api/v1/projects/"),
      apiGet<HealthDimension[]>("/api/v1/health-dimensions/"),
      apiGet<ApiKpi[]>("/api/v1/kpis/?active_only=true"),
    ]);
    const phaseData = projectData[0]
      ? await apiGet<ProjectPhaseConfig[]>(`/api/v1/project-phases/?project_id=${projectData[0].id}&active_only=false`).catch(() => [])
      : [];
    setProjects(projectData);
    setProjectPhases(phaseData);
    setDimensions(dimensionData);
    setKpis(kpiData);
        setNewKpi((current) => ({
      ...current,
      health_dimension: current.health_dimension || dimensionData[0]?.name || "",
      phase: selectedKpiPhase,
    }));
  }

  async function saveProject(project: ProjectConfig) {
    const updated = await apiSend<ProjectConfig>(`/api/v1/projects/${project.id}`, "PATCH", project);
    setProjects((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function addDimension() {
    if (!newDimension.name.trim()) {
      return;
    }
    const created = await apiSend<HealthDimension>("/api/v1/health-dimensions/", "POST", {
      name: newDimension.name,
      description: newDimension.description,
      score_percent: newDimension.score_percent === "" ? null : Number(newDimension.score_percent),
      is_active: true,
    });
    setDimensions((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setNewDimension({ name: "", description: "", score_percent: "" });
  }

  async function updateDimension(dimension: HealthDimension) {
    const updated = await apiSend<HealthDimension>(`/api/v1/health-dimensions/${dimension.id}`, "PATCH", dimension);
    setDimensions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function deleteDimension(dimensionId: number) {
    await apiDelete(`/api/v1/health-dimensions/${dimensionId}`);
    setDimensions((current) =>
      current.map((item) => (item.id === dimensionId ? { ...item, is_active: false } : item)),
    );
  }

  async function addPhase() {
    if (!selectedProject || !newPhase.name.trim()) {
      return;
    }
    const created = await apiSend<ProjectPhaseConfig>("/api/v1/project-phases/", "POST", {
      project_id: selectedProject.id,
      name: newPhase.name,
      sort_order: newPhase.sort_order,
      start_date: newPhase.start_date || null,
      end_date: newPhase.end_date || null,
      is_active: true,
    });
    setProjectPhases((current) => [...current, created].sort((a, b) => a.sort_order - b.sort_order));
    setNewPhase({ name: "", sort_order: projectPhases.length + 2, start_date: "", end_date: "" });
  }

  async function updatePhase(phase: ProjectPhaseConfig) {
    const updated = await apiSend<ProjectPhaseConfig>(`/api/v1/project-phases/${phase.id}`, "PATCH", phase);
    setProjectPhases((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.sort_order - b.sort_order),
    );
  }

  async function deletePhase(phaseId: number) {
    await apiDelete(`/api/v1/project-phases/${phaseId}`);
    setProjectPhases((current) =>
      current.map((item) => (item.id === phaseId ? { ...item, is_active: false } : item)),
    );
  }

  async function addKpi() {
    if (!newKpi.metric.trim() || !newKpi.formula.trim() || !newKpi.health_dimension) {
      return;
    }
    const payload = {
      ...newKpi,
      phase: selectedKpiPhase,
      code: codeFromMetric(newKpi.metric),
      formula_components: componentsForFormula(newKpi.formula),
    };
    const created = await apiSend<ApiKpi>("/api/v1/kpis/", "POST", payload);
    setKpis((current) => [...current, created]);
    setNewKpi({ ...emptyKpi, phase: selectedKpiPhase, health_dimension: activeDimensions[0]?.name || "" });
    onKpisChanged?.();
  }

  async function updateKpi(kpi: ApiKpi) {
    const updated = await apiSend<ApiKpi>(`/api/v1/kpis/${kpi.id}`, "PATCH", {
      ...kpi,
      formula_components: componentsForFormula(kpi.formula),
    });
    setKpis((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    onKpisChanged?.();
  }

  async function deleteKpi(kpiId: number) {
    await apiDelete(`/api/v1/kpis/${kpiId}`);
    setKpis((current) => current.filter((item) => item.id !== kpiId));
    onKpisChanged?.();
  }

  async function deleteWeeklyInputs(scope: "all" | "period") {
    if (!selectedProject) {
      return;
    }
    if (scope === "period" && (!resetStartDate || !resetEndDate)) {
      setResetStatus("Select both start and end dates before deleting weekly inputs.");
      return;
    }
    if (scope === "period" && resetStartDate > resetEndDate) {
      setResetStatus("Start date must be before end date.");
      return;
    }

    const scopeLabel = scope === "all"
      ? `ALL weekly inputs for ${selectedProject.name}`
      : `weekly inputs from ${resetStartDate} to ${resetEndDate} for ${selectedProject.name}`;
    const confirmed = window.confirm(`Double check: this will permanently delete ${scopeLabel}. Do you want to continue?`);
    if (!confirmed) {
      setResetStatus("Delete cancelled.");
      return;
    }

    const params = new URLSearchParams({ project_id: String(selectedProject.id) });
    if (scope === "period") {
      params.set("start_date", resetStartDate);
      params.set("end_date", resetEndDate);
    }
    await apiDelete(`/api/v1/weekly-entries/?${params.toString()}`);
    setResetStatus(scope === "all" ? "Deleted all weekly inputs." : `Deleted weekly inputs from ${resetStartDate} to ${resetEndDate}.`);
  }

  return (
    <div className="config-page">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>Project setup</p>
            <h2>Project metadata</h2>
          </div>
        </div>
        <div className="config-grid">
          {projects.map((project) => (
            <article className="config-card" key={project.id}>
              <label>
                Project name
                <input value={project.name} onChange={(event) => setProjects(projects.map((item) => item.id === project.id ? { ...item, name: event.target.value } : item))} />
              </label>
              <label>
                PM / owner
                <input value={project.owner} onChange={(event) => setProjects(projects.map((item) => item.id === project.id ? { ...item, owner: event.target.value } : item))} />
              </label>
              <label>
                Location
                <input value={project.location} onChange={(event) => setProjects(projects.map((item) => item.id === project.id ? { ...item, location: event.target.value } : item))} />
              </label>
              <label>
                Vendor
                <input value={project.vendor} onChange={(event) => setProjects(projects.map((item) => item.id === project.id ? { ...item, vendor: event.target.value } : item))} />
              </label>
              <label>
                Project type
                <input value={project.project_type} onChange={(event) => setProjects(projects.map((item) => item.id === project.id ? { ...item, project_type: event.target.value } : item))} />
              </label>
              <button type="button" onClick={() => saveProject(project)}>Save project</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>Project lifecycle</p>
            <h2>Phase configuration</h2>
          </div>
          <div className="catalog-status">
            <strong>{activeProjectPhases.length} Phases</strong>
            <span>{selectedProject?.name ?? "No project selected"}</span>
          </div>
        </div>
        <div className="add-row phase-add-row">
          <input
            placeholder="Phase name"
            value={newPhase.name}
            onChange={(event) => setNewPhase({ ...newPhase, name: event.target.value })}
          />
          <input
            aria-label="Phase sort order"
            inputMode="numeric"
            value={newPhase.sort_order}
            onChange={(event) => setNewPhase({ ...newPhase, sort_order: Number(event.target.value || 0) })}
          />
          <input
            aria-label="Phase start date"
            type="date"
            value={newPhase.start_date}
            onChange={(event) => setNewPhase({ ...newPhase, start_date: event.target.value })}
          />
          <input
            aria-label="Phase end date"
            type="date"
            value={newPhase.end_date}
            onChange={(event) => setNewPhase({ ...newPhase, end_date: event.target.value })}
          />
          <button type="button" onClick={addPhase}>Add phase</button>
        </div>
        <div className="phase-grid-wrap">
          <div className="phase-grid" role="table" aria-label="Project phase configuration">
            <div className="phase-grid-header" role="row">
              <span>Phase</span>
              <span>Order</span>
              <span>Start date</span>
              <span>End date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {projectPhases.map((phase) => (
              <div className={phase.is_active ? "phase-grid-row" : "phase-grid-row disabled-row"} key={phase.id} role="row">
                <input
                  aria-label={`${phase.name} phase name`}
                  value={phase.name}
                  onChange={(event) =>
                    setProjectPhases(projectPhases.map((item) => item.id === phase.id ? { ...item, name: event.target.value } : item))
                  }
                />
                <input
                  aria-label={`${phase.name} sort order`}
                  inputMode="numeric"
                  value={phase.sort_order}
                  onChange={(event) =>
                  setProjectPhases(projectPhases.map((item) => item.id === phase.id ? { ...item, sort_order: Number(event.target.value || 0) } : item))
                  }
                />
                <input
                  aria-label={`${phase.name} start date`}
                  type="date"
                  value={phase.start_date ?? ""}
                  onChange={(event) =>
                    setProjectPhases(projectPhases.map((item) => item.id === phase.id ? { ...item, start_date: event.target.value || null } : item))
                  }
                />
                <input
                  aria-label={`${phase.name} end date`}
                  type="date"
                  value={phase.end_date ?? ""}
                  onChange={(event) =>
                    setProjectPhases(projectPhases.map((item) => item.id === phase.id ? { ...item, end_date: event.target.value || null } : item))
                  }
                />
                <span className={phase.is_active ? "status-pill status-pill-green" : "status-pill status-pill-red"}>
                  {phase.is_active ? "Active" : "Inactive"}
                </span>
                <div className="row-actions">
                  <button type="button" onClick={() => updatePhase(phase)}>Update</button>
                  <button className="danger-button" type="button" onClick={() => deletePhase(phase.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>Health model</p>
            <h2>Health dimensions</h2>
          </div>
        </div>
        <div className="add-row">
          <input placeholder="Dimension name" value={newDimension.name} onChange={(event) => setNewDimension({ ...newDimension, name: event.target.value })} />
          <input placeholder="Description" value={newDimension.description} onChange={(event) => setNewDimension({ ...newDimension, description: event.target.value })} />
          <input
            min="0"
            max="100"
            placeholder="Score %"
            type="number"
            value={newDimension.score_percent}
            onChange={(event) => setNewDimension({ ...newDimension, score_percent: event.target.value })}
          />
          <button type="button" onClick={addDimension}>Add dimension</button>
        </div>
        <div className="dimension-config-list">
          <div className="dimension-config-header" role="row">
            <span>Name</span>
            <span>Description</span>
            <span>Score %</span>
            <span>Actions</span>
          </div>
          {dimensions.map((dimension) => (
            <article className={dimension.is_active ? "dimension-config-row" : "dimension-config-row disabled-row"} key={dimension.id}>
              <input value={dimension.name} onChange={(event) => setDimensions(dimensions.map((item) => item.id === dimension.id ? { ...item, name: event.target.value } : item))} />
              <input value={dimension.description} onChange={(event) => setDimensions(dimensions.map((item) => item.id === dimension.id ? { ...item, description: event.target.value } : item))} />
              <input
                aria-label={`${dimension.name} score percent`}
                min="0"
                max="100"
                type="number"
                value={dimension.score_percent ?? ""}
                onChange={(event) =>
                  setDimensions(dimensions.map((item) => item.id === dimension.id ? { ...item, score_percent: event.target.value === "" ? null : Number(event.target.value) } : item))
                }
              />
              <button type="button" onClick={() => updateDimension(dimension)}>Update</button>
              <button className="danger-button" type="button" onClick={() => deleteDimension(dimension.id)}>Delete</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>KPI configuration</p>
            <h2>Add, update, delete KPIs</h2>
          </div>
          <div className="catalog-status">
            <strong>{kpis.length} KPIs</strong>
            <span>Active configuration</span>
          </div>
        </div>
        <div className="phase-tabs config-phase-tabs" role="tablist" aria-label="KPI configuration phase selector">
          {kpiPhaseCounts.map((item) => (
            <button
              aria-selected={selectedKpiPhase === item.phase}
              className={selectedKpiPhase === item.phase ? "phase-tab phase-tab-active" : "phase-tab"}
              key={item.phase}
              onClick={() => {
                setSelectedKpiPhase(item.phase);
                setNewKpi((current) => ({ ...current, phase: item.phase }));
              }}
              type="button"
            >
              {item.phase}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
        <div className="kpi-config-layout">
          <aside className="dimension-filter-box">
            <button
              className={selectedHealthDimension === "all" ? "dimension-filter-item active" : "dimension-filter-item"}
              onClick={() => {
                setSelectedHealthDimension("all");
                setNewKpi((current) => ({ ...current, health_dimension: activeDimensions[0]?.name || "" }));
              }}
              type="button"
            >
              <span>All dimensions</span>
              <strong>{kpis.filter((kpi) => kpi.phase === selectedKpiPhase).length}</strong>
            </button>
            {healthDimensionCounts.map((dimension) => (
              <button
                className={selectedHealthDimension === dimension.name ? "dimension-filter-item active" : "dimension-filter-item"}
                key={dimension.name}
                onClick={() => {
                  setSelectedHealthDimension(dimension.name);
                  setNewKpi((current) => ({ ...current, health_dimension: dimension.name }));
                }}
                type="button"
              >
                <span>{dimension.name}</span>
                <strong>{dimension.phaseCount}</strong>
                <small>{dimension.count} total</small>
              </button>
            ))}
          </aside>

          <div className="kpi-config-main">
            <div className="kpi-config-add">
              <input placeholder="Category" value={newKpi.category} onChange={(event) => setNewKpi({ ...newKpi, category: event.target.value })} />
              <input placeholder="Metric" value={newKpi.metric} onChange={(event) => setNewKpi({ ...newKpi, metric: event.target.value })} />
              <input placeholder="Formula" value={newKpi.formula} onChange={(event) => setNewKpi({ ...newKpi, formula: event.target.value })} />
              <input placeholder="Type" value={newKpi.metric_type} onChange={(event) => setNewKpi({ ...newKpi, metric_type: event.target.value })} />
              <input aria-label="Selected KPI phase" readOnly value={selectedKpiPhase} />
              <select value={newKpi.health_dimension} onChange={(event) => setNewKpi({ ...newKpi, health_dimension: event.target.value })}>
                {activeDimensions.map((dimension) => <option key={dimension.id}>{dimension.name}</option>)}
              </select>
              <select value={newKpi.expected_trend} onChange={(event) => setNewKpi({ ...newKpi, expected_trend: event.target.value as TrendDirection })}>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="equal">Equal</option>
              </select>
              <input
                aria-label="KPI threshold"
                inputMode="decimal"
                placeholder="Threshold"
                value={newKpi.threshold ?? ""}
                onChange={(event) => setNewKpi({ ...newKpi, threshold: event.target.value === "" ? null : Number(event.target.value) })}
              />
              <input
                aria-label="KPI monitor period weeks"
                inputMode="numeric"
                placeholder="Monitor period (week)"
                value={newKpi.monitor_period_weeks ?? ""}
                onChange={(event) => setNewKpi({ ...newKpi, monitor_period_weeks: event.target.value === "" ? null : Number(event.target.value) })}
              />
              <input aria-label="KPI weight" inputMode="decimal" value={newKpi.weight} onChange={(event) => setNewKpi({ ...newKpi, weight: Number(event.target.value || 0) })} />
              <button type="button" onClick={addKpi}>Add KPI</button>
            </div>

            <div className="kpi-config-table-wrap">
              <table className="kpi-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Formula</th>
                    <th>Phase</th>
                    <th>Health dimension</th>
                    <th>Trend</th>
                    <th>Threshold</th>
                    <th>Monitor period (week)</th>
                    <th>Weight</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPhaseKpis.map((kpi) => (
                    <tr key={kpi.id}>
                      <td><input value={kpi.metric} onChange={(event) => setKpis(kpis.map((item) => item.id === kpi.id ? { ...item, metric: event.target.value } : item))} /></td>
                      <td><input value={kpi.formula} onChange={(event) => setKpis(kpis.map((item) => item.id === kpi.id ? { ...item, formula: event.target.value } : item))} /></td>
                      <td>
                        <select value={kpi.phase} onChange={(event) => setKpis(kpis.map((item) => item.id === kpi.id ? { ...item, phase: event.target.value as ProjectPhase } : item))}>
                          {visiblePhases.map((phase) => <option key={phase}>{phase}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={kpi.health_dimension} onChange={(event) => setKpis(kpis.map((item) => item.id === kpi.id ? { ...item, health_dimension: event.target.value } : item))}>
                          {activeDimensions.map((dimension) => <option key={dimension.id}>{dimension.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={kpi.expected_trend} onChange={(event) => setKpis(kpis.map((item) => item.id === kpi.id ? { ...item, expected_trend: event.target.value as TrendDirection } : item))}>
                          <option value="positive">Positive</option>
                          <option value="negative">Negative</option>
                          <option value="equal">Equal</option>
                        </select>
                      </td>
                      <td>
                        <input
                          inputMode="decimal"
                          value={kpi.threshold ?? ""}
                          onChange={(event) =>
                            setKpis(kpis.map((item) =>
                              item.id === kpi.id
                                ? { ...item, threshold: event.target.value === "" ? null : Number(event.target.value) }
                                : item,
                            ))
                          }
                        />
                      </td>
                      <td>
                        <input
                          inputMode="numeric"
                          value={kpi.monitor_period_weeks ?? ""}
                          onChange={(event) =>
                            setKpis(kpis.map((item) =>
                              item.id === kpi.id
                                ? { ...item, monitor_period_weeks: event.target.value === "" ? null : Number(event.target.value) }
                                : item,
                            ))
                          }
                        />
                      </td>
                      <td><input inputMode="decimal" value={kpi.weight} onChange={(event) => setKpis(kpis.map((item) => item.id === kpi.id ? { ...item, weight: Number(event.target.value || 0) } : item))} /></td>
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => updateKpi(kpi)}>Update</button>
                          <button className="danger-button" type="button" onClick={() => deleteKpi(kpi.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="panel project-reset-panel">
        <div className="section-heading">
          <div>
            <p>Project RESET</p>
            <h2>Weekly input reset</h2>
          </div>
        </div>
        <div className="project-reset-grid">
          <div className="project-reset-card">
            <strong>Delete selected period</strong>
            <span>Remove weekly input records for the selected date range.</span>
            <div className="project-reset-dates">
              <label>
                Start date
                <input type="date" value={resetStartDate} onChange={(event) => setResetStartDate(event.target.value)} />
              </label>
              <label>
                End date
                <input type="date" value={resetEndDate} onChange={(event) => setResetEndDate(event.target.value)} />
              </label>
            </div>
            <button className="danger-button" type="button" onClick={() => deleteWeeklyInputs("period")}>
              Delete selected period
            </button>
          </div>
          <div className="project-reset-card project-reset-danger-card">
            <strong>Delete all weekly input</strong>
            <span>Remove every weekly input record for the selected project.</span>
            <button className="danger-button" type="button" onClick={() => deleteWeeklyInputs("all")}>
              Delete all weekly input
            </button>
          </div>
        </div>
        {resetStatus ? <p className="reset-status">{resetStatus}</p> : null}
      </section>
    </div>
  );
}
