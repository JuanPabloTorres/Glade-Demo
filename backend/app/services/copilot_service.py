from __future__ import annotations

import re
from datetime import UTC, datetime
from itertools import combinations
from uuid import uuid4

import pandas as pd  # type: ignore[import-untyped]
from rapidfuzz.fuzz import ratio

from app.ai.text_generation import TextGenerator, get_text_generator
from app.core.config import Settings
from app.core.errors import NotFoundError, ValidationError
from app.schemas.copilot import (
    CasePacketDto,
    CaseProfileDto,
    ChatMessageDto,
    ChatRequestDto,
    ConversationStateDto,
    CopilotResponseDto,
    DocumentAnalyzeRequestDto,
    EvidenceDocumentDto,
    EvidenceRowDto,
    EvidenceValueDto,
    ResolveIssueRequestDto,
    ReviewIssueDto,
)

FIELD_ORDER = ("goal", "case_type", "client_name", "email", "phone", "location")
FIELD_LABELS = {
    "goal": "Desired outcome",
    "case_type": "Intake type",
    "client_name": "Client name",
    "email": "Email",
    "phone": "Phone",
    "location": "Location",
    "deadline": "Deadline",
}
CASE_KEYWORDS = {
    "immigration": ("immigration", "immigration", "visa", "residency", "inmigracion", "inmigración"),
    "bankruptcy": ("bankruptcy", "debt", "quiebra", "bancarrota"),
    "general": ("general", "other", "otro", "general intake"),
}
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(r"(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}")
NAME_PATTERNS = (
    re.compile(r"(?:client|name|cliente|nombre)\s*(?:is|es|:)?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ' -]{3,})", re.I),
    re.compile(r"(?:for|para)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ' -]{2,})"),
)
LOCATION_PATTERNS = (
    re.compile(r"(?:location|address|ubicacion|ubicación|direccion|dirección)\s*(?:is|es|:)?\s*(.+)", re.I),
)
DOCUMENT_PATTERNS = {
    "client_name": (re.compile(r"(?:full\s+name|name|nombre)\s*:\s*(.+)", re.I),),
    "email": (re.compile(r"(?:email|correo)\s*:\s*([^\s]+@[^\s]+)", re.I), EMAIL_PATTERN),
    "phone": (re.compile(r"(?:phone|telephone|telefono|teléfono)\s*:\s*([+()\-\d\s.]{7,})", re.I), PHONE_PATTERN),
    "location": (re.compile(r"(?:address|location|direccion|dirección|ubicacion|ubicación)\s*:\s*(.+)", re.I),),
    "deadline": (re.compile(r"(?:deadline|due\s+date|fecha\s+limite|fecha\s+límite)\s*:\s*(.+)", re.I),),
}


def _now() -> datetime:
    return datetime.now(UTC)


def _message(role: str, content: str) -> ChatMessageDto:
    return ChatMessageDto(id=str(uuid4()), role=role, content=content, created_at=_now())


def _clean(value: str) -> str:
    return " ".join(value.strip().rstrip(".,;").split())


def _normalized(value: str) -> str:
    return _clean(value).casefold()


def _detect_case_type(message: str) -> str | None:
    lowered = message.casefold()
    for case_type, keywords in CASE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return case_type
    return None


def _extract_document_facts(text: str) -> dict[str, str]:
    facts: dict[str, str] = {}
    for field, patterns in DOCUMENT_PATTERNS.items():
        for pattern in patterns:
            match = pattern.search(text)
            if match:
                raw = match.group(1) if match.lastindex else match.group(0)
                value = _clean(raw)
                if value:
                    facts[field] = value
                    break
    return facts


def _is_conflict(field: str, values: list[str]) -> bool:
    distinct = list(dict.fromkeys(_normalized(value) for value in values if value.strip()))
    if len(distinct) < 2:
        return False
    if field in {"email", "phone", "case_type"}:
        return True
    return any(ratio(left, right) < 88 for left, right in combinations(distinct, 2))


