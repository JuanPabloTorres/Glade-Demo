import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "../i18n/i18n";
import {
  LANGUAGE_STORAGE_KEY,
  resolveLanguage,
  type AppLanguage,
} from "../i18n/languages";
import type { AuthUserDto } from "../types/api";
import type {
  BankruptcyCase,
  CaseStatus,
  TimelineEvent,
  WorkspaceState,
} from "../types/bankruptcy";

// v3: the demo seed is generated in the session's language now, and timeline
// entries carry locale keys. A v2 payload in a browser holds Spanish prose
// frozen at creation time, which is exactly the defect being fixed — it is
// migrated rather than discarded (see `migrate`).
const STORAGE_KEY = "freshstart-bankruptcy-workspace-v3";
const LEGACY_STORAGE_KEYS = ["freshstart-bankruptcy-workspace-v2"];

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Stage → timeline copy key, for entries persisted before the keys existed.
 *
 * Those entries carry Spanish `title`/`description` and nothing else, so an
 * English session rendered the whole history in Spanish and a language switch
 * changed nothing. The stage is the one field that was always structured, so it
 * is what the copy is recovered from.
 */
const STAGE_TO_TIMELINE_KEY: Record<string, string> = {
  request: "requestStarted",
  financial: "financial",
  evidence: "evidence",
  attorney: "attorney",
  submitted: "submitted",
  consultation: "consultation",
};

function timelineEvent(
  stage: string,
  title: string,
  description: string,
  status: TimelineEvent["status"],
): TimelineEvent {
  return { id: id("timeline"), stage, title, description, status, createdAt: new Date().toISOString() };
}

/**
 * A timeline entry that names its copy instead of carrying it.
 *
 * `title`/`description` are still filled with the Spanish text so that anything
 * reading an event without going through `CaseTimeline` — a test fixture, a
 * future export — still finds a human-readable string. The keys are what the UI
 * actually renders.
 */
function keyedTimelineEvent(
  stage: string,
  key: string,
  fallbackTitle: string,
  fallbackDescription: string,
  status: TimelineEvent["status"],
  descriptionParams?: Record<string, string>,
): TimelineEvent {
  return {
    ...timelineEvent(stage, fallbackTitle, fallbackDescription, status),
    titleKey: `timeline.${key}Title`,
    descriptionKey: `timeline.${key}Description`,
    ...(descriptionParams ? { descriptionParams } : {}),
  };
}

/**
 * The two demo cases.
 *
 * Synthetic, but a client reading the demo in English should not meet a case
 * file written in Spanish, so the prose is generated from the catalogue in the
 * session's language rather than hardcoded. Proper nouns — client names,
 * employers, creditors, municipalities — stay literal in both languages,
 * because that is what they would be in a real file.
 *
 * Rows created here are ordinary case data afterwards: a later language switch
 * re-labels the timeline and the assistant's opening message (they carry keys)
 * but leaves these rows alone, the same as it leaves anything the user typed.
 */
