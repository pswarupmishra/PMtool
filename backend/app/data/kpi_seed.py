import csv
from io import StringIO


RAW_KPI_CATALOG = """Category	Metric	Formula	Type	Leading Indicator	Phase	Health Dimension	Expected Trend
Scope	Requirements Identified vs Planned	Actual / Planned	Efficiency	Yes	Requirement Analysis	Delivery Predictability	Positive
Scope	Scope Growth %	New Requirements / Baseline Requirements	Stability	Yes	Requirement Analysis	Scope Stability	Negative
Scope	Requirement Volatility %	Modified Requirements / Total Requirements	Stability	Yes	Requirement Analysis	Scope Stability	Negative
Scope	Requirement Rework %	Rewritten Requirements / Total Requirements	Quality	Yes	Requirement Analysis	Quality Index	Negative
Stakeholder	Planned User Sessions vs Actual	Actual / Planned	Engagement	Yes	Requirement Analysis	User Engagement Index	Positive
Stakeholder	Business Attendance %	Actual Attendance / Planned Attendance	Engagement	Yes	Requirement Analysis	User Engagement Index	Positive
Stakeholder	Decision Closure Rate	Decisions Closed / Decisions Raised	Flow	Yes	Requirement Analysis	Flow Efficiency	Positive
Stakeholder	Average Decision Aging	Days Open	Flow	Yes	Requirement Analysis	Flow Efficiency	Negative
Stakeholder	SME Responsiveness	Avg Response Time	Flow	Yes	Requirement Analysis	User Engagement Index	Negative
Documentation	BRD Completion %	Completed Sections / Planned Sections	Progress	No	Requirement Analysis	Delivery Predictability	Positive
Documentation	User Story Completion %	Stories Created / Planned Stories	Progress	No	Requirement Analysis	Delivery Predictability	Positive
Documentation	Acceptance Criteria Coverage	Stories with AC / Total Stories	Quality	Yes	Requirement Analysis	Quality Index	Positive
Dependencies	Master Data Availability %	Received / Planned	Dependency	Yes	Requirement Analysis	Dependency Fulfillment Index	Positive
Dependencies	Process Documentation Availability %	Received / Planned	Dependency	Yes	Requirement Analysis	Dependency Fulfillment Index	Positive
Dependencies	Interface Definition Availability %	Received / Planned	Dependency	Yes	Requirement Analysis	Dependency Fulfillment Index	Positive
Productivity	Requirement Discovery Rate	Requirements Identified per Week	Throughput	Yes	Requirement Analysis	Delivery Predictability	Positive
Productivity	Requirement Clarification Ratio	Clarifications / Requirements	Complexity	Yes	Requirement Analysis	Complexity Variance	Negative
Productivity	Work Discovery Ratio	New Tasks / Planned Tasks	Complexity	Yes	Requirement Analysis	Complexity Variance	Negative
Design Stability	Design Completion %	Completed Designs / Planned Designs	Progress	No	Solution Design	Delivery Predictability	Positive
Design Stability	Design Change %	Changed Designs / Total Designs	Stability	Yes	Solution Design	Scope Stability	Negative
Design Stability	Design Rework %	Reworked Designs / Total Designs	Quality	Yes	Solution Design	Quality Index	Negative
Design Quality	Requirements Traceability Coverage	Mapped Requirements / Total Requirements	Quality	Yes	Solution Design	Quality Index	Positive
Design Quality	Open Assumptions	Count	Risk	Yes	Solution Design	Complexity Variance	Negative
Design Quality	Open Design Decisions	Count	Risk	Yes	Solution Design	Complexity Variance	Negative
Stakeholder	Design Review Attendance %	Actual / Planned	Engagement	Yes	Solution Design	User Engagement Index	Positive
Stakeholder	Design Approval Lead Time	Days	Flow	Yes	Solution Design	Flow Efficiency	Negative
Dependency	Interface Design Readiness	Ready / Planned	Dependency	Yes	Solution Design	Dependency Fulfillment Index	Positive
Dependency	Infrastructure Design Readiness	Ready / Planned	Dependency	Yes	Solution Design	Dependency Fulfillment Index	Positive
Complexity	Expected Complexity Points	Sum of Estimated Points	Baseline	No	Solution Design	Complexity Variance	Equal
Complexity	Actual Complexity Points	Sum of Actual Points	Baseline	No	Solution Design	Complexity Variance	Equal
Complexity	Complexity Variance	Actual / Estimated	Complexity	Yes	Solution Design	Complexity Variance	Equal
Productivity	Design Throughput	Designs Completed / Week	Throughput	No	Solution Design	Delivery Predictability	Positive
Productivity	Design Waiting Time	Waiting Hours / Total Hours	Efficiency	Yes	Solution Design	Flow Efficiency	Negative
Delivery	Planned Work Items vs Completed	Actual / Planned	Predictability	Yes	Sprint Development	Delivery Predictability	Positive
Delivery	Story Completion Rate	Completed Stories / Planned Stories	Predictability	Yes	Sprint Development	Delivery Predictability	Positive
Delivery	Story Point Completion %	Delivered Points / Planned Points	Predictability	Yes	Sprint Development	Delivery Predictability	Positive
Delivery	Velocity	Story Points per Sprint	Throughput	No	Sprint Development	Delivery Predictability	Positive
Delivery	WIP Growth	Current WIP / Planned WIP	Stability	Yes	Sprint Development	Flow Efficiency	Negative
Delivery	Story Aging	Average Age of Open Stories	Flow	Yes	Sprint Development	Flow Efficiency	Negative
Delivery	Sprint Spillover %	Carry Forward Stories / Planned Stories	Predictability	Yes	Sprint Development	Delivery Predictability	Negative
Quality	Defects per Story	Defects / Story	Quality	Yes	Sprint Development	Quality Index	Negative
Quality	Reopened Stories %	Reopened / Completed	Quality	Yes	Sprint Development	Quality Index	Negative
Quality	First Pass Acceptance	Accepted / Submitted	Quality	Yes	Sprint Development	Quality Index	Positive
Quality	Demo Acceptance %	Accepted / Demonstrated	Quality	Yes	Sprint Development	Quality Index	Positive
Quality	Unit Test Success %	Passed / Executed	Quality	Yes	Sprint Development	Quality Index	Positive
Dependency	Receivables from JSW	Actual / Planned	Dependency	Yes	Sprint Development	Dependency Fulfillment Index	Positive
Dependency	Environment Availability %	Available / Planned	Dependency	Yes	Sprint Development	Dependency Fulfillment Index	Positive
Dependency	Interface Availability %	Available / Planned	Dependency	Yes	Sprint Development	Dependency Fulfillment Index	Positive
Dependency	Test Data Availability %	Available / Planned	Dependency	Yes	Sprint Development	Dependency Fulfillment Index	Positive
Productivity	Development Productivity	Stories Closed per Developer	Productivity	No	Sprint Development	Delivery Predictability	Positive
Productivity	Cycle Time	Start to Completion	Efficiency	Yes	Sprint Development	Flow Efficiency	Negative
Productivity	Lead Time	Request to Completion	Efficiency	Yes	Sprint Development	Flow Efficiency	Negative
Productivity	Flow Efficiency	Work Time / Total Time	Efficiency	Yes	Sprint Development	Flow Efficiency	Positive
Productivity	Waiting Time %	Waiting Time / Total Time	Efficiency	Yes	Sprint Development	Flow Efficiency	Negative
Testing	Test Cases Planned vs Executed	Executed / Planned	Efficiency	Yes	Testing	Delivery Predictability	Positive
Testing	Test Case Pass %	Passed / Executed	Quality	Yes	Testing	Quality Index	Positive
Testing	Defect Density	Defects / Test Case	Quality	Yes	Testing	Quality Index	Negative
Testing	Defect Closure Rate	Closed / Opened	Efficiency	Yes	Testing	Quality Index	Positive
Testing	Average Defect Aging	Days	Efficiency	Yes	Testing	Flow Efficiency	Negative
Testing	Business Participation %	Actual / Planned	Dependency	Yes	Testing	User Engagement Index	Positive
Testing	UAT Completion %	Executed / Planned	Efficiency	Yes	Testing	Delivery Predictability	Positive
Testing	Requirement Coverage %	Tested / Total	Efficiency	Yes	Testing	Quality Index	Positive
Testing	Retest Success %	Passed / Retested	Efficiency	Yes	Testing	Quality Index	Positive
Testing	Regression Failure %	Failed / Executed	Quality	Yes	Testing	Quality Index	Negative
Readiness	Cutover Tasks Completed	Completed / Planned	Efficiency	Yes	Deployment Readiness	Delivery Predictability	Positive
Readiness	Training Completion %	Trained / Planned	Efficiency	Yes	Deployment Readiness	User Engagement Index	Positive
Readiness	SOP Completion %	Completed / Planned	Efficiency	Yes	Deployment Readiness	Delivery Predictability	Positive
Readiness	Device Readiness %	Ready / Planned	Dependency	Yes	Deployment Readiness	Dependency Fulfillment Index	Positive
Readiness	Interface Readiness %	Ready / Planned	Dependency	Yes	Deployment Readiness	Dependency Fulfillment Index	Positive
Readiness	Open Critical Defects	Count	Efficiency	Yes	Deployment Readiness	Quality Index	Negative
Readiness	Open High Risks	Count	Efficiency	Yes	Deployment Readiness	Complexity Variance	Negative
Readiness	Hypercare Readiness %	Completed / Planned	Efficiency	Yes	Deployment Readiness	Delivery Predictability	Positive
"""


