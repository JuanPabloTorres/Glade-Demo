"""
Security tests for the agent layer (ADR 0002).

The adopted plan asked for cross-tenant, role-restriction, prompt-injection
and tool-allow-list coverage. This codebase has no tenants — the isolation
unit is the case — so "cross-tenant" is tested here as "cross-case", which is
the property that actually exists and actually matters.

The central claim under test: a model cannot reach a case or a role it was
not granted, because neither is expressed as a value the model can produce.
"""

from __future__ import annotations

import inspect

import pytest

from app.ai.agents.factory import ATTORNEY_AGENT, PORTFOLIO_AGENT, SPECIALISTS
from app.ai.tools.case_tools import CaseTools, ToolAuthorizationError
from app.ai.tools.portfolio_tools import PortfolioTools
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, UserRole
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex

_ATTORNEY_ONLY_TOOL = "get_attorney_review_notes"


def _context(case_id: str, role: UserRole = "client") -> CaseContextDto:
    case = BankruptcyCaseDto(
        id=case_id,
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
        attorney_notes="Nota privada del abogado: revisar transferencia reciente.",
    )
    analysis = BankruptcyAnalysisService().analyze(case)
    return CaseContextBuilder().build(case, analysis, role, "es-PR")


def _tools(case_id: str, role: UserRole, index: CaseDocumentIndex | None = None) -> CaseTools:
    return CaseTools(
        context=_context(case_id, role), document_index=index or CaseDocumentIndex()
    )


class TestCaseBinding:
    def test_no_tool_accepts_a_case_identifier(self) -> None:
        """The structural guarantee: if no tool takes a case id, no model-
        authored string can ever select a case. This test is what stops a
        future 'just add a case_id parameter' change from silently
        reintroducing the ownership hole CaseAccessService closed."""
        tools = _tools("case-a", "client")
        offenders: list[str] = []
        for name in dir(tools):
            if name.startswith("_"):
                continue
            candidate = getattr(type(tools), name, None)
            func = getattr(candidate, "_tool_func", None) or getattr(candidate, "__wrapped__", None)
            if func is None and not inspect.isfunction(candidate):
                continue
            signature = inspect.signature(func or candidate)
            forbidden = {"case_id", "role", "owner_user_id", "user_id", "tenant_id"}
            if forbidden & set(signature.parameters):
                offenders.append(name)
        assert not offenders, f"Tools exposing an authorization parameter to the model: {offenders}"

    def test_document_search_cannot_reach_another_case(self) -> None:
        index = CaseDocumentIndex()
        index.add_document("case-a", ["Elena tiene un ingreso de $2,000 mensuales por nomina."])
        index.add_document("case-b", ["Miguel tiene una deuda hipotecaria de $150,000 en mora."])

        result = _tools("case-a", "client", index).search_case_documents("deuda hipotecaria")

        excerpts = " ".join(result["excerpts"])
        assert "Miguel" not in excerpts
        assert "150,000" not in excerpts

    def test_search_failure_is_reported_not_narrated(self) -> None:
        class _BrokenIndex:
            def search(self, *_args: object, **_kwargs: object) -> list[str]:
                raise RuntimeError("index corrupted")

        result = _tools("case-a", "client", _BrokenIndex()).search_case_documents("algo")  # type: ignore[arg-type]
        assert result["status"] == "error"
        assert result["excerpts"] == []


