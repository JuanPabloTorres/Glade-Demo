from enum import StrEnum


class MatterStatus(StrEnum):
    INTAKE = "intake"
    ACTIVE = "active"
    READY_FOR_REVIEW = "ready_for_review"


class CaseType(StrEnum):
    IMMIGRATION = "immigration"
    BANKRUPTCY = "bankruptcy"
    GENERAL = "general"


class DocumentType(StrEnum):
    IDENTITY = "identity"
    PROOF_OF_ADDRESS = "proof_of_address"
    FINANCIAL = "financial"
    SUPPORTING = "supporting"


class DocumentStatus(StrEnum):
    PROCESSED = "processed"
    NEEDS_REVIEW = "needs_review"


class ConflictStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"


class FactSourceType(StrEnum):
    INTAKE = "intake"
    DOCUMENT = "document"


class CanonicalField(StrEnum):
    DISPLAY_NAME = "display_name"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    DATE_OF_BIRTH = "date_of_birth"


class ActivityType(StrEnum):
    MATTER_CREATED = "matter_created"
    INTAKE_UPDATED = "intake_updated"
    DOCUMENT_PROCESSED = "document_processed"
    CONFLICT_DETECTED = "conflict_detected"
    CONFLICT_RESOLVED = "conflict_resolved"
    DOCUMENT_REVIEW_COMPLETED = "document_review_completed"
    MATTER_STATUS_CHANGED = "matter_status_changed"
