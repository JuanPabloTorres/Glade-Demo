"""
Real Strands integration (ADR 0002).

`test_agent_runtime.py` stubs `AgentRuntime._run_agents` so it can assert on
composition logic without a model. That leaves a gap this module closes: it
builds the **actual** orchestrator through `AgentFactory`, so real
`strands.Agent` objects are constructed, real `@tool` specs are generated
from our docstrings and type hints, and real `Agent.as_tool()` delegation is
registered. A mistake in a docstring, a type hint, or a tool name fails here
rather than at the first live request.

No LLM is involved: nothing below calls `stream`. These are assertions about
the tool surface the model would be handed — which is exactly where the
security properties live.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.ai.agents.factory import ATTORNEY_AGENT, SPECIALISTS, AgentFactory
from app.ai.tools.case_tools import CaseTools
from app.schemas.assistant import CaseContextDto
from app.schemas.bankruptcy import BankruptcyCaseDto, UserRole
from app.services.bankruptcy_service import BankruptcyAnalysisService
from app.services.case_context_builder import CaseContextBuilder
from app.services.documents.index import CaseDocumentIndex

_AUTHORIZATION_PARAMETERS = {"case_id", "role", "owner_user_id", "user_id", "tenant_id"}


def _context(role: UserRole = "client") -> CaseContextDto:
    case = BankruptcyCaseDto(
        id="case-wiring",
        owner_user_id="client-demo",
        client_name="Elena Rivera",
        client_email="client@freshstart.demo",
        status="collecting_information",
        attorney_notes="Nota privada.",
    )
    analysis = BankruptcyAnalysisService().analyze(case)
    return CaseContextBuilder().build(case, analysis, role, "es-PR")


def _factory(role: UserRole, index: CaseDocumentIndex | None = None) -> AgentFactory:
    context = _context(role)
    return AgentFactory(
        # model=None is accepted by strands at construction; nothing here ever
        # streams, so no model is needed to inspect the tool surface.
        model=None,
        tools=CaseTools(context=context, document_index=index or CaseDocumentIndex()),
        language=context.language,
        role=role,
    )


def _input_schema(agent: Any, tool_name: str) -> dict[str, Any]:
    return agent.tool_registry.registry[tool_name].tool_spec["inputSchema"]["json"]


class TestOrchestratorConstruction:
    def test_client_orchestrator_builds_with_only_non_attorney_specialists(self) -> None:
        orchestrator = _factory("client").create_orchestrator()
        assert ATTORNEY_AGENT not in orchestrator.tool_names
        assert set(orchestrator.tool_names) == {
            spec.name for spec in SPECIALISTS if not spec.attorney_only
        }

    def test_attorney_orchestrator_gains_the_attorney_specialist(self) -> None:
        orchestrator = _factory("attorney").create_orchestrator()
        assert ATTORNEY_AGENT in orchestrator.tool_names
        assert set(orchestrator.tool_names) == {spec.name for spec in SPECIALISTS}

    def test_orchestrator_holds_no_case_data_tool_of_its_own(self) -> None:
        """Every fact must arrive through a specialist. If a data tool ever
        leaks onto the orchestrator, the delegation boundary stops meaning
        anything."""
        orchestrator = _factory("attorney").create_orchestrator()
        case_tool_names = {name for spec in SPECIALISTS for name in spec.tool_names}
        assert not case_tool_names & set(orchestrator.tool_names)


class TestSpecialistToolSurface:
    @pytest.mark.parametrize("spec", SPECIALISTS, ids=lambda spec: spec.name)
    def test_each_specialist_registers_exactly_its_declared_tools(self, spec: Any) -> None:
        _, agent = _factory("attorney")._create_specialist(spec)
        assert set(agent.tool_names) == set(spec.tool_names)

    @pytest.mark.parametrize("spec", SPECIALISTS, ids=lambda spec: spec.name)
    def test_no_tool_exposes_an_authorization_parameter_to_the_model(self, spec: Any) -> None:
        """The case-binding guarantee, asserted against the schema the model
        is actually handed rather than the Python signature.

        This is the version that would catch a regression introduced through
        the SDK layer — e.g. a `@tool` whose docstring documents a `case_id`
        argument that a model then tries to supply.
        """
        _, agent = _factory("attorney")._create_specialist(spec)
        for tool_name in spec.tool_names:
            properties = set(_input_schema(agent, tool_name).get("properties", {}))
            leaked = properties & _AUTHORIZATION_PARAMETERS
            assert not leaked, f"{spec.name}.{tool_name} exposes {leaked} to the model"

    def test_search_tool_takes_only_a_query(self) -> None:
        """`search_case_documents` is the one tool that reaches outside the
        pre-reduced context, so its parameter list is worth pinning."""
        _, agent = _factory("client")._create_specialist(
            next(spec for spec in SPECIALISTS if spec.name == "documents_agent")
        )
        schema = _input_schema(agent, "search_case_documents")
        assert set(schema["properties"]) == {"query"}
        assert schema["required"] == ["query"]

    def test_tool_descriptions_reach_the_model(self) -> None:
        """Strands builds the description from the docstring. An empty one
        would leave a model guessing what a tool does."""
        _, agent = _factory("attorney")._create_specialist(
            next(spec for spec in SPECIALISTS if spec.name == ATTORNEY_AGENT)
        )
        for tool_name in agent.tool_names:
            description = agent.tool_registry.registry[tool_name].tool_spec["description"]
            assert description and description.strip()


class TestToolsExecuteAgainstTheBoundCase:
    def test_a_registered_tool_returns_this_case_and_isolates_others(self) -> None:
        index = CaseDocumentIndex()
        index.add_document("case-wiring", ["Elena reporta ingreso de $2,000 mensuales."])
        index.add_document("case-other", ["Miguel debe $150,000 de hipoteca."])

        _, agent = _factory("client", index)._create_specialist(
            next(spec for spec in SPECIALISTS if spec.name == "documents_agent")
        )
        # Invoke through the object the registry holds, i.e. the same bound
        # callable Strands would dispatch a tool call to.
        result = agent.tool_registry.registry["search_case_documents"]._tool_func(
            query="hipoteca"
        )
        excerpts = " ".join(result["excerpts"])
        assert "Miguel" not in excerpts
        assert "150,000" not in excerpts


class TestOpenAIModelWiring:
    """
    The OpenAI path, built for real against the installed SDK.

    A live call needs a key and a network, so what is verifiable here is the
    part that was actually wrong: which model id the factory hands over. The
    call itself is covered by `docs/evidence/live-agent-turns.json` on the
    Ollama path.
    """

    def test_it_uses_the_openai_model_setting_not_the_transformers_one(self) -> None:
        from app.ai.model_factory import ModelFactory
        from app.core.config import Settings

        settings = Settings(
            ai_provider="openai",
            openai_api_key="sk-test-not-a-real-key",
            openai_model="gpt-4o-mini",
            # The transformers provider's setting, left at a HuggingFace repo
            # id. Handing this to OpenAI fails every call, and AgentRuntime
            # turns a failed call into a silent degrade — so the whole agent
            # would look "configured but never answering".
            ai_model_id="Qwen/Qwen3-0.6B",
        )

        model = ModelFactory(settings).create()

        config = model.get_config()
        assert config["model_id"] == "gpt-4o-mini"

    def test_a_missing_key_is_a_degrade_signal_not_a_crash(self) -> None:
        from app.ai.model_factory import MissingModelCredentialsError, ModelFactory
        from app.core.config import Settings

        with pytest.raises(MissingModelCredentialsError):
            ModelFactory(Settings(ai_provider="openai", openai_api_key=None)).create()


class TestOpenAICompatibleProviders:
    """
    Pointing the `openai` provider at somebody else's endpoint.

    OpenAI has no meaningful free tier, and the agent is the part of this
    product worth demonstrating — so the demo has to be able to run against
    Groq, Cerebras, OpenRouter, Together, or Gemini's compatibility endpoint.
    """

    def test_a_base_url_switches_to_the_chat_completions_api(self) -> None:
        """Not merely a different host: a different API.

        The default path uses the *Responses* API, which today only OpenAI
        implements. Sending that shape to a compatibility endpoint fails every
        call, and `AgentRuntime` converts a failed call into a silent degrade —
        so the symptom would be "the agent never answers" with nothing saying
        why.
        """
        from strands.models.openai import OpenAIModel

        from app.ai.model_factory import ModelFactory
        from app.core.config import Settings

        model = ModelFactory(
            Settings(
                ai_provider="openai",
                openai_api_key="gsk-test-not-a-real-key",
                openai_base_url="https://api.groq.com/openai/v1",
                openai_model="llama-3.3-70b-versatile",
            )
        ).create()

        assert isinstance(model, OpenAIModel)
        assert model.get_config()["model_id"] == "llama-3.3-70b-versatile"

    def test_no_base_url_still_means_openai_itself(self) -> None:
        from strands.models.openai_responses import OpenAIResponsesModel

        from app.ai.model_factory import ModelFactory
        from app.core.config import Settings

        model = ModelFactory(
            Settings(ai_provider="openai", openai_api_key="sk-test-not-a-real-key")
        ).create()

        assert isinstance(model, OpenAIResponsesModel)

    def test_a_blank_base_url_is_not_a_base_url(self) -> None:
        # An unset Vercel variable arrives as "", not as None.
        from strands.models.openai_responses import OpenAIResponsesModel

        from app.ai.model_factory import ModelFactory
        from app.core.config import Settings

        model = ModelFactory(
            Settings(
                ai_provider="openai", openai_api_key="sk-test-not-a-real-key", openai_base_url="  "
            )
        ).create()

        assert isinstance(model, OpenAIResponsesModel)

    def test_the_token_cap_uses_the_chat_completions_spelling(self) -> None:
        """`max_tokens`, not `max_output_tokens`.

        The two APIs name the same limit differently. Some compatibility
        endpoints reject the unknown parameter and others ignore it silently;
        either way the cap the deployment configured would not be applied.
        """
        from app.ai.model_factory import ModelFactory
        from app.core.config import Settings

        model = ModelFactory(
            Settings(
                ai_provider="openai",
                openai_api_key="gsk-test-not-a-real-key",
                openai_base_url="https://api.groq.com/openai/v1",
                ai_max_output_tokens=1234,
            )
        ).create()

        params = model.get_config()["params"]
        assert params["max_tokens"] == 1234
        assert "max_output_tokens" not in params