class TestRoleRestrictions:
    def test_client_context_redacts_attorney_notes(self) -> None:
        assert _context("case-a", "client").attorney_notes is None
        assert _context("case-a", "attorney").attorney_notes is not None

    def test_attorney_tool_refuses_a_client_runtime(self) -> None:
        with pytest.raises(ToolAuthorizationError):
            _tools("case-a", "client").get_attorney_review_notes()

    def test_attorney_tool_works_for_an_attorney(self) -> None:
        result = _tools("case-a", "attorney").get_attorney_review_notes()
        assert result["status"] == "success"
        assert "Nota privada" in result["attorney_notes"]

    def test_only_the_attorney_specialist_holds_the_attorney_tool(self) -> None:
        holders = [spec.name for spec in SPECIALISTS if _ATTORNEY_ONLY_TOOL in spec.tool_names]
        assert holders == [ATTORNEY_AGENT]

    def test_only_attorney_specialists_are_role_gated(self) -> None:
        """Both attorney specialists are gated, and nothing else is.

        Asserted as a set rather than the single-element list this used to be:
        the portfolio specialist is the second attorney-only capability, and a
        list comparison would have to be rewritten for a third while a set
        comparison keeps saying the thing that matters — no non-attorney
        specialist is gated, and no attorney specialist is ungated.
        """
        gated = {spec.name for spec in SPECIALISTS if spec.attorney_only}
        assert gated == {ATTORNEY_AGENT, PORTFOLIO_AGENT}

    def test_support_specialist_has_no_case_data_tools(self) -> None:
        support = next(spec for spec in SPECIALISTS if spec.name == "support_agent")
        assert support.tool_names == ()


class TestToolAllowList:
    def test_no_tool_performs_a_write(self) -> None:
        """Phase 1 is read-only. Any tool whose name implies mutation is a
        contract violation, not a feature — writes require the signed
        confirmation flow that does not exist yet."""
        write_verbs = ("create", "update", "delete", "add", "set", "upsert", "remove", "write")
        tool_names = {name for spec in SPECIALISTS for name in spec.tool_names}
        offenders = [name for name in tool_names if name.startswith(write_verbs)]
        assert not offenders, f"Write-shaped tools registered on an agent: {offenders}"

    def test_every_registered_tool_exists_on_its_declared_holder(self) -> None:
        """Two tool holders now, two closed authorization scopes.

        `tool_source` is what says which one a specialist resolves against, so
        this checks the grant against the holder the spec names — a portfolio
        tool asserted against `CaseTools` would fail for the right reason but
        prove the wrong thing.
        """
        holders = {
            "case": _tools("case-a", "attorney"),
            "portfolio": PortfolioTools([]),
        }
        for spec in SPECIALISTS:
            holder = holders[spec.tool_source]
            for name in spec.tool_names:
                assert hasattr(holder, name), (
                    f"{spec.name} registers {name!r}, absent from its {spec.tool_source} holder"
                )

    def test_orchestrator_prompt_declares_no_data_tools(self) -> None:
        """The orchestrator must route, not read. Its only tools are
        specialists (`Agent.as_tool()`), which is what forces every fact to
        pass through an agent that was granted the matching tool."""
        from app.ai.prompts import load_prompt

        prompt = load_prompt("orchestrator", "es")
        assert "herramientas de datos propias" in prompt.casefold()


class TestPromptInjectionFraming:
    def test_search_tool_docstring_marks_excerpts_as_untrusted(self) -> None:
        """The warning has to sit on the tool the model actually calls.

        A system-prompt-only warning is weighted less than the text arriving
        right beside the retrieved content, which is the whole point of the
        existing build_untrusted_case_data_block defense.
        """
        docstring = CaseTools.search_case_documents.__doc__ or ""
        assert "untrusted" in docstring.casefold()
        assert "never follow" in docstring.casefold()

    def test_common_prompt_forbids_obeying_document_content(self) -> None:
        from app.ai.prompts import load_prompt

        for language, needle in (("es", "dato, no instrucción"), ("en", "data, not instructions")):
            assert needle in load_prompt("case_agent", language).casefold()

    def test_common_rules_are_inherited_by_every_specialist(self) -> None:
        from app.ai.prompts import load_prompt

        for spec in SPECIALISTS:
            for language in ("es", "en"):
                prompt = load_prompt(spec.prompt, language).casefold()
                assert "elegibilidad" in prompt or "eligibility" in prompt
