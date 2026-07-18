const documentSections = [
  {
    title: "1. Configure The Project",
    summary: "Set the project identity, phase plan, health dimensions, and KPI catalogue before weekly tracking starts.",
    items: [
      "Open Configuration and update project name, location, vendor, and project type.",
      "Maintain project phases in the phase grid. Each phase should have a start date, end date, sort order, and active status.",
      "Create or update health dimensions. The Score % field is used by the weighted score heatmap.",
      "Configure KPIs by phase tab and health dimension. Define formula, expected trend, threshold, and monitor period.",
    ],
  },
  {
    title: "2. Enter Weekly KPI Data",
    summary: "Weekly Input is the system of record for KPI values used by all monitoring pages.",
    items: [
      "Select a Wednesday from the calendar. Green week cells have saved records and grey week cells have no data.",
      "When records exist for a week, the cell shows two-letter phase badges: RA, SD, SP, TE, and DR.",
      "Each phase badge has its own status color. Green means that phase entry is within its planned phase dates; red means that phase entry is outside its planned phase dates.",
      "Choose the active phase and health dimension from the tabs/sidebar.",
      "Enter every formula component requested for the KPI. The app calculates the KPI value from those components.",
      "If a KPI is not relevant for the selected week, set Applicability to Not relevant and add a short reason. The week remains saved, but that KPI is treated as N/A for dashboard calculations.",
      "To remove an entire selected week, click Delete selected week from the weekly calendar header. The app asks for two confirmations before deleting those KPI records.",
      "Saved dates reopen in edit mode, so PMs can correct or complete previous weekly submissions.",
    ],
  },
  {
    title: "3. Monitor KPI Health",
    summary: "KPI Health shows detailed KPI movement using the weekly input records.",
    items: [
      "Use phase tabs to focus on a delivery phase.",
      "Use the health dimension sidebar to filter the KPI table.",
      "Weekly Value shows the entered/calculated KPI values over time.",
      "Latest compares the most recent weekly value with the configured threshold.",
      "Monitor is Yes only when threshold breach continues for the configured monitor period.",
      "Not relevant weekly entries appear as grey/N.A. and are excluded from threshold and monitor calculations.",
    ],
  },
  {
    title: "4. Read The Heatmaps",
    summary: "The heatmap page gives executive-level risk visibility by phase and health dimension.",
    items: [
      "Score heatmap uses dimension weights from Configuration. If any KPI in a cell breaches threshold, that cell contributes 0; otherwise it contributes its configured weight.",
      "Use the period selector to calculate heatmaps for the entire project or only between two selected weeks.",
      "When Between two weeks is selected, score, threshold, monitor period, and drill-down data are calculated only from weekly entries inside that selected period.",
      "Cells with no configured KPIs are grey and treated as neutral/pass for score calculation.",
      "If all KPIs in a cell are Not relevant for the selected period, the cell is also neutral/pass and shown grey.",
      "Trend heatmap checks continuous threshold breach over each KPI monitor period. Red means at least one KPI in that cell breached continuously.",
      "A Not relevant week breaks continuous breach monitoring, so two red weeks separated by N/A do not trigger Monitor = Yes.",
      "Click Trend in a score cell to open a KPI Health-style drill-down filtered to that exact phase and health dimension.",
    ],
  },
  {
    title: "5. Track Progress",
    summary: "Progress Monitor converts weekly project timing into a phase-level delivery view.",
    items: [
      "The Gantt-style chart uses configured phase start and end dates.",
      "The current selected week highlights which phase is ongoing.",
      "Use this page to align KPI health conversations with the delivery calendar.",
    ],
  },
];

const logicCards = [
  {
    label: "Expected Trend",
    detail: "Positive means higher is better. Negative means lower is better. Equal means the KPI should remain at the threshold/value.",
  },
  {
    label: "Threshold",
    detail: "For positive KPIs, latest value below threshold is red. For negative KPIs, latest value above threshold is red.",
  },
  {
    label: "Monitor Period",
    detail: "The number of consecutive weeks required before a recurring breach is marked as Monitor = Yes.",
  },
  {
    label: "Weighted Score",
    detail: "Each phase can contribute up to 1 point. Across five phases, the total executive score is shown out of 5.",
  },
  {
    label: "Not Relevant KPI",
    detail: "A KPI marked Not relevant is saved for audit history but treated as N/A. It does not count as green, red, or a continuous breach for that week.",
  },
  {
    label: "Weekly Calendar Badges",
    detail: "RA, SD, SP, TE, and DR represent phase entries. Badge colors are evaluated per phase, so one week can contain both green and red phase badges.",
  },
];

