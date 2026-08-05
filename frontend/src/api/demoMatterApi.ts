import type {
  ActivityDto,
  ConflictDto,
  DocumentCreateDto,
  DocumentDto,
  DocumentType,
  MatterCreateDto,
  MatterDetailDto,
  MatterIntakeUpdateDto,
  MatterSummaryDto,
  ReadinessDto,
  ReadinessItemDto,
} from "../types/api";

export const GUIDED_DEMO_MATTER_ID = "guided-elena-rivera";
const STORAGE_KEY = "matterready-demo-workspace-v2";

interface DemoMatterRecord {
  matter: MatterDetailDto;
  documents: DocumentDto[];
  conflicts: ConflictDto[];
  activities: ActivityDto[];
}

interface DemoWorkspaceState {
  records: Record<string, DemoMatterRecord>;
}

const REQUIRED_FIELDS: Record<MatterDetailDto["case_type"], Array<keyof MatterDetailDto>> = {
  immigration: ["display_name", "email", "phone", "address", "date_of_birth"],
  bankruptcy: ["display_name", "email", "phone", "address"],
  general: ["display_name", "email", "phone"],
};

const REQUIRED_DOCUMENTS: Record<MatterDetailDto["case_type"], DocumentType[]> = {
  immigration: ["identity", "proof_of_address"],
  bankruptcy: ["identity", "financial"],
  general: ["identity"],
};

const FIELD_LABELS: Record<string, string> = {
  display_name: "Client name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  date_of_birth: "Date of birth",
};

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  identity: "Identity document",
  proof_of_address: "Proof of address",
  financial: "Financial document",
  supporting: "Supporting document",
};

const FIELD_PATTERNS: Array<[keyof MatterDetailDto, RegExp[]]> = [
  ["display_name", [/(?:full\s+name|name)\s*:\s*(.+)/i]],
  ["email", [/(?:email)\s*:\s*([^\s]+@[^\s]+)/i, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/]],
  ["phone", [/(?:phone|telephone)\s*:\s*([+()\-\d\s]{7,})/i]],
  ["address", [/(?:address)\s*:\s*(.+)/i]],
  ["date_of_birth", [/(?:dob|date\s+of\s+birth)\s*:\s*([\w\-/]+)/i]],
];

function now(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function guidedRecord(): DemoMatterRecord {
  const createdAt = now();
  return {
    matter: {
      id: GUIDED_DEMO_MATTER_ID,
      display_name: "Elena Rivera",
      case_type: "immigration",
      status: "active",
      email: "elena.rivera@example.com",
      phone: "(787) 555-0142",
      assigned_to: "Alex Rivera",
      created_at: createdAt,
      address: "125 Example Street, Ponce, PR 00730",
      date_of_birth: "1990-04-18",
      summary:
        "Prepare an immigration review package and confirm that the supporting records match the approved client intake.",
      updated_at: createdAt,
    },
    documents: [
      {
        id: "guided-identity-document",
        original_name: "sample-passport.txt",
        document_type: "identity",
        status: "needs_review",
        created_at: createdAt,
        facts: [
          {
            id: "guided-fact-name",
            field_name: "display_name",
            value: "Elena Rivera",
            source_type: "document",
            source_label: "sample-passport.txt",
            is_current: false,
          },
          {
            id: "guided-fact-email",
            field_name: "email",
            value: "elena.rivera@oldmail.example",
            source_type: "document",
            source_label: "sample-passport.txt",
            is_current: false,
          },
        ],
      },
    ],
    conflicts: [
      {
        id: "guided-email-conflict",
        document_id: "guided-identity-document",
        field_name: "email",
        canonical_value: "elena.rivera@example.com",
        conflicting_value: "elena.rivera@oldmail.example",
        canonical_source: "Approved client intake",
        conflicting_source: "sample-passport.txt",
        status: "open",
        resolved_value: null,
        created_at: createdAt,
      },
    ],
    activities: [
      {
        id: "guided-activity-created",
        event_type: "matter_created",
        message: "Guided example matter created for evaluation.",
        created_at: createdAt,
      },
      {
        id: "guided-activity-document",
        event_type: "document_analyzed",
        message: "Identity document analyzed and one difference was sent for human review.",
        created_at: createdAt,
      },
    ],
  };
}

function initialState(): DemoWorkspaceState {
  return { records: { [GUIDED_DEMO_MATTER_ID]: guidedRecord() } };
}

function writeState(state: DemoWorkspaceState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readState(): DemoWorkspaceState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const seeded = initialState();
      writeState(seeded);
      return seeded;
    }
    const parsed = JSON.parse(stored) as DemoWorkspaceState;
    if (!parsed.records || typeof parsed.records !== "object") throw new Error("Invalid demo state");
    return parsed;
  } catch {
    const seeded = initialState();
    writeState(seeded);
    return seeded;
  }
}

