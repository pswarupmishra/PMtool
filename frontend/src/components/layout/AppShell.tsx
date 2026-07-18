import type { ReactNode } from "react";

import jswSteelLogo from "../../assets/jsw-steel-logo.png";

export type DashboardView = "weekly-input" | "progress-monitor" | "kpi-health" | "heatmap" | "configuration";

type AppShellProps = {
  activeView: DashboardView;
  children: ReactNode;
  onViewChange: (view: DashboardView) => void;
};

const navItems: Array<{ label: string; view: DashboardView }> = [
  { label: "Configuration", view: "configuration" },
  { label: "Weekly Input", view: "weekly-input" },
  { label: "Progress Monitor", view: "progress-monitor" },
  { label: "KPI Health", view: "kpi-health" },
  { label: "Heatmap", view: "heatmap" },
];

export function AppShell({ activeView, children, onViewChange }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <img alt="JSW Steel" src={jswSteelLogo} />
        <div>
          <span>Project Management Dashboard</span>
          <strong>Project Control</strong>
        </div>
      </header>
      <aside className="sidebar">
        <div className="brand">
          <span>PM</span>
          <strong>Project Control</strong>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              className={activeView === item.view ? "nav-item nav-item-active" : "nav-item"}
              key={item.view}
              onClick={() => onViewChange(item.view)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
