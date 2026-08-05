from app.domain.enums import CaseType, ConflictStatus, DocumentType
from app.domain.models import Matter
from app.domain.requirements import CaseRequirementFactory
from app.schemas.readiness import ReadinessDto, ReadinessItemDto


class ReadinessService:
    _field_labels = {
        "display_name": "Client name",
        "email": "Email",
        "phone": "Phone",
        "address": "Address",
        "date_of_birth": "Date of birth",
    }
    _document_labels = {
        DocumentType.IDENTITY: "Identity document",
        DocumentType.PROOF_OF_ADDRESS: "Proof of address",
        DocumentType.FINANCIAL: "Financial document",
        DocumentType.SUPPORTING: "Supporting document",
    }

    def calculate(self, matter: Matter) -> ReadinessDto:
        requirements = CaseRequirementFactory.create(CaseType(matter.case_type))
        items: list[ReadinessItemDto] = []
        for field in requirements.required_fields:
            value = getattr(matter, field.value)
            items.append(
                ReadinessItemDto(
                    key=f"field:{field.value}",
                    label=self._field_labels[field.value],
                    complete=bool(value and str(value).strip()),
                    source="intake",
                )
            )

        available_types = {DocumentType(document.document_type) for document in matter.documents}
        for document_type in requirements.required_documents:
            items.append(
                ReadinessItemDto(
                    key=f"document:{document_type.value}",
                    label=self._document_labels[document_type],
                    complete=document_type in available_types,
                    source="document",
                )
            )

        open_conflicts = sum(
            1 for conflict in matter.conflicts if conflict.status == ConflictStatus.OPEN.value
        )
        complete_items = sum(1 for item in items if item.complete)
        base_score = round((complete_items / len(items)) * 100) if items else 100
        score = max(0, base_score - (open_conflicts * 10))
        return ReadinessDto(
            score=score,
            complete_items=complete_items,
            total_items=len(items),
            open_conflicts=open_conflicts,
            items=items,
        )