function getRecord(state: DemoWorkspaceState, matterId: string): DemoMatterRecord {
  const record = state.records[matterId];
  if (!record) {
    const error = new Error("This demo matter is no longer available.");
    Object.assign(error, { status: 404 });
    throw error;
  }
  return record;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function calculateReadiness(record: DemoMatterRecord): ReadinessDto {
  const items: ReadinessItemDto[] = REQUIRED_FIELDS[record.matter.case_type].map((field) => ({
    key: `field:${String(field)}`,
    label: FIELD_LABELS[String(field)] ?? String(field),
    complete: Boolean(String(record.matter[field] ?? "").trim()),
    source: "approved client record",
  }));

  const processedTypes = new Set(
    record.documents.filter((document) => document.status === "processed").map((document) => document.document_type),
  );
  for (const documentType of REQUIRED_DOCUMENTS[record.matter.case_type]) {
    items.push({
      key: `document:${documentType}`,
      label: DOCUMENT_LABELS[documentType],
      complete: processedTypes.has(documentType),
      source: "analyzed document",
    });
  }

  const openConflicts = record.conflicts.filter((conflict) => conflict.status === "open").length;
  items.push({
    key: "review:conflicts",
    label: "Human review decisions",
    complete: openConflicts === 0,
    source: "professional review",
  });

  const completeItems = items.filter((item) => item.complete).length;
  return {
    score: items.length ? Math.round((completeItems / items.length) * 100) : 100,
    complete_items: completeItems,
    total_items: items.length,
    open_conflicts: openConflicts,
    items,
  };
}

function refreshMatterStatus(record: DemoMatterRecord): void {
  const readiness = calculateReadiness(record);
  record.matter.status = readiness.score === 100 ? "ready_for_review" : "active";
  record.matter.updated_at = now();
}

function toSummary(record: DemoMatterRecord): MatterSummaryDto {
  const readiness = calculateReadiness(record);
  return {
    id: record.matter.id,
    display_name: record.matter.display_name,
    case_type: record.matter.case_type,
    status: readiness.score === 100 ? "ready_for_review" : record.matter.status,
    email: record.matter.email,
    phone: record.matter.phone,
    assigned_to: record.matter.assigned_to,
    created_at: record.matter.created_at,
    open_conflicts: readiness.open_conflicts,
    readiness_score: readiness.score,
  };
}

function extractFacts(content: string, sourceLabel: string): DocumentDto["facts"] {
  const facts: DocumentDto["facts"] = [];
  for (const [field, patterns] of FIELD_PATTERNS) {
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (!match) continue;
      const raw = match[1] ?? match[0];
      const value = raw.trim().replace(/[.,;]+$/, "");
      if (value) {
        facts.push({
          id: createId("fact"),
          field_name: String(field),
          value,
          source_type: "document",
          source_label: sourceLabel,
          is_current: false,
        });
      }
      break;
    }
  }
  return facts;
}