function seedState(t: SeedTranslator): WorkspaceState {
  const createdAt = "2026-08-05T12:00:00.000Z";
  return {
    cases: [
      {
        id: "case-elena-demo",
        ownerUserId: "client-demo",
        clientName: "Elena Rivera",
        clientEmail: "client@freshstart.demo",
        clientPhone: "787-555-0142",
        preferredLanguage: activeLanguage(),
        status: "collecting_information",
        clientGoal: t("demoSeed.elena.goal"),
        household: {
          maritalStatus: "single",
          householdSize: 2,
          dependents: 1,
          filingJointly: false,
          housingStatus: "rent",
          municipality: "Ponce",
          urgentCollectionAction: false,
          recentPropertyTransfer: false,
        },
        incomes: [
          {
            id: "income-elena-1",
            category: "wages",
            source: "Caribe Services",
            grossAmount: 1200,
            netAmount: 950,
            frequency: "biweekly",
            evidenceIds: ["evidence-elena-1"],
          },
        ],
        expenses: [
          {
            id: "expense-elena-1",
            category: "housing",
            description: t("demoSeed.expenses.rent"),
            monthlyAmount: 1100,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-elena-2",
            category: "food",
            description: t("demoSeed.expenses.groceriesAndHousehold"),
            monthlyAmount: 650,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-elena-3",
            category: "utilities",
            description: t("demoSeed.expenses.utilities"),
            monthlyAmount: 290,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-elena-4",
            category: "transportation",
            description: t("demoSeed.expenses.fuelAndMaintenance"),
            monthlyAmount: 360,
            essential: true,
            evidenceIds: [],
          },
        ],
        debts: [
          {
            id: "debt-elena-1",
            creditor: "Example Card",
            debtType: "unsecured",
            description: t("demoSeed.debts.creditCard"),
            balance: 18000,
            monthlyPayment: 450,
            delinquentAmount: 900,
            collectionLawsuit: false,
            evidenceIds: ["evidence-elena-2"],
          },
          {
            id: "debt-elena-2",
            creditor: "Example Auto",
            debtType: "secured",
            description: t("demoSeed.debts.vehicleLoan"),
            balance: 7000,
            monthlyPayment: 320,
            delinquentAmount: 0,
            collateral: t("demoSeed.collateral.sedan"),
            collectionLawsuit: false,
            evidenceIds: [],
          },
        ],
        // Deliberately empty, and the only section of Elena's that is.
        //
        // `completion_score` and `missing_items` are computed from the same
        // eight section booleans (`BankruptcyAnalysisService`), so a case with
        // every section filled reports 100% and an empty missing list — and
        // "¿Qué me falta?", which is the question this product exists to
        // answer, comes back with nothing to say. The demo needs one real gap
        // for the assistant to find.
        //
        // Assets is the realistic one to leave open: people record income,
        // expenses and debts first and get to what they own last. It is also
        // the section the attorney's triage does not read — `list_incomplete_
        // cases` looks at income, debts and evidence — so the queue keeps its
        // three-way split while the client sees something outstanding.
        assets: [],
        evidence: [
          {
            id: "evidence-elena-1",
            evidenceType: "pay-stubs",
            name: "paystub-demo.pdf",
            status: "received",
            relatedEntryIds: ["income-elena-1"],
          },
          {
            id: "evidence-elena-2",
            evidenceType: "creditor-statement",
            name: "credit-card-demo.pdf",
            status: "received",
            relatedEntryIds: ["debt-elena-1"],
          },
        ],
        createdAt,
        updatedAt: createdAt,
        messages: [
          {
            id: "message-welcome-elena",
            role: "assistant",
            // Keyed as well as filled: this is the first thing an English
            // session read, and it was Spanish. `contentKey` is what re-labels
            // it on a language switch — see ChatMessage's docblock for why only
            // seeded messages carry one.
            contentKey: "workspace:demoSeed.elena.welcome",
            content: t("demoSeed.elena.welcome"),
            createdAt,
          },
        ],
        timeline: [
          keyedTimelineEvent("request", "requestStarted", "Solicitud iniciada", "El cliente comenzó la evaluación financiera.", "complete"),
          keyedTimelineEvent("financial", "financial", "Plantilla financiera", "Completar ingresos, gastos, deudas y bienes.", "current"),
          keyedTimelineEvent("evidence", "evidence", "Evidencia", "Vincular documentos con las cifras reportadas.", "upcoming"),
          keyedTimelineEvent("attorney", "attorney", "Revisión del abogado", "Enviar el expediente y preparar la consulta.", "upcoming"),
        ],
      },
      {
        id: "case-miguel-demo",
        ownerUserId: "client-miguel-demo",
        clientName: "Miguel Santos",
        clientEmail: "miguel@example.demo",
        clientPhone: "939-555-0138",
        preferredLanguage: activeLanguage(),
        status: "submitted",
        clientGoal: t("demoSeed.miguel.goal"),
        assignedAttorneyName: "Lic. Andrea Morales",
        household: {
          maritalStatus: "married",
          householdSize: 4,
          dependents: 2,
          filingJointly: false,
          housingStatus: "own",
          municipality: "Caguas",
          urgentCollectionAction: true,
          recentPropertyTransfer: false,
        },
        incomes: [
          {
            id: "income-miguel-1",
            category: "wages",
            source: "Island Manufacturing",
            grossAmount: 3400,
            netAmount: 2750,
            frequency: "monthly",
            evidenceIds: ["evidence-miguel-1"],
          },
        ],
        expenses: [
          {
            id: "expense-miguel-1",
            category: "housing",
            description: t("demoSeed.expenses.mortgage"),
            monthlyAmount: 1250,
            essential: true,
            evidenceIds: ["evidence-miguel-2"],
          },
          {
            id: "expense-miguel-2",
            category: "food",
            description: t("demoSeed.expenses.groceries"),
            monthlyAmount: 850,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-miguel-3",
            category: "transportation",
            description: t("demoSeed.expenses.vehiclesAndFuel"),
            monthlyAmount: 760,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-miguel-4",
            category: "medical",
            description: t("demoSeed.expenses.medicalCopays"),
            monthlyAmount: 240,
            essential: true,
            evidenceIds: [],
          },
        ],
        debts: [
          {
            id: "debt-miguel-1",
            creditor: "Example Mortgage",
            debtType: "secured",
            description: t("demoSeed.debts.residentialMortgage"),
            balance: 148000,
            monthlyPayment: 1250,
            delinquentAmount: 7500,
            collateral: t("demoSeed.collateral.primaryResidence"),
            collectionLawsuit: true,
            evidenceIds: ["evidence-miguel-2"],
          },
          {
            id: "debt-miguel-2",
            creditor: "Regional Medical",
            debtType: "unsecured",
            description: t("demoSeed.debts.medicalServices"),
            balance: 24000,
            monthlyPayment: 200,
            delinquentAmount: 0,
            collectionLawsuit: false,
            evidenceIds: [],
          },
        ],
        assets: [
          {
            id: "asset-miguel-1",
            category: "real-estate",
            description: t("demoSeed.collateral.primaryResidence"),
            estimatedValue: 165000,
            loanBalance: 148000,
            jointlyOwned: true,
            evidenceIds: ["evidence-miguel-2"],
          },
        ],
        evidence: [
          {
            id: "evidence-miguel-1",
            evidenceType: "pay-stubs",
            name: "income-demo.pdf",
            status: "reviewed",
            relatedEntryIds: ["income-miguel-1"],
          },
          {
            id: "evidence-miguel-2",
            evidenceType: "mortgage-statement",
            name: "mortgage-demo.pdf",
            status: "received",
            relatedEntryIds: ["debt-miguel-1", "asset-miguel-1"],
          },
        ],
        createdAt,
        updatedAt: createdAt,
        submittedAt: createdAt,
        messages: [
          {
            id: "message-welcome-miguel",
            role: "assistant",
            contentKey: "workspace:demoSeed.miguel.welcome",
            content: t("demoSeed.miguel.welcome"),
            createdAt,
          },
        ],
        timeline: [
          keyedTimelineEvent("request", "requestStarted", "Solicitud iniciada", "El cliente abrió el expediente.", "complete"),
          keyedTimelineEvent("financial", "financial", "Información financiera", "Ingresos, gastos y deudas organizados.", "complete"),
          keyedTimelineEvent("submitted", "submitted", "Solicitud enviada", "El expediente está disponible para el abogado.", "current"),
          keyedTimelineEvent("consultation", "consultation", "Consulta", "Programar discusión de alternativas.", "upcoming"),
        ],
      },
    ],
  };
}