class CopilotService:
    def __init__(self, settings: Settings) -> None:
        self._generator: TextGenerator = get_text_generator(
            settings.ai_provider,
            settings.ai_model_id,
            settings.ai_max_new_tokens,
        )

    def respond(self, request: ChatRequestDto) -> CopilotResponseDto:
        state = request.state.model_copy(deep=True)
        text = _clean(request.message)
        if not text:
            raise ValidationError("A message is required.")
        state.messages.append(_message("user", text))
        state.profile = self._update_profile(state.profile, text)
        packet = self._build_packet(state)
        fallback, quick_replies = self._next_response(state, packet)
        assistant_text = self._generator.compose(
            locale=request.locale,
            context=packet.summary,
            fallback=fallback,
        )
        assistant = _message("assistant", assistant_text)
        state.messages.append(assistant)
        return CopilotResponseDto(
            state=state,
            packet=packet,
            assistant_message=assistant,
            quick_replies=quick_replies,
        )

    def analyze_document(self, request: DocumentAnalyzeRequestDto) -> CopilotResponseDto:
        state = request.state.model_copy(deep=True)
        label = _clean(request.label)
        text = request.text.strip()
        if not label or not text:
            raise ValidationError("A document label and text are required.")
        facts = _extract_document_facts(text)
        state.documents.append(
            EvidenceDocumentDto(
                id=str(uuid4()),
                label=label,
                text=text,
                facts=facts,
                created_at=_now(),
            )
        )
        packet = self._build_packet(state)
        open_conflicts = [issue for issue in packet.issues if issue.kind == "conflict" and issue.status == "open"]
        extracted = ", ".join(FIELD_LABELS.get(field, field) for field in facts) or "no structured fields"
        fallback = (
            f"I analyzed {label} and extracted {extracted}. "
            + (
                f"I found {len(open_conflicts)} contradiction(s) that require a human decision."
                if open_conflicts
                else "I did not find a new contradiction."
            )
        )
        assistant_text = self._generator.compose(
            locale=request.locale,
            context=packet.summary,
            fallback=fallback,
        )
        assistant = _message("assistant", assistant_text)
        state.messages.append(assistant)
        return CopilotResponseDto(
            state=state,
            packet=packet,
            assistant_message=assistant,
            quick_replies=["What is still missing?", "Summarize the packet"],
        )

    def resolve_issue(self, issue_id: str, request: ResolveIssueRequestDto) -> CopilotResponseDto:
        state = request.state.model_copy(deep=True)
        packet_before = self._build_packet(state)
        issue = next((item for item in packet_before.issues if item.id == issue_id), None)
        if issue is None:
            raise NotFoundError("The review issue is no longer available.")
        if issue.kind != "conflict":
            raise ValidationError("Missing information must be supplied through the conversation.")
        selected = _clean(request.selected_value)
        if selected not in issue.values:
            raise ValidationError("Select one of the values supported by the evidence.")
        state.resolutions[issue_id] = selected
        profile_data = state.profile.model_dump()
        if issue.field in profile_data:
            profile_data[issue.field] = selected
            state.profile = CaseProfileDto(**profile_data)
        packet = self._build_packet(state)
        fallback = (
            f"Decision recorded for {issue.label}: {selected}. "
            f"The packet is now {packet.readiness}% ready."
        )
        assistant_text = self._generator.compose(
            locale=request.locale,
            context=packet.summary,
            fallback=fallback,
        )
        assistant = _message("assistant", assistant_text)
        state.messages.append(assistant)
        return CopilotResponseDto(
            state=state,
            packet=packet,
            assistant_message=assistant,
            quick_replies=["What should I do next?", "Summarize the packet"],
        )

    def _update_profile(self, profile: CaseProfileDto, message: str) -> CaseProfileDto:
        data = profile.model_dump()
        if not data["goal"]:
            data["goal"] = message
        detected_case_type = _detect_case_type(message)
        if detected_case_type:
            data["case_type"] = detected_case_type
        email = EMAIL_PATTERN.search(message)
        if email:
            data["email"] = _clean(email.group(0))
        phone = PHONE_PATTERN.search(message)
        if phone:
            data["phone"] = _clean(phone.group(0))
        for pattern in NAME_PATTERNS:
            match = pattern.search(message)
            if match:
                data["client_name"] = _clean(match.group(1))
                break
        for pattern in LOCATION_PATTERNS:
            match = pattern.search(message)
            if match:
                data["location"] = _clean(match.group(1))
                break

        missing_before = [field for field in FIELD_ORDER if not data.get(field)]
        current = missing_before[0] if missing_before else None
        if current == "case_type" and not data["case_type"]:
            exact = _detect_case_type(message)
            if exact:
                data["case_type"] = exact
        elif current == "client_name" and not data["client_name"]:
            if len(message.split()) <= 6 and not EMAIL_PATTERN.search(message) and not PHONE_PATTERN.search(message):
                data["client_name"] = message
        elif current == "location" and not data["location"]:
            data["location"] = message
        return CaseProfileDto(**data)

    def _build_packet(self, state: ConversationStateDto) -> CasePacketDto:
        profile = state.profile.model_dump()
        records: list[dict[str, object]] = []
        for field in FIELD_ORDER:
            value = profile.get(field)
            if value:
                records.append(
                    {"field": field, "value": str(value), "source": "Conversation", "confidence": 1.0}
                )
        for document in state.documents:
            for field, value in document.facts.items():
                records.append(
                    {"field": field, "value": value, "source": document.label, "confidence": 0.9}
                )
        frame = pd.DataFrame.from_records(
            records,
            columns=["field", "value", "source", "confidence"],
        )

        evidence: list[EvidenceRowDto] = []
        issues: list[ReviewIssueDto] = []
        for field in FIELD_ORDER:
            if frame.empty:
                rows: list[dict[str, object]] = []
            else:
                rows = frame.loc[frame["field"] == field].to_dict("records")
            values = [
                EvidenceValueDto(
                    value=str(row["value"]),
                    source=str(row["source"]),
                    confidence=float(str(row["confidence"])),
                )
                for row in rows
            ]
            if not values:
                issue_id = f"missing:{field}"
                issues.append(
                    ReviewIssueDto(
                        id=issue_id,
                        kind="missing",
                        field=field,
                        label=FIELD_LABELS[field],
                        message=f"Provide {FIELD_LABELS[field].lower()} through the conversation.",
                        status="open",
                    )
                )
                evidence.append(
                    EvidenceRowDto(
                        field=field,
                        label=FIELD_LABELS[field],
                        status="missing",
                        values=[],
                    )
                )
                continue

            raw_values = [item.value for item in values]
            conflict = _is_conflict(field, raw_values)
            issue_id = f"conflict:{field}"
            resolution = state.resolutions.get(issue_id)
            if conflict:
                issues.append(
                    ReviewIssueDto(
                        id=issue_id,
                        kind="conflict",
                        field=field,
                        label=FIELD_LABELS[field],
                        message=f"Sources disagree about {FIELD_LABELS[field].lower()}.",
                        values=list(dict.fromkeys(raw_values)),
                        status="resolved" if resolution else "open",
                        selected_value=resolution,
                    )
                )
            evidence.append(
                EvidenceRowDto(
                    field=field,
                    label=FIELD_LABELS[field],
                    status="confirmed" if not conflict or resolution else "conflict",
                    values=values,
                )
            )

        if not state.documents:
            issues.append(
                ReviewIssueDto(
                    id="missing:document",
                    kind="missing",
                    field="documents",
                    label="Supporting document",
                    message="Analyze at least one supporting document.",
                    status="open",
                )
            )

        open_issues = [issue for issue in issues if issue.status == "open"]
        completed_fields = sum(1 for field in FIELD_ORDER if profile.get(field))
        completed_document = 1 if state.documents else 0
        completed_review = 1 if not any(issue.kind == "conflict" and issue.status == "open" for issue in issues) else 0
        total = len(FIELD_ORDER) + 2
        readiness = round(((completed_fields + completed_document + completed_review) / total) * 100)
        next_action = self._next_action(open_issues)
        summary = (
            f"Goal: {profile.get('goal') or 'not provided'}. "
            f"Client: {profile.get('client_name') or 'not provided'}. "
            f"Type: {profile.get('case_type') or 'not selected'}. "
            f"Documents: {len(state.documents)}. Open issues: {len(open_issues)}. "
            f"Readiness: {readiness}%."
        )
        return CasePacketDto(
            profile=state.profile,
            evidence=evidence,
            issues=issues,
            readiness=readiness,
            next_action=next_action,
            summary=summary,
        )

    def _next_action(self, open_issues: list[ReviewIssueDto]) -> str:
        if not open_issues:
            return "Review the generated packet and hand it off to the responsible professional."
        issue = open_issues[0]
        if issue.kind == "conflict":
            return f"Choose the supported value for {issue.label.lower()}."
        if issue.field == "documents":
            return "Analyze the first supporting document."
        return issue.message

    def _next_response(
        self,
        state: ConversationStateDto,
        packet: CasePacketDto,
    ) -> tuple[str, list[str]]:
        profile = state.profile.model_dump()
        for field in FIELD_ORDER:
            if profile.get(field):
                continue
            prompts = {
                "goal": "What outcome are you trying to prepare for professional review?",
                "case_type": "Which intake type best matches this work?",
                "client_name": "What is the client's full name?",
                "email": "What email should be used for the approved client profile?",
                "phone": "What phone number should be used for the approved client profile?",
                "location": "What city, state, territory, or address is relevant to this intake?",
            }
            replies = ["Immigration", "Bankruptcy", "General"] if field == "case_type" else []
            return prompts[field], replies
        if not state.documents:
            return (
                "The client profile is structured. Add a supporting document so I can extract facts and compare sources.",
                ["Analyze a document", "Summarize the profile"],
            )
        conflicts = [issue for issue in packet.issues if issue.kind == "conflict" and issue.status == "open"]
        if conflicts:
            return (
                f"I found {len(conflicts)} contradiction(s). Review the evidence panel and choose the correct value.",
                ["Show the contradictions", "What is still missing?"],
            )
        if packet.readiness == 100:
            return (
                "The intake packet is complete. Review the summary and hand it off to the responsible professional.",
                ["Summarize the packet", "Start a new intake"],
            )
        return packet.next_action, ["What is still missing?", "Summarize the packet"]
