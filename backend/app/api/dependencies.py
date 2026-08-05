from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.providers.document_intelligence.factory import DocumentIntelligenceProviderFactory
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.services.activity_service import ActivityService
from app.services.conflict_service import ConflictService
from app.services.document_service import DocumentService
from app.services.matter_service import MatterService
from app.services.readiness_service import ReadinessService

SessionDep = Annotated[Session, Depends(get_db_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_uow(session: SessionDep) -> SqlAlchemyUnitOfWork:
    return SqlAlchemyUnitOfWork(session)


UowDep = Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]


def get_readiness_service() -> ReadinessService:
    return ReadinessService()


ReadinessServiceDep = Annotated[ReadinessService, Depends(get_readiness_service)]


def get_matter_service(uow: UowDep, readiness: ReadinessServiceDep) -> MatterService:
    return MatterService(uow, readiness)


def get_document_service(uow: UowDep, settings: SettingsDep) -> DocumentService:
    provider = DocumentIntelligenceProviderFactory.create(settings.document_intelligence_provider)
    return DocumentService(uow, provider)


def get_conflict_service(uow: UowDep) -> ConflictService:
    return ConflictService(uow)


def get_activity_service(uow: UowDep) -> ActivityService:
    return ActivityService(uow)


MatterServiceDep = Annotated[MatterService, Depends(get_matter_service)]
DocumentServiceDep = Annotated[DocumentService, Depends(get_document_service)]
ConflictServiceDep = Annotated[ConflictService, Depends(get_conflict_service)]
ActivityServiceDep = Annotated[ActivityService, Depends(get_activity_service)]