/**
 * Recovers locale keys for entries persisted before they existed.
 *
 * A v2 payload holds timeline prose frozen in whatever language the case was
 * created in, so an English session read the whole history in Spanish and the
 * language switch did nothing. The stage is structured and survived, so the key
 * is recovered from it; anything whose stage is not a known workflow step (an
 * attorney's own status note) keeps its literal text, which is correct — those
 * are a person's words.
 */
function migrate(state: WorkspaceState): WorkspaceState {
  return {
    cases: state.cases.map((caseData) => ({
      ...caseData,
      timeline: caseData.timeline.map((event) => {
        if (event.titleKey) return event;
        const key = STAGE_TO_TIMELINE_KEY[event.stage];
        if (!key) return event;
        return {
          ...event,
          titleKey: `timeline.${key}Title`,
          descriptionKey: `timeline.${key}Description`,
        };
      }),
    })),
  };
}

function readState(t: SeedTranslator): WorkspaceState {
  const raw =
    localStorage.getItem(STORAGE_KEY) ??
    LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) ??
    null;
  if (!raw) return seedState(t);
  try {
    return migrate(JSON.parse(raw) as WorkspaceState);
  } catch {
    return seedState(t);
  }
}

/**
 * The language the session is about to render in.
 *
 * It must agree with `LanguageProvider`'s first render, because that is the
 * moment the seed is built. This used to read the stored preference and fall
 * back to Spanish, which was harmless while it only chose a timeline label and
 * wrong the moment the demo case file started being generated from it: a
 * deployment with `VITE_DEFAULT_LANGUAGE=en` and a browser with nothing stored
 * yet rendered an English UI around a Spanish case file — observed in
 * production at 4.11.0.
 *
 * `resolveLanguage` is that rule, so it is called rather than restated. The
 * profile is deliberately absent: the workspace mounts before the session is
 * resolved, and `LanguageProvider` persists its choice on first render, so
 * persisted → browser → default is exactly what the UI will have picked.
 */
