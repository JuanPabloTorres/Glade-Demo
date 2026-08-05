from app.domain.enums import CaseType, ConflictStatus, DocumentStatus, DocumentType
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
                    source="canonical data",
                )
            )

        processed_types = {
            DocumentType(document.document_type)
            for document in matter.documents
            if document.status == DocumentStatus.PROCESSED.value
        }
        for document_type in requirements.required_documents:
            items.append(
                ReadinessItemDto(
                    key=f"document:{document_type.value}",
                    label=self._document_labels[document_type],
                    complete=document_type in processed_types,
                    source="processed document",
                )
            )

        open_conflicts = sum(
            1 for conflict in matter.conflicts if conflict.status == ConflictStatus.OPEN.value
        )
        items.append(
            ReadinessItemDto(
                key="review:conflicts",
                label="Canonical data review",
                complete=open_conflicts == 0,
                source="human review",
            )
        )

        complete_items = sum(1 for item in items if item.complete)
        score = round((complete_items / len(items)) * 100) if items else 100
        return ReadinessDto(
            score=score,
            complete_items=complete_items,
            total_items=len(items),
            open_conflicts=open_conflicts,
            items=items,
        )
