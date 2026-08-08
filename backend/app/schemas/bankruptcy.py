from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel

UserRole = Literal["client", "attorney"]
CaseStatus = Literal[
    "draft",
    "collecting_information",
    "submitted",
    "attorney_review",
    "consultation_scheduled",
    "decision_pending",
    "filing_preparation",
    "closed",
]
Frequency = Literal["weekly", "biweekly", "semimonthly", "monthly", "quarterly", "annual"]
DebtType = Literal["secured", "priority", "unsecured"]
EvidenceStatus = Literal["missing", "requested", "received", "reviewed"]


class HouseholdDto(ApiModel):
    marital_status: str | None = None
    household_size: int = Field(default=1, ge=1, le=20)
    dependents: int = Field(default=0, ge=0, le=20)
    filing_jointly: bool = False
    housing_status: str | None = None
    municipality: str | None = None
    urgent_collection_action: bool = False
    recent_property_transfer: bool = False


class IncomeEntryDto(ApiModel):
    id: str
    category: str
    source: str
    gross_amount: float = Field(ge=0)
    net_amount: float | None = Field(default=None, ge=0)
    frequency: Frequency = "monthly"
    evidence_ids: list[str] = Field(default_factory=list)


class ExpenseEntryDto(ApiModel):
    id: str
    category: str
    description: str
    monthly_amount: float = Field(ge=0)
    essential: bool = True
    evidence_ids: list[str] = Field(default_factory=list)


class DebtEntryDto(ApiModel):
    id: str
    creditor: str
    debt_type: DebtType
    description: str
    balance: float = Field(ge=0)
    monthly_payment: float = Field(default=0, ge=0)
    delinquent_amount: float = Field(default=0, ge=0)
    collateral: str | None = None
    collection_lawsuit: bool = False
    evidence_ids: list[str] = Field(default_factory=list)


class AssetEntryDto(ApiModel):
    id: str
    category: str
    description: str
    estimated_value: float = Field(ge=0)
    loan_balance: float = Field(default=0, ge=0)
    jointly_owned: bool = False
    evidence_ids: list[str] = Field(default_factory=list)


class EvidenceItemDto(ApiModel):
    id: str
    evidence_type: str
    name: str
    status: EvidenceStatus = "received"
    note: str | None = None
    related_entry_ids: list[str] = Field(default_factory=list)


class BankruptcyCaseDto(ApiModel):
    id: str
    owner_user_id: str
    client_name: str
    client_email: str
    client_phone: str | None = None
    preferred_language: str = "es"
    status: CaseStatus = "draft"
    household: HouseholdDto = Field(default_factory=HouseholdDto)
    incomes: list[IncomeEntryDto] = Field(default_factory=list)
    expenses: list[ExpenseEntryDto] = Field(default_factory=list)
    debts: list[DebtEntryDto] = Field(default_factory=list)
    assets: list[AssetEntryDto] = Field(default_factory=list)
    evidence: list[EvidenceItemDto] = Field(default_factory=list)
    client_goal: str | None = None
    attorney_notes: str | None = None


class CaseAnalysisRequestDto(ApiModel):
    case: BankruptcyCaseDto


class CaseAnalysisDto(ApiModel):
    monthly_gross_income: float
    monthly_net_income: float
    monthly_expenses: float
    monthly_cash_flow: float
    total_debt: float
    secured_debt: float
    priority_debt: float
    unsecured_debt: float
    total_asset_value: float
    net_asset_value: float
    completion_score: int
    evidence_score: int
    missing_items: list[str]
    warnings: list[str]
    discussion_points: list[str]
    chapter_7_questions: list[str]
    chapter_13_questions: list[str]
    required_evidence: list[str]
    next_steps: list[str]


AssistantScope = Literal["case", "portfolio"]
"""Which surface the question was asked from — a hint, never an authorization.

The UI already knows whether the user is in the attorney dashboard or inside a
case workspace, and that is cheaper and far more reliable than classifying every
sentence with keyword heuristics. So the client says where it is.

What it cannot do is grant itself anything. The server pairs this with the
authenticated role: `portfolio` from a client session is ignored, and the
collection itself is always resolved server-side from the session identity. The
hint chooses *which* authorized scope to build, never *what* is in it.

Defaults to `case`, so an older client that sends nothing keeps its current
behaviour and never accidentally opens a wider surface.
"""


class GuidanceRequestDto(ApiModel):
    case: BankruptcyCaseDto
    message: str
    role: UserRole
    locale: str = "es"
    assistant_scope: AssistantScope = "case"
