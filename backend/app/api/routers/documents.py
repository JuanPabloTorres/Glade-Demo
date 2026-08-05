from fastapi import APIRouter, status

from app.api.dependencies import DocumentServiceDep
from app.core.contracts import get_contract_registry
from app.schemas.document import DocumentCreateDto, DocumentDto

router = APIRouter(tags=["Documents"])
registry = get_contract_registry()
create_contract = registry.get("documents.create")
list_contract = registry.get("documents.list")


@router.post(
    create_contract.path,
    response_model=DocumentDto,
    status_code=status.HTTP_201_CREATED,
    operation_id=create_contract.operation_id,
)
def create_document(
    matter_id: str, dto: DocumentCreateDto, service: DocumentServiceDep
) -> DocumentDto:
    return service.create_document(matter_id, dto)


@router.get(
    list_contract.path,
    response_model=list[DocumentDto],
    operation_id=list_contract.operation_id,
)
def list_documents(matter_id: str, service: DocumentServiceDep) -> list[DocumentDto]:
    return service.list_documents(matter_id)
