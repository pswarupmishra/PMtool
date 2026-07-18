import { useEffect, useMemo, useState } from "react";

import { apiGet, apiSend } from "../../lib/api/client";
import { kpis as fallbackKpis, phaseOrder, type KpiDefinition } from "./dashboardData";

type ComponentValues = Record<string, Record<string, number>>;
type NotesValues = Record<string, string>;

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

type WeeklyEntry = {
  id: number;
  project_id: number;
  kpi_id: number;
  week_start: string;
  value: number;
  component_values: Record<string, number>;
  notes: string | null;
  kpi: {
    id: number;
    code: string;
    phase: string;
  } | null;
};

type WeeklyInputPanelProps = {
  catalogStatus?: "loading" | "api" | "fallback";
  kpis?: KpiDefinition[];
  weekStart: string;
  onWeekStartChange: (weekStart: string) => void;
};

function getDefaultComponentValues(kpis: KpiDefinition[]) {
  return kpis.reduce<ComponentValues>((values, kpi) => {
    const latestValue = kpi.trend[kpi.trend.length - 1].value;
    const numerator = kpi.formulaComponents.find((component) => component.role === "numerator");
    const denominator = kpi.formulaComponents.find((component) => component.role === "denominator");

    if (numerator && denominator) {
      values[kpi.code] = {
        [numerator.key]: latestValue,
        [denominator.key]: 100,
      };
      return values;
    }

    values[kpi.code] = {
      [kpi.formulaComponents[0].key]: latestValue,
    };
    return values;
  }, {});
}

