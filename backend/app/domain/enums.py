from enum import StrEnum


class UserRole(StrEnum):
    APPLICANT = "applicant"
    CASE_MANAGER = "case_manager"
    ADMIN = "admin"


class PreferredLanguage(StrEnum):
    ES = "es"
    EN = "en"


class CaseStatus(StrEnum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    READY_FOR_REVIEW = "ready_for_review"
    UNDER_REVIEW = "under_review"
    CLOSED = "closed"


class IntakeSectionKey(StrEnum):
    PERSONAL = "personal"
    HOUSEHOLD = "household"
    INCOME = "income"
    EXPENSES = "expenses"
    ASSETS = "assets"
    DEBTS = "debts"
    RECENT_ACTIVITY = "recent_activity"
    DOCUMENTS = "documents"
    REVIEW = "review"


class DocumentCategory(StrEnum):
    IDENTITY = "identity"
    INCOME = "income"
    BANK = "bank"
    TAX = "tax"
    ASSET = "asset"
    DEBT = "debt"
    OTHER = "other"


class DocumentStatus(StrEnum):
    REQUESTED = "requested"
    UPLOADED = "uploaded"
    VERIFIED = "verified"
    NEEDS_ATTENTION = "needs_attention"


class TaskStatus(StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AlertSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


INTAKE_SECTION_ORDER: tuple[IntakeSectionKey, ...] = (
    IntakeSectionKey.PERSONAL,
    IntakeSectionKey.HOUSEHOLD,
    IntakeSectionKey.INCOME,
    IntakeSectionKey.EXPENSES,
    IntakeSectionKey.ASSETS,
    IntakeSectionKey.DEBTS,
    IntakeSectionKey.RECENT_ACTIVITY,
    IntakeSectionKey.DOCUMENTS,
    IntakeSectionKey.REVIEW,
)
