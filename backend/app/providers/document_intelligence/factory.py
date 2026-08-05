from app.providers.document_intelligence.base import DocumentIntelligenceProvider
from app.providers.document_intelligence.rules import RulesDocumentIntelligenceProvider


class DocumentIntelligenceProviderFactory:
    @staticmethod
    def create(provider_name: str) -> DocumentIntelligenceProvider:
        providers: dict[str, type[RulesDocumentIntelligenceProvider]] = {
            "rules": RulesDocumentIntelligenceProvider,
        }
        try:
            provider_type = providers[provider_name]
        except KeyError as exc:
            raise ValueError(f"Unsupported document intelligence provider: {provider_name}") from exc
        return provider_type()
