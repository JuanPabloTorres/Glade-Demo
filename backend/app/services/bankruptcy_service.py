from __future__ import annotations

from collections.abc import Iterable

import pandas as pd  # type: ignore[import-untyped]

from app.ai.providers import BaseAIProvider, get_provider_for_settings
from app.core.config import Settings
from app.schemas.bankruptcy import (
    BankruptcyCaseDto,
    CaseAnalysisDto,
    GuidanceRequestDto,
    GuidanceResponseDto,
)

FREQUENCY_MULTIPLIERS = {
    "weekly": 52 / 12,
    "biweekly": 26 / 12,
    "semimonthly": 2,
    "monthly": 1,
    "quarterly": 1 / 3,
    "annual": 1 / 12,
}

COMMON_EVIDENCE = (
    "Identificación vigente",
    "Talones de pago de los últimos 60 días",
    "Estados bancarios recientes",
    "Planillas o transcripciones contributivas recientes",
    "Estados de cuenta de acreedores",
    "Contrato de arrendamiento o estado hipotecario",
    "Estado de préstamo de vehículo, si aplica",
    "Certificado de orientación crediticia, cuando corresponda",
)


def _round_money(value: float) -> float:
    return round(value + 0.0, 2)


def _monthly_amount(amount: float, frequency: str) -> float:
    return amount * FREQUENCY_MULTIPLIERS.get(frequency, 1)


def _sum_frame(frame: pd.DataFrame, column: str) -> float:
    if frame.empty or column not in frame:
        return 0.0
    return float(frame[column].fillna(0).sum())


def _contains_any(values: Iterable[str], candidates: set[str]) -> bool:
    normalized = {value.strip().casefold() for value in values}
    return any(candidate.casefold() in normalized for candidate in candidates)


