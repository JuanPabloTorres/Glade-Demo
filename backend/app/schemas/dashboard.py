from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_cases: int
    in_progress_cases: int
    ready_for_review_cases: int
    unresolved_alerts: int
    overdue_tasks: int
    completion_average: int
