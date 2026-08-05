from dataclasses import dataclass

from app.domain.enums import CanonicalField, CaseType, DocumentType


@dataclass(frozen=True, slots=True)
class CaseRequirements:
    required_fields: tuple[CanonicalField, ...]
    required_documents: tuple[DocumentType, ...]


class CaseRequirementFactory:
    _requirements: dict[CaseType, CaseRequirements] = {
        CaseType.IMMIGRATION: CaseRequirements(
            required_fields=(
                CanonicalField.DISPLAY_NAME,
                CanonicalField.EMAIL,
                CanonicalField.PHONE,
                CanonicalField.ADDRESS,
                CanonicalField.DATE_OF_BIRTH,
            ),
            required_documents=(DocumentType.IDENTITY, DocumentType.PROOF_OF_ADDRESS),
        ),
        CaseType.BANKRUPTCY: CaseRequirements(
            required_fields=(
                CanonicalField.DISPLAY_NAME,
                CanonicalField.EMAIL,
                CanonicalField.PHONE,
                CanonicalField.ADDRESS,
            ),
            required_documents=(DocumentType.IDENTITY, DocumentType.FINANCIAL),
        ),
        CaseType.GENERAL: CaseRequirements(
            required_fields=(
                CanonicalField.DISPLAY_NAME,
                CanonicalField.EMAIL,
                CanonicalField.PHONE,
            ),
            required_documents=(DocumentType.IDENTITY,),
        ),
    }

    @classmethod
    def create(cls, case_type: CaseType) -> CaseRequirements:
        return cls._requirements[case_type]
