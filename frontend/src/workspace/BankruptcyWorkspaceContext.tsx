import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthUserDto } from "../types/api";
import type {
  BankruptcyCase,
  CaseStatus,
  TimelineEvent,
  WorkspaceState,
} from "../types/bankruptcy";

const STORAGE_KEY = "freshstart-bankruptcy-workspace-v2";

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function timelineEvent(
  stage: string,
  title: string,
  description: string,
  status: TimelineEvent["status"],
): TimelineEvent {
  return { id: id("timeline"), stage, title, description, status, createdAt: new Date().toISOString() };
}

function seedState(): WorkspaceState {
  const createdAt = "2026-08-05T12:00:00.000Z";
  return {
    cases: [
      {
        id: "case-elena-demo",
        ownerUserId: "client-demo",
        clientName: "Elena Rivera",
        clientEmail: "client@freshstart.demo",
        clientPhone: "787-555-0142",
        preferredLanguage: "es",
        status: "collecting_information",
        clientGoal: "Organizar mis finanzas y saber qué debo discutir con un abogado de quiebras.",
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
            description: "Alquiler",
            monthlyAmount: 1100,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-elena-2",
            category: "food",
            description: "Alimentos y artículos del hogar",
            monthlyAmount: 650,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-elena-3",
            category: "utilities",
            description: "Agua, luz, teléfono e internet",
            monthlyAmount: 290,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-elena-4",
            category: "transportation",
            description: "Gasolina y mantenimiento",
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
            description: "Tarjeta de crédito",
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
            description: "Préstamo de vehículo",
            balance: 7000,
            monthlyPayment: 320,
            delinquentAmount: 0,
            collateral: "Sedán 2018",
            collectionLawsuit: false,
            evidenceIds: [],
          },
        ],
        assets: [
          {
            id: "asset-elena-1",
            category: "vehicle",
            description: "Sedán 2018",
            estimatedValue: 9000,
            loanBalance: 7000,
            jointlyOwned: false,
            evidenceIds: [],
          },
        ],
        evidence: [
          {
            id: "evidence-elena-1",
            evidenceType: "Talones de pago",
            name: "paystub-demo.pdf",
            status: "received",
            relatedEntryIds: ["income-elena-1"],
          },
          {
            id: "evidence-elena-2",
            evidenceType: "Estado de cuenta de acreedor",
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
            content:
              "Te ayudaré a organizar ingresos, gastos, deudas, bienes y documentos para preparar una consulta informada con un abogado.",
            createdAt,
          },
        ],
        timeline: [
          timelineEvent("request", "Solicitud iniciada", "El cliente comenzó la evaluación financiera.", "complete"),
          timelineEvent("financial", "Plantilla financiera", "Completar ingresos, gastos, deudas y bienes.", "current"),
          timelineEvent("evidence", "Evidencia", "Vincular documentos con las cifras reportadas.", "upcoming"),
          timelineEvent("attorney", "Revisión del abogado", "Enviar el expediente y preparar la consulta.", "upcoming"),
        ],
      },
      {
        id: "case-miguel-demo",
        ownerUserId: "client-miguel-demo",
        clientName: "Miguel Santos",
        clientEmail: "miguel@example.demo",
        clientPhone: "939-555-0138",
        preferredLanguage: "es",
        status: "submitted",
        clientGoal: "Revisar atrasos de vivienda y deudas médicas antes de una consulta.",
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
            description: "Hipoteca",
            monthlyAmount: 1250,
            essential: true,
            evidenceIds: ["evidence-miguel-2"],
          },
          {
            id: "expense-miguel-2",
            category: "food",
            description: "Alimentos",
            monthlyAmount: 850,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-miguel-3",
            category: "transportation",
            description: "Vehículos y gasolina",
            monthlyAmount: 760,
            essential: true,
            evidenceIds: [],
          },
          {
            id: "expense-miguel-4",
            category: "medical",
            description: "Medicinas y copagos",
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
            description: "Hipoteca residencial",
            balance: 148000,
            monthlyPayment: 1250,
            delinquentAmount: 7500,
            collateral: "Residencia principal",
            collectionLawsuit: true,
            evidenceIds: ["evidence-miguel-2"],
          },
          {
            id: "debt-miguel-2",
            creditor: "Regional Medical",
            debtType: "unsecured",
            description: "Servicios médicos",
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
            description: "Residencia principal",
            estimatedValue: 165000,
            loanBalance: 148000,
            jointlyOwned: true,
            evidenceIds: ["evidence-miguel-2"],
          },
        ],
        evidence: [
          {
            id: "evidence-miguel-1",
            evidenceType: "Talones de pago",
            name: "income-demo.pdf",
            status: "reviewed",
            relatedEntryIds: ["income-miguel-1"],
          },
          {
            id: "evidence-miguel-2",
            evidenceType: "Estado hipotecario",
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
            content: "La solicitud fue enviada. El abogado revisará las alertas y documentos pendientes.",
            createdAt,
          },
        ],
        timeline: [
          timelineEvent("request", "Solicitud iniciada", "El cliente abrió el expediente.", "complete"),
          timelineEvent("financial", "Información financiera", "Ingresos, gastos y deudas organizados.", "complete"),
          timelineEvent("submitted", "Solicitud enviada", "El expediente está disponible para el abogado.", "current"),
          timelineEvent("consultation", "Consulta", "Programar discusión de alternativas.", "upcoming"),
        ],
      },
    ],
  };
}