function calculateValue(kpi: KpiDefinition, values: Record<string, number>) {
  const numerator = kpi.formulaComponents.find((component) => component.role === "numerator");
  const denominator = kpi.formulaComponents.find((component) => component.role === "denominator");

  if (numerator && denominator) {
    const denominatorValue = values[denominator.key] || 0;
    if (!denominatorValue) {
      return "0";
    }
    return ((values[numerator.key] / denominatorValue) * 100).toFixed(1);
  }

  return String(values[kpi.formulaComponents[0].key] ?? 0);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function wednesdayForWeek(value: string) {
  const date = parseDate(value);
  const day = date.getDay();
  const diff = day <= 3 ? 3 - day : 10 - day;
  date.setDate(date.getDate() + diff);
  return formatDate(date);
}

function firstWednesdayOnOrAfter(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day <= 3 ? 3 - day : 10 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function formatCalendarLabel(dateText: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(parseDate(dateText));
}

function entryComponentValues(kpi: KpiDefinition, entry?: WeeklyEntry) {
  if (entry?.component_values && Object.keys(entry.component_values).length) {
    return entry.component_values;
  }
  if (!entry) {
    return getDefaultComponentValues([kpi])[kpi.code];
  }
  const numerator = kpi.formulaComponents.find((component) => component.role === "numerator");
  const denominator = kpi.formulaComponents.find((component) => component.role === "denominator");
  if (numerator && denominator) {
    return {
      [numerator.key]: entry.value * 100,
      [denominator.key]: 100,
    };
  }
  return { [kpi.formulaComponents[0].key]: entry.value };
}

export function WeeklyInputPanel({
  catalogStatus = "fallback",
  kpis = fallbackKpis,
  onWeekStartChange,
  weekStart,
}: WeeklyInputPanelProps) {
  const phases = useMemo(() => Array.from(new Set(kpis.map((kpi) => kpi.phase))), [kpis]);
  const orderedPhases = useMemo(() => {
    const ordered = phaseOrder.filter((phase) => phases.includes(phase));
    ordered.push(...phases.filter((phase) => !ordered.includes(phase)));
    return ordered;
  }, [phases]);
  const [selectedPhase, setSelectedPhase] = useState(orderedPhases[0]);
  const [selectedDimension, setSelectedDimension] = useState("all");
  const [componentValues, setComponentValues] = useState<ComponentValues>(() => getDefaultComponentValues(kpis));
  const [notesValues, setNotesValues] = useState<NotesValues>({});
  const [projectId, setProjectId] = useState(1);
  const [projectPhases, setProjectPhases] = useState<ProjectPhaseConfig[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const phaseKpis = kpis.filter(
    (kpi) =>
      kpi.phase === selectedPhase &&
      (selectedDimension === "all" || kpi.healthDimension === selectedDimension),
  );
  const phaseCounts = orderedPhases.map((phase) => ({
    phase,
    count: kpis.filter((kpi) => kpi.phase === phase).length,
  }));
  const dimensions = Array.from(new Set(kpis.map((kpi) => kpi.healthDimension))).sort();
  const dimensionCounts = dimensions.map((dimension) => ({
    name: dimension,
    count: kpis.filter((kpi) => kpi.healthDimension === dimension).length,
    phaseCount: kpis.filter((kpi) => kpi.phase === selectedPhase && kpi.healthDimension === dimension).length,
  }));

  useEffect(() => {
    if (!orderedPhases.includes(selectedPhase)) {
      setSelectedPhase(orderedPhases[0]);
    }
  }, [kpis, orderedPhases, selectedPhase]);

  useEffect(() => {
    apiGet<ProjectConfig[]>("/api/v1/projects/")
      .then(async (projects) => {
        const project = projects[0];
        if (!project) return;
        setProjectId(project.id);
        const [phases, entries] = await Promise.all([
          apiGet<ProjectPhaseConfig[]>(`/api/v1/project-phases/?project_id=${project.id}&active_only=true`),
          apiGet<WeeklyEntry[]>(`/api/v1/weekly-entries/?project_id=${project.id}`),
        ]);
        setProjectPhases(phases.sort((a, b) => a.sort_order - b.sort_order));
        setWeeklyEntries(entries);
      });
  }, []);

  const phaseDateRange = useMemo(() => {
    const dated = projectPhases.filter((phase) => phase.start_date && phase.end_date);
    if (!dated.length) return null;
    const starts = dated.map((phase) => parseDate(phase.start_date as string).getTime());
    const ends = dated.map((phase) => parseDate(phase.end_date as string).getTime());
    return {
      start: new Date(Math.min(...starts)),
      end: new Date(Math.max(...ends)),
    };
  }, [projectPhases]);

  const calendarWeeks = useMemo(() => {
    if (!phaseDateRange) return [];
    const weeks = [];
    const cursor = firstWednesdayOnOrAfter(phaseDateRange.start);
    const end = addMonths(phaseDateRange.end, 9);
    while (cursor <= end) {
      weeks.push(formatDate(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, [phaseDateRange]);

  const entriesByCalendarWeek = useMemo(() => {
    const map = new Map<string, WeeklyEntry[]>();
    weeklyEntries.forEach((entry) => {
      const calendarWeek = wednesdayForWeek(entry.week_start);
      map.set(calendarWeek, [...(map.get(calendarWeek) ?? []), entry]);
    });
    return map;
  }, [weeklyEntries]);

  function phaseForWeek(dateText: string) {
    const selected = parseDate(dateText).getTime();
    return projectPhases.find((phase) => {
      if (!phase.start_date || !phase.end_date) return false;
      return selected >= parseDate(phase.start_date).getTime() && selected <= parseDate(phase.end_date).getTime();
    });
  }

  function isBeyondConfiguredPhase(dateText: string) {
    return projectPhases.length > 0 && !phaseForWeek(dateText);
  }

  function calendarCellClass(dateText: string) {
    const hasData = Boolean(entriesByCalendarWeek.get(dateText)?.length);
    if (isBeyondConfiguredPhase(dateText)) {
      return "weekly-calendar-cell weekly-calendar-red";
    }
    return hasData ? "weekly-calendar-cell weekly-calendar-green" : "weekly-calendar-cell weekly-calendar-grey";
  }

  function enteredPhasesForWeek(dateText: string) {
    const phases = new Set(
      (entriesByCalendarWeek.get(dateText) ?? [])
        .map((entry) => entry.kpi?.phase)
        .filter(Boolean) as string[],
    );
    return Array.from(phases).join(", ");
  }

  useEffect(() => {
    if (!calendarWeeks.length) return;
    if (!calendarWeeks.includes(weekStart)) {
      const savedWeeks = Array.from(entriesByCalendarWeek.keys()).sort();
      const latestSavedWeek = savedWeeks[savedWeeks.length - 1];
      onWeekStartChange(latestSavedWeek && calendarWeeks.includes(latestSavedWeek) ? latestSavedWeek : calendarWeeks[0]);
    }
  }, [calendarWeeks, entriesByCalendarWeek, onWeekStartChange, weekStart]);

  useEffect(() => {
    const entriesForWeek = entriesByCalendarWeek.get(weekStart) ?? [];
    const entryByKpiId = new Map(entriesForWeek.map((entry) => [entry.kpi_id, entry]));
    const entryByCode = new Map(entriesForWeek.map((entry) => [entry.kpi?.code, entry]));
    const nextValues = getDefaultComponentValues(kpis);
    const nextNotes: NotesValues = {};
    kpis.forEach((kpi) => {
      const entry = (kpi.id ? entryByKpiId.get(kpi.id) : undefined) ?? entryByCode.get(kpi.code);
      nextValues[kpi.code] = entryComponentValues(kpi, entry);
      nextNotes[kpi.code] = entry?.notes ?? "";
    });
    setComponentValues(nextValues);
    setNotesValues(nextNotes);
    const activePhase = phaseForWeek(weekStart);
    if (activePhase && orderedPhases.includes(activePhase.name)) {
      setSelectedPhase(activePhase.name);
    }
    setSaveStatus(entriesForWeek.length ? "Editing saved weekly data" : "New weekly entry");
  }, [entriesByCalendarWeek, kpis, orderedPhases, weekStart]);

  function updateComponentValue(kpiCode: string, componentKey: string, value: string) {
    setComponentValues((current) => ({
      ...current,
      [kpiCode]: {
        ...current[kpiCode],
        [componentKey]: Number(value),
      },
    }));
  }

  function updateNoteValue(kpiCode: string, value: string) {
    setNotesValues((current) => ({ ...current, [kpiCode]: value }));
  }

  async function saveWeek() {
    const entries = phaseKpis.filter((kpi) => kpi.id).map((kpi) => ({
      project_id: projectId,
      kpi_id: kpi.id,
      week_start: weekStart,
      component_values: componentValues[kpi.code] ?? {},
      notes: notesValues[kpi.code] ?? "",
    }));
    await Promise.all(entries.map((entry) => apiSend<WeeklyEntry>("/api/v1/weekly-entries/", "POST", entry)));
    const refreshed = await apiGet<WeeklyEntry[]>(`/api/v1/weekly-entries/?project_id=${projectId}`);
    setWeeklyEntries(refreshed);
    setSaveStatus("Saved weekly data");
  }

  return (
    <section className="panel weekly-panel" id="weekly-input">
      <div className="section-heading">
        <div>
          <p>PM weekly submission</p>
          <h2>KPI value entry</h2>
        </div>
        <div className="catalog-status">
          <strong>{kpis.length} KPIs</strong>
          <span>{catalogStatus === "api" ? "Loaded from API" : catalogStatus === "loading" ? "Loading API catalog" : "Fallback catalog"}</span>
        </div>
        <button type="button" onClick={saveWeek}>Save week</button>
      </div>

      <div className="phase-counts" aria-label="KPI coverage by phase">
        {phaseCounts.map((item) => (
          <span key={item.phase}>
            {item.phase}: <strong>{item.count}</strong>
          </span>
        ))}
      </div>

      <div className="weekly-calendar-panel">
        <div className="weekly-calendar-heading">
          <div>
            <strong>Weekly calendar</strong>
            <span>{saveStatus}</span>
          </div>
          <div className="weekly-calendar-legend">
            <span><b className="legend-dot legend-green" />Data available</span>
            <span><b className="legend-dot weekly-legend-grey" />No data</span>
            <span><b className="legend-dot legend-red" />Beyond phase dates</span>
          </div>
        </div>
        <div className="weekly-calendar-grid">
          {calendarWeeks.map((dateText) => (
            <button
              className={`${calendarCellClass(dateText)}${weekStart === dateText ? " weekly-calendar-selected" : ""}`}
              key={dateText}
              onClick={() => onWeekStartChange(dateText)}
              type="button"
            >
              <strong>{formatCalendarLabel(dateText)}</strong>
              <span>Wed</span>
              <small>{enteredPhasesForWeek(dateText)}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="input-grid">
        <label>
          Selected Wednesday
          <input readOnly type="date" value={weekStart} />
        </label>
        <label>
          Project
          <select defaultValue="JSW MES Rollout">
            <option>JSW MES Rollout</option>
            <option>Monnet SAP Stabilization</option>
          </select>
        </label>
      </div>

      <div className="phase-tabs" role="tablist" aria-label="KPI phase selector">
        {orderedPhases.map((phase) => (
          <button
            aria-selected={selectedPhase === phase}
            className={selectedPhase === phase ? "phase-tab phase-tab-active" : "phase-tab"}
            key={phase}
            onClick={() => setSelectedPhase(phase)}
            type="button"
          >
            {phase}
            <span>{kpis.filter((kpi) => kpi.phase === phase).length}</span>
          </button>
        ))}
      </div>

      <div className="kpi-config-layout">
        <aside className="dimension-filter-box">
          <button
            className={selectedDimension === "all" ? "dimension-filter-item active" : "dimension-filter-item"}
            onClick={() => setSelectedDimension("all")}
            type="button"
          >
            <span>All dimensions</span>
            <strong>{kpis.filter((kpi) => kpi.phase === selectedPhase).length}</strong>
          </button>
          {dimensionCounts.map((dimension) => (
            <button
              className={selectedDimension === dimension.name ? "dimension-filter-item active" : "dimension-filter-item"}
              key={dimension.name}
              onClick={() => setSelectedDimension(dimension.name)}
              type="button"
            >
              <span>{dimension.name}</span>
              <strong>{dimension.phaseCount}</strong>
              <small>{dimension.count} total</small>
            </button>
          ))}
        </aside>

        <div className="kpi-config-main">
          <div className="entry-table-wrap">
            <table className="entry-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Formula</th>
                  <th>Weight</th>
                  <th>Trend</th>
                  <th>Threshold</th>
                  <th>Formula components</th>
                  <th>Calculated</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {phaseKpis.map((kpi) => (
                  <tr key={kpi.code}>
                    <td>
                      <strong>{kpi.metric}</strong>
                      <span>{kpi.category}</span>
                    </td>
                    <td>{kpi.formula}</td>
                    <td>{kpi.weight}</td>
                    <td>{kpi.expectedTrend === "positive" ? "Higher is better" : kpi.expectedTrend === "negative" ? "Lower is better" : "Should stay equal"}</td>
                    <td>
                      <input
                        aria-label={`${kpi.metric} threshold`}
                        className="readonly-value-input"
                        readOnly
                        value={kpi.threshold ?? ""}
                      />
                    </td>
                    <td>
                      <div className="component-grid">
                        {kpi.formulaComponents.map((component) => (
                          <label key={`${kpi.code}-${component.key}`}>
                            {component.label}
                            <input
                              aria-label={`${kpi.metric} ${component.label}`}
                              inputMode="decimal"
                              onChange={(event) =>
                                updateComponentValue(kpi.code, component.key, event.target.value)
                              }
                              value={componentValues[kpi.code]?.[component.key] ?? ""}
                            />
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="calculated-value">
                        {calculateValue(kpi, componentValues[kpi.code] ?? {})}
                        {kpi.formula.includes("/") ? "%" : ""}
                      </span>
                    </td>
                    <td>
                      <input
                        aria-label={`${kpi.metric} notes`}
                        onChange={(event) => updateNoteValue(kpi.code, event.target.value)}
                        placeholder="Optional"
                        value={notesValues[kpi.code] ?? ""}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