function activeLanguage(): AppLanguage {
  return resolveLanguage({
    persistedLanguage: localStorage.getItem(LANGUAGE_STORAGE_KEY),
    browserLanguage: typeof navigator === "undefined" ? null : navigator.language,
  });
}

interface WorkspaceContextValue {
  cases: BankruptcyCase[];
  createCase: (user: AuthUserDto) => string;
  updateCase: (caseId: string, updater: (caseData: BankruptcyCase) => BankruptcyCase) => void;
  deleteCase: (caseId: string) => void;
  submitCase: (caseId: string) => void;
  updateStatus: (caseId: string, status: CaseStatus, note?: string) => void;
  resetDemo: () => void;
}

/**
 * Just enough of i18next's `t` to generate the seed. Narrowed deliberately:
 * the seed reads keys and nothing else, and a full `TFunction` here would let
 * it grow interpolation and pluralization that a fixture has no business
 * carrying.
 */
type SeedTranslator = (key: string) => string;

/**
 * A translator pinned to the stored preference, not to i18next's current
 * language.
 *
 * The seed is generated inside a `useState` initializer, which runs on the
 * provider's first render — before `LanguageContext`'s effect has applied the
 * stored preference. Using the render-time `t` there produced a Spanish case
 * file for an English session and no amount of switching afterwards fixed it,
 * because the strings were already written into the case. `getFixedT` reads the
 * preference directly, so the seed does not depend on which effect ran first.
 */
