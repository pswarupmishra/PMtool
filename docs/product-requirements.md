# Product Requirements

## Goals

- Track project health, status, risks, milestones, and ownership.
- Give PMs a concise operating view across active work.
- Allow PMs to submit weekly KPI values for each active project.
- Capture weekly phase-wise status by formula component, not only by final KPI value.
- Calculate project health from configurable KPI weightage.
- Show weekly KPI movement as green or red based on the KPI trend direction.
- Provide an executive-grade dashboard for sponsors and leadership.

## Core Views

- Executive overview
- Weekly KPI entry
- KPI configuration
- Health dimension scorecard
- Roadmap
- Projects
- Tasks
- Risks and blockers
- Reports

## KPI Configuration

Each KPI includes category, metric, formula, formula components, type, phase, health dimension, expected trend, leading indicator flag, active flag, and weight.

Expected trend controls the weekly signal:

- Positive trend: higher latest value is green.
- Negative trend: lower latest value is green.
- Equal trend: unchanged latest value is green.

## Health Score

Project health is calculated from the latest available week. Green KPI weights are divided by total active KPI weights to produce the weighted health score. Dimension scores use the same method within each health dimension.

## Weekly Entry

PMs select a project, week, and phase, then enter the component values for each KPI formula. Ratio KPIs are calculated from numerator and denominator components. Count and lead-time KPIs use a single value component.