def _code(value: str) -> str:
    return (
        value.lower()
        .replace("%", "percent")
        .replace("/", " ")
        .replace("&", "and")
        .replace("-", " ")
        .replace("  ", " ")
        .strip()
        .replace(" ", "_")
    )


def _component_key(label: str) -> str:
    return _code(label)


def _components_for_formula(formula: str) -> list[dict[str, str]]:
    if "/" in formula:
        numerator, denominator = [part.strip() for part in formula.split("/", 1)]
        return [
            {"key": _component_key(numerator), "label": numerator, "role": "numerator"},
            {"key": _component_key(denominator), "label": denominator, "role": "denominator"},
        ]

    label = formula.strip()
    role = "days" if "day" in label.lower() or "time" in label.lower() else "value"
    return [{"key": _component_key(label), "label": label, "role": role}]


def _default_weight(row: dict[str, str]) -> float:
    if row["Leading Indicator"] == "No":
        return 3.0
    if row["Type"] in {"Quality", "Predictability", "Dependency"}:
        return 7.0
    if row["Type"] in {"Risk", "Complexity"}:
        return 5.0
    return 6.0


def _parse_default_kpis() -> list[dict[str, object]]:
    rows = csv.DictReader(StringIO(RAW_KPI_CATALOG), delimiter="\t")
    return [
        {
            "code": _code(row["Metric"]),
            "category": row["Category"],
            "metric": row["Metric"],
            "formula": row["Formula"],
            "formula_components": _components_for_formula(row["Formula"]),
            "metric_type": row["Type"],
            "phase": row["Phase"],
            "health_dimension": row["Health Dimension"],
            "expected_trend": row["Expected Trend"].lower(),
            "threshold": None,
            "monitor_period_weeks": 3,
            "weight": _default_weight(row),
            "is_leading_indicator": row["Leading Indicator"] == "Yes",
            "is_active": True,
        }
        for row in rows
    ]


DEFAULT_KPIS = _parse_default_kpis()