function seedTranslator(): SeedTranslator {
  return i18n.getFixedT(activeLanguage(), "workspace");
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function BankruptcyWorkspaceProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("workspace");
  const [state, setState] = useState<WorkspaceState>(() => readState(seedTranslator()));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateCase = useCallback((
    caseId: string,
    updater: (caseData: BankruptcyCase) => BankruptcyCase,
  ) => {
    setState((current) => ({
      cases: current.cases.map((caseData) =>
        caseData.id === caseId
          ? { ...updater(caseData), updatedAt: new Date().toISOString() }
          : caseData,
      ),
    }));
  }, []);

  const createCase = useCallback((user: AuthUserDto): string => {
    const caseId = id("case");
    const createdAt = new Date().toISOString();
    const caseData: BankruptcyCase = {
      id: caseId,
      ownerUserId: user.id,
      clientName: user.name,
      clientEmail: user.email,
      preferredLanguage: user.preferred_language ?? activeLanguage(),
      status: "draft",
      household: {
        householdSize: 1,
        dependents: 0,
        filingJointly: false,
        urgentCollectionAction: false,
        recentPropertyTransfer: false,
      },
      incomes: [],
      expenses: [],
      debts: [],
      assets: [],
      evidence: [],
      createdAt,
      updatedAt: createdAt,
      messages: [
        {
          id: id("message"),
          role: "assistant",
          // The one exception to "a transcript is a record": nobody said this,
          // the product did, before the conversation started. An English
          // session opening the assistant met a Spanish greeting as its first
          // line, and a language switch left it there. Later turns — anything
          // a person or the model actually produced — carry no key and are
          // never re-labelled.
          contentKey: "workspace:timeline.welcomeMessage",
          content: t("timeline.welcomeMessage"),
          createdAt,
        },
      ],
      timeline: [
        keyedTimelineEvent("request", "requestStarted", "Solicitud iniciada", "Se creó un expediente privado de evaluación.", "current"),
        keyedTimelineEvent("financial", "financial", "Plantilla financiera", "Organizar ingresos, gastos, deudas y bienes.", "upcoming"),
        keyedTimelineEvent("evidence", "evidence", "Evidencia", "Añadir documentos y revisar faltantes.", "upcoming"),
        keyedTimelineEvent("attorney", "attorney", "Revisión del abogado", "Enviar la solicitud y programar consulta.", "upcoming"),
      ],
    };
    setState((current) => ({ cases: [caseData, ...current.cases] }));
    return caseId;
  }, [t]);

  const deleteCase = useCallback((caseId: string) => {
    setState((current) => ({
      cases: current.cases.filter((caseData) => caseData.id !== caseId),
    }));
  }, []);

  const submitCase = useCallback((caseId: string) => {
    updateCase(caseId, (caseData) => ({
      ...caseData,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      timeline: [
        ...caseData.timeline.map((event) =>
          event.status === "current" ? { ...event, status: "complete" as const } : event,
        ),
        keyedTimelineEvent(
          "submitted",
          "submitted",
          "Solicitud enviada",
          "El abogado puede revisar la información y solicitar aclaraciones.",
          "current",
        ),
      ],
    }));
  }, [updateCase]);

  const updateStatus = useCallback((caseId: string, status: CaseStatus, note?: string) => {
    updateCase(caseId, (caseData) => ({
      ...caseData,
      status,
      timeline: [
        ...caseData.timeline.map((event) =>
          event.status === "current" ? { ...event, status: "complete" as const } : event,
        ),
        // A note is the attorney's own words and is stored verbatim, with no
        // key: translating what a person wrote would be a mistranslation. Only
        // the generated fallback is keyed, and it interpolates the localized
        // status label rather than the raw enum with its underscores stripped.
        note
          ? { ...timelineEvent(status, t("timeline.statusChangedTitle"), note, "current"), titleKey: "timeline.statusChangedTitle" }
          : keyedTimelineEvent(
              status,
              "statusChanged",
              "Estado actualizado",
              `El expediente cambió a ${status.replaceAll("_", " ")}.`,
              "current",
              // The raw enum, not its label: storing the translated string
              // would freeze this one entry in the language it was created in,
              // which is the defect the keys exist to remove.
              { statusKey: status },
            ),
      ],
    }));
  }, [updateCase, t]);

  // Re-seeded in whatever language the session is in now, not the one the demo
  // was first loaded in — resetting is the one moment where regenerating the
  // synthetic prose is unambiguously right.
  const resetDemo = useCallback(() => setState(seedState(seedTranslator())), []);

  const value = useMemo(
    () => ({ cases: state.cases, createCase, updateCase, deleteCase, submitCase, updateStatus, resetDemo }),
    [state.cases, createCase, updateCase, deleteCase, submitCase, updateStatus, resetDemo],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useBankruptcyWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useBankruptcyWorkspace must be used inside BankruptcyWorkspaceProvider");
  }
  return context;
}