function readState(): WorkspaceState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedState();
  try {
    return JSON.parse(raw) as WorkspaceState;
  } catch {
    return seedState();
  }
}

interface WorkspaceContextValue {
  cases: BankruptcyCase[];
  createCase: (user: AuthUserDto) => string;
  updateCase: (caseId: string, updater: (caseData: BankruptcyCase) => BankruptcyCase) => void;
  submitCase: (caseId: string) => void;
  updateStatus: (caseId: string, status: CaseStatus, note?: string) => void;
  resetDemo: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function BankruptcyWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() => readState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateCase = (
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
  };

  const createCase = (user: AuthUserDto): string => {
    const caseId = id("case");
    const createdAt = new Date().toISOString();
    const caseData: BankruptcyCase = {
      id: caseId,
      ownerUserId: user.id,
      clientName: user.name,
      clientEmail: user.email,
      preferredLanguage: "es",
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
          content:
            "Comencemos por tu meta y la composición del hogar. Luego organizaremos cada cifra con evidencia.",
          createdAt,
        },
      ],
      timeline: [
        timelineEvent("request", "Solicitud iniciada", "Se creó un expediente privado de evaluación.", "current"),
        timelineEvent("financial", "Plantilla financiera", "Organizar ingresos, gastos, deudas y bienes.", "upcoming"),
        timelineEvent("evidence", "Evidencia", "Añadir documentos y revisar faltantes.", "upcoming"),
        timelineEvent("attorney", "Revisión del abogado", "Enviar la solicitud y programar consulta.", "upcoming"),
      ],
    };
    setState((current) => ({ cases: [caseData, ...current.cases] }));
    return caseId;
  };

  const submitCase = (caseId: string) => {
    updateCase(caseId, (caseData) => ({
      ...caseData,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      timeline: [
        ...caseData.timeline.map((event) =>
          event.status === "current" ? { ...event, status: "complete" as const } : event,
        ),
        timelineEvent(
          "submitted",
          "Solicitud enviada",
          "El abogado puede revisar la información y solicitar aclaraciones.",
          "current",
        ),
      ],
    }));
  };

  const updateStatus = (caseId: string, status: CaseStatus, note?: string) => {
    updateCase(caseId, (caseData) => ({
      ...caseData,
      status,
      timeline: [
        ...caseData.timeline.map((event) =>
          event.status === "current" ? { ...event, status: "complete" as const } : event,
        ),
        timelineEvent(
          status,
          "Estado actualizado",
          note || `El expediente cambió a ${status.replaceAll("_", " ")}.`,
          "current",
        ),
      ],
    }));
  };

  const resetDemo = () => setState(seedState());

  const value = useMemo(
    () => ({ cases: state.cases, createCase, updateCase, submitCase, updateStatus, resetDemo }),
    [state.cases],
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