const apiGroups = [
  {
    title: "Projects",
    purpose: "Stores project identity used across the dashboard header, configuration screens, and reset operations.",
    endpoints: [
      ["GET", "/api/v1/projects/", "List configured projects."],
      ["POST", "/api/v1/projects/", "Create a project record."],
      ["PATCH", "/api/v1/projects/{project_id}", "Update project name, owner, location, vendor, type, or status."],
    ],
  },
  {
    title: "Project Phases",
    purpose: "Maintains phase sequence and date windows used by Weekly Input, KPI Health overdue tabs, and Progress Monitor.",
    endpoints: [
      ["GET", "/api/v1/project-phases/?project_id=1&active_only=true", "Load phase configuration for a project."],
      ["POST", "/api/v1/project-phases/", "Create a phase with start date, end date, and sort order."],
      ["PATCH", "/api/v1/project-phases/{phase_id}", "Update phase details."],
      ["DELETE", "/api/v1/project-phases/{phase_id}", "Deactivate/delete a phase."],
    ],
  },
  {
    title: "Health Dimensions",
    purpose: "Maintains dimensions and Score % weights used by KPI configuration and score heatmap calculation.",
    endpoints: [
      ["GET", "/api/v1/health-dimensions/?active_only=true", "Load active dimensions for dropdowns and heatmap weights."],
      ["POST", "/api/v1/health-dimensions/", "Create a health dimension."],
      ["PATCH", "/api/v1/health-dimensions/{dimension_id}", "Update name, description, score %, or active status."],
      ["DELETE", "/api/v1/health-dimensions/{dimension_id}", "Deactivate/delete a health dimension."],
    ],
  },
  {
    title: "KPI Catalogue",
    purpose: "Defines KPI formula, phase, health dimension, expected trend, threshold, monitor period, and weight.",
    endpoints: [
      ["GET", "/api/v1/kpis/?active_only=true", "Load active KPI catalogue for Configuration and Weekly Input."],
      ["POST", "/api/v1/kpis/", "Create a KPI definition."],
      ["PATCH", "/api/v1/kpis/{kpi_id}", "Update KPI formula, trend, threshold, monitor period, or mapping."],
      ["DELETE", "/api/v1/kpis/{kpi_id}", "Deactivate/delete a KPI definition."],
    ],
  },
  {
    title: "Weekly KPI Entries",
    purpose: "Stores weekly formula component input, calculated KPI values, applicability status, and PM notes. This is the primary transaction table.",
    endpoints: [
      ["GET", "/api/v1/weekly-entries/?project_id=1", "Load saved weekly entries for calendar state and edit mode."],
      ["POST", "/api/v1/weekly-entries/", "Create or update one KPI weekly entry for a project/date/KPI. Payload supports applicability_status = applicable or not_relevant and applicability_reason."],
      ["DELETE", "/api/v1/weekly-entries/?project_id=1", "Delete all weekly entries for a project."],
      ["DELETE", "/api/v1/weekly-entries/?project_id=1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD", "Delete weekly entries for a selected period or one selected calendar week."],
    ],
  },
  {
    title: "Dashboard Analytics",
    purpose: "Aggregates weekly entries into project health, KPI health data, trend heatmap, and weighted score heatmap.",
    endpoints: [
      ["GET", "/api/v1/dashboard/projects/{project_id}/health", "Return project health summary and KPI health records."],
      ["GET", "/api/v1/dashboard/projects/{project_id}/heatmap?period_mode=entire", "Return heatmap and KPI drill-down data for the entire project."],
      ["GET", "/api/v1/dashboard/projects/{project_id}/heatmap?period_mode=range&start_week=YYYY-MM-DD&end_week=YYYY-MM-DD", "Return heatmap data calculated only between two selected weeks."],
    ],
  },
];

const dataFlow = [
  "Configuration APIs define project, phases, dimensions, and KPI catalogue.",
  "Weekly Input posts component values and applicability status to weekly-entries. Backend calculates the stored KPI value when applicable.",
  "Dashboard APIs read weekly entries and apply applicability, trend, threshold, monitor period, and weighted score logic.",
  "KPI Health and Heatmap both use weekly-entry-backed analytics so drill-down values stay aligned.",
];

export function DocumentationPage() {
  return (
    <section className="panel documentation-page">
      <div className="section-heading documentation-heading">
        <div>
          <p>Tool Wiki</p>
          <h2>Project Control User Guide</h2>
          <small>
            Operational guide for configuring the PM dashboard, entering weekly KPI data, and interpreting project health.
          </small>
        </div>
      </div>

      <div className="doc-layout">
        <aside className="doc-index" aria-label="Document index">
          <strong>Contents</strong>
          {documentSections.map((section) => (
            <a href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={section.title}>
              {section.title}
            </a>
          ))}
          <a href="#logic-reference">Logic Reference</a>
          <a href="#backend-api-reference">Backend API Reference</a>
        </aside>

        <div className="doc-content">
          <div className="doc-callout">
            <strong>Recommended operating rhythm</strong>
            <span>
              Configure once, enter KPI data every Wednesday, review KPI Health for detailed issues, then use Heatmap for executive reporting.
            </span>
          </div>

          <div className="doc-flow" aria-label="Primary workflow">
            <span>Configuration</span>
            <b />
            <span>Weekly Input</span>
            <b />
            <span>KPI Health</span>
            <b />
            <span>Heatmap</span>
            <b />
            <span>Progress Monitor</span>
          </div>

          {documentSections.map((section) => (
            <article className="doc-section" id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.summary}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}

          <article className="doc-section" id="logic-reference">
            <h3>Logic Reference</h3>
            <div className="doc-logic-grid">
              {logicCards.map((card) => (
                <div className="doc-logic-card" key={card.label}>
                  <strong>{card.label}</strong>
                  <span>{card.detail}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="doc-section" id="backend-api-reference">
            <h3>Backend API Reference</h3>
            <p>
              The backend is a FastAPI service under the `/api/v1` prefix. It uses SQLite as the local data store and exposes configuration, weekly entry, and analytics endpoints.
            </p>
            <div className="doc-data-flow">
              {dataFlow.map((item, index) => (
                <div key={item}>
                  <strong>{index + 1}</strong>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="api-reference-list">
              {apiGroups.map((group) => (
                <div className="api-reference-group" key={group.title}>
                  <h4>{group.title}</h4>
                  <p>{group.purpose}</p>
                  <table className="api-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Use</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.endpoints.map(([method, endpoint, use]) => (
                        <tr key={`${method}-${endpoint}`}>
                          <td><span className={`api-method api-method-${method.toLowerCase()}`}>{method}</span></td>
                          <td><code>{endpoint}</code></td>
                          <td>{use}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