export const demoMatterApi = {
  async listMatters(): Promise<MatterSummaryDto[]> {
    return Object.values(readState().records)
      .map(toSummary)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  },

  async createMatter(body: MatterCreateDto): Promise<MatterDetailDto> {
    const state = readState();
    const timestamp = now();
    const id = createId("matter");
    const record: DemoMatterRecord = {
      matter: {
        id,
        display_name: body.display_name,
        case_type: body.case_type,
        status: "intake",
        email: body.email ?? null,
        phone: body.phone ?? null,
        assigned_to: body.assigned_to ?? null,
        created_at: timestamp,
        address: null,
        date_of_birth: null,
        summary: null,
        updated_at: timestamp,
      },
      documents: [],
      conflicts: [],
      activities: [
        {
          id: createId("activity"),
          event_type: "matter_created",
          message: "Matter created. Confirm the client record before analyzing documents.",
          created_at: timestamp,
        },
      ],
    };
    state.records[id] = record;
    writeState(state);
    return record.matter;
  },

  async getMatter(matterId: string): Promise<MatterDetailDto> {
    return getRecord(readState(), matterId).matter;
  },

  async updateIntake(matterId: string, body: MatterIntakeUpdateDto): Promise<MatterDetailDto> {
    const state = readState();
    const record = getRecord(state, matterId);
    Object.assign(record.matter, {
      ...body,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      date_of_birth: body.date_of_birth || null,
      summary: body.summary || null,
    });
    record.activities.unshift({
      id: createId("activity"),
      event_type: "intake_updated",
      message: "Approved client information updated.",
      created_at: now(),
    });
    refreshMatterStatus(record);
    writeState(state);
    return record.matter;
  },

  async listDocuments(matterId: string): Promise<DocumentDto[]> {
    return getRecord(readState(), matterId).documents;
  },

  async createDocument(matterId: string, body: DocumentCreateDto): Promise<DocumentDto> {
    const state = readState();
    const record = getRecord(state, matterId);
    const documentId = createId("document");
    const facts = extractFacts(body.content, body.original_name);
    const newConflicts: ConflictDto[] = [];

    for (const fact of facts) {
      const canonical = record.matter[fact.field_name as keyof MatterDetailDto];
      if (canonical && normalize(canonical) !== normalize(fact.value)) {
        newConflicts.push({
          id: createId("conflict"),
          document_id: documentId,
          field_name: fact.field_name,
          canonical_value: String(canonical),
          conflicting_value: fact.value,
          canonical_source: "Approved client intake",
          conflicting_source: body.original_name,
          status: "open",
          resolved_value: null,
          created_at: now(),
        });
      }
    }

    const document: DocumentDto = {
      id: documentId,
      original_name: body.original_name,
      document_type: body.document_type,
      status: newConflicts.length ? "needs_review" : "processed",
      created_at: now(),
      facts,
    };
    record.documents.unshift(document);
    record.conflicts.unshift(...newConflicts);
    record.activities.unshift({
      id: createId("activity"),
      event_type: "document_analyzed",
      message: newConflicts.length
        ? `${body.original_name} analyzed; ${newConflicts.length} difference${newConflicts.length === 1 ? "" : "s"} require review.`
        : `${body.original_name} analyzed with no differences requiring review.`,
      created_at: now(),
    });
    refreshMatterStatus(record);
    writeState(state);
    return document;
  },

  async listConflicts(matterId: string): Promise<ConflictDto[]> {
    return getRecord(readState(), matterId).conflicts;
  },

  async resolveConflict(
    matterId: string,
    conflictId: string,
    selectedValue: string,
  ): Promise<ConflictDto> {
    const state = readState();
    const record = getRecord(state, matterId);
    const conflict = record.conflicts.find((item) => item.id === conflictId);
    if (!conflict) throw new Error("The review item is no longer available.");

    conflict.status = "resolved";
    conflict.resolved_value = selectedValue;
    const field = conflict.field_name as keyof MatterDetailDto;
    if (selectedValue === conflict.conflicting_value && field in record.matter) {
      (record.matter as unknown as Record<string, unknown>)[String(field)] = selectedValue;
    }

    const document = record.documents.find((item) => item.id === conflict.document_id);
    if (document) {
      const hasOpenConflict = record.conflicts.some(
        (item) => item.document_id === document.id && item.status === "open",
      );
      document.status = hasOpenConflict ? "needs_review" : "processed";
    }

    record.activities.unshift({
      id: createId("activity"),
      event_type: "review_decision",
      message: `Human decision recorded for ${FIELD_LABELS[conflict.field_name] ?? conflict.field_name}.`,
      created_at: now(),
    });
    refreshMatterStatus(record);
    writeState(state);
    return conflict;
  },

  async getReadiness(matterId: string): Promise<ReadinessDto> {
    return calculateReadiness(getRecord(readState(), matterId));
  },

  async listActivities(matterId: string): Promise<ActivityDto[]> {
    return getRecord(readState(), matterId).activities;
  },

  reset(): void {
    writeState(initialState());
  },
};