class BankruptcyAnalysisService:
    def analyze(self, case: BankruptcyCaseDto) -> CaseAnalysisDto:
        income_rows = []
        for item in case.incomes:
            gross_monthly = _monthly_amount(item.gross_amount, item.frequency)
            net_source = item.net_amount if item.net_amount is not None else item.gross_amount
            net_monthly = _monthly_amount(net_source, item.frequency)
            income_rows.append(
                {
                    "gross_monthly": gross_monthly,
                    "net_monthly": net_monthly,
                    "evidence": len(item.evidence_ids),
                }
            )
        income_frame = pd.DataFrame.from_records(income_rows)
        expense_frame = pd.DataFrame.from_records(
            [
                {
                    "monthly_amount": item.monthly_amount,
                    "evidence": len(item.evidence_ids),
                }
                for item in case.expenses
            ]
        )
        debt_frame = pd.DataFrame.from_records(
            [
                {
                    "type": item.debt_type,
                    "balance": item.balance,
                    "delinquent": item.delinquent_amount,
                    "lawsuit": item.collection_lawsuit,
                }
                for item in case.debts
            ]
        )
        asset_frame = pd.DataFrame.from_records(
            [
                {
                    "value": item.estimated_value,
                    "loan": item.loan_balance,
                }
                for item in case.assets
            ]
        )

        monthly_gross = _sum_frame(income_frame, "gross_monthly")
        monthly_net = _sum_frame(income_frame, "net_monthly")
        monthly_expenses = _sum_frame(expense_frame, "monthly_amount")
        monthly_cash_flow = monthly_net - monthly_expenses
        total_debt = _sum_frame(debt_frame, "balance")
        total_assets = _sum_frame(asset_frame, "value")
        asset_loans = _sum_frame(asset_frame, "loan")

        def debt_total(debt_type: str) -> float:
            if debt_frame.empty:
                return 0.0
            return float(
                debt_frame.loc[debt_frame["type"] == debt_type, "balance"].fillna(0).sum()
            )

        missing_items = self._missing_items(case)
        required_evidence = self._required_evidence(case)
        evidence_types = [item.evidence_type for item in case.evidence if item.status != "missing"]
        matched_evidence = sum(
            1
            for requirement in required_evidence
            if self._evidence_matches(requirement, evidence_types)
        )
        evidence_score = round((matched_evidence / max(len(required_evidence), 1)) * 100)

        completed_sections = [
            bool(case.client_name and case.client_email),
            bool(case.household.marital_status and case.household.housing_status),
            bool(case.incomes),
            bool(case.expenses),
            bool(case.debts),
            bool(case.assets),
            bool(case.evidence),
            bool(case.client_goal),
        ]
        completion_score = round((sum(completed_sections) / len(completed_sections)) * 100)

        warnings = self._warnings(case, monthly_cash_flow, total_debt, monthly_gross)
        discussion_points = self._discussion_points(case, monthly_cash_flow)
        next_steps = self._next_steps(case, missing_items, warnings)

        return CaseAnalysisDto(
            monthly_gross_income=_round_money(monthly_gross),
            monthly_net_income=_round_money(monthly_net),
            monthly_expenses=_round_money(monthly_expenses),
            monthly_cash_flow=_round_money(monthly_cash_flow),
            total_debt=_round_money(total_debt),
            secured_debt=_round_money(debt_total("secured")),
            priority_debt=_round_money(debt_total("priority")),
            unsecured_debt=_round_money(debt_total("unsecured")),
            total_asset_value=_round_money(total_assets),
            net_asset_value=_round_money(max(total_assets - asset_loans, 0)),
            completion_score=completion_score,
            evidence_score=evidence_score,
            missing_items=missing_items,
            warnings=warnings,
            discussion_points=discussion_points,
            chapter_7_questions=self._chapter_7_questions(case, monthly_cash_flow),
            chapter_13_questions=self._chapter_13_questions(case, monthly_cash_flow),
            required_evidence=required_evidence,
            next_steps=next_steps,
        )

    def _missing_items(self, case: BankruptcyCaseDto) -> list[str]:
        missing: list[str] = []
        if not case.household.marital_status:
            missing.append("Estado civil y composición del hogar")
        if not case.household.housing_status:
            missing.append("Situación de vivienda")
        if not case.incomes:
            missing.append("Fuentes de ingreso")
        if not case.expenses:
            missing.append("Gastos mensuales")
        if not case.debts:
            missing.append("Lista de acreedores y deudas")
        if not case.assets:
            missing.append("Bienes y activos")
        if not case.evidence:
            missing.append("Documentos de respaldo")
        if not case.client_goal:
            missing.append("Meta principal y urgencia del cliente")
        return missing

    def _required_evidence(self, case: BankruptcyCaseDto) -> list[str]:
        required = list(COMMON_EVIDENCE)
        if any(item.category.casefold() == "self-employment" for item in case.incomes):
            required.append("Registro de ingresos y gastos del negocio")
        if any(item.debt_type == "secured" for item in case.debts):
            required.append("Documentos de gravámenes y garantías")
        if any(item.collection_lawsuit for item in case.debts):
            required.append("Demanda, embargo o notificación de cobro")
        if case.household.recent_property_transfer:
            required.append("Documentos de transferencias recientes de propiedad")
        return required

    def _evidence_matches(self, requirement: str, evidence_types: list[str]) -> bool:
        key_words = {word for word in requirement.casefold().split() if len(word) > 4}
        return any(
            key_words.intersection(evidence.casefold().split())
            for evidence in evidence_types
        )

    def _warnings(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
        total_debt: float,
        monthly_gross: float,
    ) -> list[str]:
        warnings: list[str] = []
        if monthly_cash_flow < 0:
            warnings.append("El presupuesto refleja un déficit mensual.")
        if monthly_gross > 0 and total_debt > monthly_gross * 18:
            warnings.append("La deuda total es alta frente al ingreso bruto anual estimado.")
        if any(item.delinquent_amount > 0 for item in case.debts):
            warnings.append("Existen cuentas en atraso que deben revisarse con prioridad.")
        if any(item.collection_lawsuit for item in case.debts):
            warnings.append("Se reportó una demanda, embargo o acción de cobro activa.")
        if any(item.debt_type == "priority" for item in case.debts):
            warnings.append("Hay deudas prioritarias que pueden recibir tratamiento especial.")
        if case.household.urgent_collection_action:
            warnings.append("El cliente identificó una situación de cobro urgente.")
        if case.household.recent_property_transfer:
            warnings.append("Las transferencias recientes deben revelarse al abogado.")
        return warnings

    def _discussion_points(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
    ) -> list[str]:
        points = [
            "Confirmar si la información del cónyuge debe incluirse aunque no presente conjuntamente.",
            "Validar la residencia, jurisdicción y fecha potencial de presentación.",
            "Revisar límites, exenciones y resultados del means test con datos vigentes.",
        ]
        if monthly_cash_flow > 0:
            points.append("Existe flujo mensual positivo para discutir capacidad de pago.")
        else:
            points.append("El flujo mensual es limitado o negativo y requiere validación documental.")
        if any(item.debt_type == "secured" for item in case.debts):
            points.append("Definir la intención respecto a vivienda, vehículos y otras garantías.")
        return points

    def _chapter_7_questions(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
    ) -> list[str]:
        questions = [
            "¿Qué resultado produce el means test vigente para Puerto Rico y el tamaño del hogar?",
            "¿Qué bienes podrían estar protegidos por exenciones aplicables?",
            "¿Existen transferencias, pagos preferentes o activos que requieran análisis adicional?",
        ]
        if monthly_cash_flow > 0:
            questions.append("¿El flujo disponible cambia el análisis de abuso o capacidad de pago?")
        if any(item.debt_type == "secured" for item in case.debts):
            questions.append("¿Qué ocurriría con cada deuda garantizada y su propiedad asociada?")
        return questions

    def _chapter_13_questions(
        self,
        case: BankruptcyCaseDto,
        monthly_cash_flow: float,
    ) -> list[str]:
        questions = [
            "¿El ingreso es suficientemente regular para sostener un plan de tres a cinco años?",
            "¿Qué atrasos de hipoteca, vehículo, contribuciones o manutención deben incluirse?",
            "¿Cuál sería el pago estimado luego de validar ingreso disponible y reclamaciones?",
        ]
        if monthly_cash_flow <= 0:
            questions.append("¿Qué ajustes verificables permitirían financiar un plan realista?")
        if case.household.filing_jointly:
            questions.append("¿Cómo cambia el plan al presentar una petición conjunta?")
        return questions

    def _next_steps(
        self,
        case: BankruptcyCaseDto,
        missing_items: list[str],
        warnings: list[str],
    ) -> list[str]:
        if missing_items:
            return [
                f"Completar: {missing_items[0]}.",
                "Vincular cada cifra importante con un documento de respaldo.",
                "Guardar preguntas para discutir en la consulta con el abogado.",
            ]
        if case.status in {"draft", "collecting_information"}:
            return [
                "Revisar el resumen financiero completo.",
                "Confirmar que no falten acreedores, bienes ni transferencias.",
                "Enviar la solicitud al abogado para revisión.",
            ]
        if warnings:
            return [
                "El abogado debe revisar primero las alertas identificadas.",
                "Solicitar los documentos faltantes antes de discutir una estrategia.",
                "Programar una consulta para comparar alternativas disponibles.",
            ]
        return [
            "Preparar la consulta con el abogado.",
            "Validar formularios oficiales y datos de means test vigentes.",
            "Documentar la decisión profesional y los próximos pasos.",
        ]


class BankruptcyGuidanceService:
    def __init__(self, settings: Settings, provider: BaseAIProvider | None = None) -> None:
        self._analysis = BankruptcyAnalysisService()
        self._provider = provider or get_provider_for_settings(settings)

    def guide(self, request: GuidanceRequestDto) -> GuidanceResponseDto:
        analysis = self._analysis.analyze(request.case)
        draft = self._provider.generate(request=request, analysis=analysis)
        return GuidanceResponseDto(
            reply=draft.message,
            suggested_actions=draft.suggested_actions,
            focus_section=draft.focus_section,
            disclaimer=(
                "Esta orientación organiza información y preguntas. No determina elegibilidad, "
                "no sustituye el means test oficial y no es asesoramiento legal."
            ),
        )
