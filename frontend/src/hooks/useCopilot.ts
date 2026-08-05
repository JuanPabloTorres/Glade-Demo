import axios from "axios";
import { useCallback, useState } from "react";
import { copilotApi } from "../api/copilotApi";
import type { CasePacket, ConversationState, CopilotResponse } from "../types/copilot";

const STORAGE_KEY = "matterready-ai-intake-copilot-v1";

interface StoredCopilot {
  state: ConversationState;
  packet: CasePacket;
  quickReplies: string[];
}

const EMPTY_PROFILE: ConversationState["profile"] = {
  goal: null,
  case_type: null,
  client_name: null,
  email: null,
  phone: null,
  location: null,
  deadline: null,
  notes: null,
};

function createInitialState(): ConversationState {
  return {
    session_id: globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Tell me what you need to prepare. I will collect the essential facts, analyze supporting documents, flag contradictions, and build a case packet for human review.",
        created_at: new Date().toISOString(),
      },
    ],
    profile: { ...EMPTY_PROFILE },
    documents: [],
    resolutions: {},
  };
}

function createEmptyPacket(): CasePacket {
  return {
    profile: { ...EMPTY_PROFILE },
    evidence: [],
    issues: [],
    readiness: 0,
    next_action: "Describe the outcome you need to prepare.",
    summary: "No intake information has been collected yet.",
  };
}

function readStored(): StoredCopilot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredCopilot;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return { state: createInitialState(), packet: createEmptyPacket(), quickReplies: [] };
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data as { detail?: string } | undefined;
    return detail?.detail ?? "The copilot could not complete that request.";
  }
  return "The copilot could not complete that request.";
}

export function useCopilot() {
  const [stored, setStored] = useState<StoredCopilot>(() => readStored());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((response: CopilotResponse) => {
    const next = {
      state: response.state,
      packet: response.packet,
      quickReplies: response.quick_replies,
    };
    setStored(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const run = useCallback(
    async (operation: () => Promise<CopilotResponse>) => {
      setBusy(true);
      setError(null);
      try {
        const response = await operation();
        apply(response);
      } catch (caught) {
        setError(errorMessage(caught));
        throw caught;
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      await run(() => copilotApi.sendMessage(stored.state, trimmed));
    },
    [run, stored.state],
  );

  const analyzeDocument = useCallback(
    async (label: string, text: string) => {
      await run(() => copilotApi.analyzeDocument(stored.state, label.trim(), text.trim()));
    },
    [run, stored.state],
  );

  const resolveIssue = useCallback(
    async (issueId: string, selectedValue: string) => {
      await run(() => copilotApi.resolveIssue(stored.state, issueId, selectedValue));
    },
    [run, stored.state],
  );

  const reset = useCallback(() => {
    const next = { state: createInitialState(), packet: createEmptyPacket(), quickReplies: [] };
    setStored(next);
    setError(null);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return {
    ...stored,
    busy,
    error,
    sendMessage,
    analyzeDocument,
    resolveIssue,
    reset,
  };
}
