from datetime import UTC, datetime

from app.domain.enums import CaseStatus, TaskStatus
from app.domain.models import User
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.dashboard import DashboardSummary
from app.services.case_service import CaseService


class DashboardService:
    def __init__(self, cases: CaseService, workspace: WorkspaceRepository) -> None:
        self.cases = cases
        self.workspace = workspace

    def summarize(self, current_user: User) -> DashboardSummary:
        cases = self.cases.list_cases(current_user)
        unresolved_alerts = 0
        overdue_tasks = 0
        now_aware = datetime.now(UTC)

        for case in cases:
            unresolved_alerts += sum(
                1 for alert in self.workspace.list_alerts(case.id) if not alert.resolved
            )
            for task in self.workspace.list_tasks(case.id):
                if task.status == TaskStatus.DONE or not task.due_date:
                    continue
                due = task.due_date
                now = now_aware if due.tzinfo else datetime.now()
                if due < now:
                    overdue_tasks += 1

        total = len(cases)
        average = round(sum(case.progress for case in cases) / total) if total else 0
        return DashboardSummary(
            total_cases=total,
            in_progress_cases=sum(
                1 for case in cases if case.status == CaseStatus.IN_PROGRESS
            ),
            ready_for_review_cases=sum(
                1 for case in cases if case.status == CaseStatus.READY_FOR_REVIEW
            ),
            unresolved_alerts=unresolved_alerts,
            overdue_tasks=overdue_tasks,
            completion_average=average,
        )
