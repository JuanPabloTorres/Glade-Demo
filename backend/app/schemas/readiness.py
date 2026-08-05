from app.schemas.common import ApiModel


class ReadinessItemDto(ApiModel):
    key: str
    label: str
    complete: bool
    source: str


class ReadinessDto(ApiModel):
    score: int
    complete_items: int
    total_items: int
    open_conflicts: int
    items: list[ReadinessItemDto]
