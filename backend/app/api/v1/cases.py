from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import get_case_service, get_current_user
from app.domain.enums import IntakeSectionKey
from app.domain.models import User
from app.schemas.cases import CaseCreate, CaseRead, CaseUpdate, SectionUpsert
from app.services.case_service import CaseService

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=list[CaseRead])
def list_cases(
    service: CaseService = Depends(get_case_service),
    current_user: User = Depends(get_current_user),
) -> list[CaseRead]:
    return service.list_cases(current_user)


@router.post("", response_model=CaseRead, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreate,
    service: CaseService = Depends(get_case_service),
    current_user: User = Depends(get_current_user),
) -> CaseRead:
    return service.create_case(payload, current_user)


@router.get("/{case_id}", response_model=CaseRead)
def get_case(
    case_id: str,
    service: CaseService = Depends(get_case_service),
    current_user: User = Depends(get_current_user),
) -> CaseRead:
    return service.get_case(case_id, current_user)


@router.patch("/{case_id}", response_model=CaseRead)
def update_case(
    case_id: str,
    payload: CaseUpdate,
    service: CaseService = Depends(get_case_service),
    current_user: User = Depends(get_current_user),
) -> CaseRead:
    return service.update_case(case_id, payload, current_user)


@router.put("/{case_id}/sections/{section_key}", response_model=CaseRead)
def upsert_section(
    case_id: str,
    section_key: IntakeSectionKey,
    payload: SectionUpsert,
    service: CaseService = Depends(get_case_service),
    current_user: User = Depends(get_current_user),
) -> CaseRead:
    return service.upsert_section(case_id, section_key, payload, current_user)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(
    case_id: str,
    service: CaseService = Depends(get_case_service),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.delete_case(case_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
