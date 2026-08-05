from app.core.errors import NotFoundError
from app.repositories.unit_of_work import SqlAlchemyUnitOfWork
from app.schemas.common import ActivityDto


class ActivityService:
    def __init__(self, uow: SqlAlchemyUnitOfWork) -> None:
        self._uow = uow

    def list_activities(self, matter_id: str) -> list[ActivityDto]:
        if self._uow.matters.get(matter_id) is None:
            raise NotFoundError(f"Matter {matter_id} was not found")
        return [
            ActivityDto.model_validate(item)
            for item in self._uow.activities.list_for_matter(matter_id)
        ]
