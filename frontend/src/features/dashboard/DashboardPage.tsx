import { useCallback, useEffect, useState } from "react";

import { AppShell } from "../../components/layout/AppShell";
import type { DashboardView } from "../../components/layout/AppShell";
import { apiGet } from "../../lib/api/client";
import { ConfigurationPage } from "./ConfigurationPage";
import { HeatmapPage } from "./HeatmapPage";
import { KpiHealthPage } from "./KpiHealthPage";
import { ProgressMonitorPage } from "./ProgressMonitorPage";
import {
  kpis,
  normalizeKpis,
  type KpiDefinition,
} from "./dashboardData";
import { WeeklyInputPanel } from "./WeeklyInputPanel";

type ProjectConfig = {
  id: number;
  name: string;
};

type ProjectPhaseConfig = {
  id: number;
  name: string;
  end_date: string | null;
};

export function DashboardPage() {
  const [activeView, setActiveView] = useState<DashboardView>("configuration");
  const [visibleKpis, setVisibleKpis] = useState<KpiDefinition[]>(kpis);
  const [projectPhases, setProjectPhases] = useState<ProjectPhaseConfig[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "api" | "fallback">("loading");
  const [weekStart, setWeekStart] = useState("2026-07-20");

  const refreshKpis = useCallback(() => {
    apiGet<Parameters<typeof normalizeKpis>[0]>("/api/v1/kpis/?active_only=true")
      .then((apiKpis) => {
        setVisibleKpis(normalizeKpis(apiKpis));
        setCatalogStatus("api");
      })
      .catch(() => {
        setVisibleKpis(kpis);
        setCatalogStatus("fallback");
      });
  }, []);

  const refreshProjectPhases = useCallback(() => {
    apiGet<ProjectConfig[]>("/api/v1/projects/")
      .then((projects) => {
        const project = projects[0];
        if (!project) {
          setProjectPhases([]);
          return;
        }
        apiGet<ProjectPhaseConfig[]>(`/api/v1/project-phases/?project_id=${project.id}&active_only=true`)
          .then(setProjectPhases)
          .catch(() => setProjectPhases([]));
      })
      .catch(() => setProjectPhases([]));
  }, []);

  useEffect(() => {
    refreshKpis();
    refreshProjectPhases();
  }, [refreshKpis, refreshProjectPhases]);

  useEffect(() => {
    if (activeView === "weekly-input" || activeView === "kpi-health") {
      refreshKpis();
    }
  }, [activeView, refreshKpis]);

  useEffect(() => {
    if (activeView === "kpi-health" || activeView === "progress-monitor" || activeView === "configuration") {
      refreshProjectPhases();
    }
  }, [activeView, refreshProjectPhases]);

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {activeView === "weekly-input" ? (
        <WeeklyInputPanel
          catalogStatus={catalogStatus}
          kpis={visibleKpis}
          onWeekStartChange={setWeekStart}
          weekStart={weekStart}
        />
      ) : null}

      {activeView === "progress-monitor" ? <ProgressMonitorPage weekStart={weekStart} /> : null}

      {activeView === "kpi-health" ? (
        <KpiHealthPage kpis={visibleKpis} phaseConfigs={projectPhases} weekStart={weekStart} />
      ) : null}

      {activeView === "heatmap" ? <HeatmapPage /> : null}

      {activeView === "configuration" ? <ConfigurationPage onKpisChanged={refreshKpis} /> : null}
    </AppShell>
  );
}
