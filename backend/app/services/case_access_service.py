"""
Server-side case-ownership authorization — the fix for
docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §3/§5: "BankruptcyCaseDto
.owner_user_id exists as a field but is never compared against the
authenticated user anywhere [...] Any authenticated client or attorney can
submit any case_id/case payload and the backend processes it."

Ownership rule (demo scope, documented per the task instructions since there
is no case-assignment table in this demo):
  - `client` role: may only access/submit a case whose *persisted*
    `owner_user_id` equals their own `current_user.id`. A case that has
    never been submitted before (`get_owner_user_id` returns None) is
    treated as a new case the client is creating — `owner_user_id` is set
    to the authenticated client's id server-side, ignoring whatever the
    request body claims, so a client can never plant another user's id as
    the owner of a case they are creating.
  - `attorney` role: this demo ships exactly one attorney account and no
    case-assignment model, so "attorney may access assigned cases" is
    approximated as "attorney may access any existing case" — a real
    multi-attorney deployment would replace this with a `case_assignments`
    table and narrow the check accordingly (noted here, not built, since
    the demo only ever has one attorney to assign to). Attorneys cannot
    *create* a new case via these endpoints (a case must already have a
    client owner) — they can only review one a client has already
    submitted.

This is deliberately NOT a pure `Depends(...)` on the route signature
(mirroring `CurrentUserDep`'s `Annotated[..., Depends(...)]` idiom, per the
task's instruction) because the value it needs to authorize (`case_id`,
and — for submission — the claimed `owner_user_id`) lives inside the
request body, not a path/query parameter FastAPI can resolve before the
body is parsed. `CaseAccessDep` still injects the *service* the same way
`CurrentUserDep` injects the user; routers call one of its methods with the
body-derived case id once they have it.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.repositories.case_repository import CaseRepositoryDep, SqlAlchemyCaseRepository
from app.schemas.auth import AuthUserDto
from app.schemas.bankruptcy import BankruptcyCaseDto


class CaseAccessService:
    def __init__(self, case_repository: SqlAlchemyCaseRepository) -> None:
        self._cases = case_repository

    def authorize_for_submission(
        self, case: BankruptcyCaseDto, current_user: AuthUserDto
    ) -> BankruptcyCaseDto:
        """Used by bankruptcy.analyze/guide, which receive the full case
        payload. Returns the case with a server-verified `owner_user_id`
        (never trusting the client-submitted one) or raises 403/404."""
        existing_owner = self._cases.get_owner_user_id(case.id)

        if existing_owner is None:
            if current_user.role != "client":
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="This case does not exist yet; only its owning client can create it.",
                )
            return case.model_copy(update={"owner_user_id": current_user.id})

        self._ensure_role_can_access(existing_owner, current_user)
        return case.model_copy(update={"owner_user_id": existing_owner})

    def authorize_for_case_id(self, case_id: str, current_user: AuthUserDto) -> str:
        """Used by documents.analyze, which only has a bare `case_id` (no
        full case payload to persist). Returns the owner_user_id to record
        the document under, or raises 403/404."""
        existing_owner = self._cases.get_owner_user_id(case_id)

        if existing_owner is None:
            if current_user.role != "client":
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="This case does not exist yet; only its owning client can create it.",
                )
            return current_user.id

        self._ensure_role_can_access(existing_owner, current_user)
        return existing_owner

    def case_exists(self, case_id: str) -> bool:
        return self._cases.get_owner_user_id(case_id) is not None

    def _ensure_role_can_access(self, owner_user_id: str, current_user: AuthUserDto) -> None:
        if current_user.role == "attorney":
            return
        if current_user.id == owner_user_id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this case.",
        )


def get_case_access_service(case_repository: CaseRepositoryDep) -> CaseAccessService:
    return CaseAccessService(case_repository)


CaseAccessDep = Annotated[CaseAccessService, Depends(get_case_access_service)]
