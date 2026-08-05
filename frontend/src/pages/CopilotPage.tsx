import {
  Alert,
  Badge,
  Button,
  Card,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Progress,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useState, type FormEvent } from "react";
import { AppIcon } from "../components/atoms/AppIcon";
import { useCopilot } from "../hooks/useCopilot";
import type { ReviewIssue } from "../types/copilot";

const STARTERS = [
  "I need to prepare an immigration intake",
  "I need to organize a bankruptcy intake",
  "I need a general client review packet",
];

function IssueCard({
  issue,
  busy,
  onResolve,
}: {
  issue: ReviewIssue;
  busy: boolean;
  onResolve: (issueId: string, selectedValue: string) => Promise<void>;
}) {
  const open = issue.status === "open";
  return (
    <Card className="border border-slate-200 bg-white shadow-none" data-testid={`issue-${issue.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{issue.label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{issue.message}</p>
        </div>
        <Badge color={open ? (issue.kind === "conflict" ? "warning" : "failure") : "success"}>
          {open ? (issue.kind === "conflict" ? "Decision" : "Missing") : "Resolved"}
        </Badge>
      </div>
      {open && issue.kind === "conflict" ? (
        <div className="space-y-2">
          {issue.values.map((value) => (
            <Button
              key={value}
              color="alternative"
              className="w-full justify-start text-left"
              disabled={busy}
              onClick={() => onResolve(issue.id, value)}
            >
              Use: {value}
            </Button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function CopilotPage() {
  const copilot = useCopilot();
  const [draft, setDraft] = useState("");
  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentText, setDocumentText] = useState("");

  const send = async (message: string) => {
    setDraft("");
    await copilot.sendMessage(message);
  };

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    await send(draft);
  };

  const submitDocument = async (event: FormEvent) => {
    event.preventDefault();
    await copilot.analyzeDocument(documentLabel, documentText);
    setDocumentOpen(false);
    setDocumentLabel("");
    setDocumentText("");
  };

  const openIssues = copilot.packet.issues.filter((issue) => issue.status === "open");
  const profileEntries = [
    ["Goal", copilot.packet.profile.goal],
    ["Type", copilot.packet.profile.case_type],
    ["Client", copilot.packet.profile.client_name],
    ["Email", copilot.packet.profile.email],
    ["Phone", copilot.packet.profile.phone],
    ["Location", copilot.packet.profile.location],
  ];

  return (
    <div id="copilot" className="space-y-6">
      <Card className="border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <Badge color="info" className="mb-4 w-fit">AI intake with human control</Badge>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">
              Turn a conversation into a review-ready case packet.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              MatterReady asks only the next useful question, analyzes supporting evidence, exposes
              missing or contradictory facts, and produces a structured handoff for a professional.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["intake", "Structured profile", "Essential facts captured through conversation"],
              ["document", "Evidence matrix", "Every value remains tied to its source"],
              ["review", "Human decisions", "Conflicts cannot be changed silently by AI"],
            ].map(([icon, title, detail]) => (
              <Card key={title} className="border border-blue-100 bg-blue-50/60 shadow-none">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                    <AppIcon name={icon as "intake" | "document" | "review"} size={20} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{detail}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="min-h-[650px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <AppIcon name="sparkles" size={21} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Intake conversation</h2>
                  <p className="text-sm text-slate-500">One question at a time, with visible evidence.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button color="alternative" size="sm" onClick={() => setDocumentOpen(true)}>
                Analyze document
              </Button>
              <Button color="light" size="sm" onClick={copilot.reset}>New intake</Button>
            </div>
          </div>

          {copilot.error ? <Alert color="failure">{copilot.error}</Alert> : null}

          <div className="flex min-h-[390px] flex-1 flex-col gap-4 overflow-y-auto py-2" aria-live="polite">
            {copilot.state.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                    message.role === "user"
                      ? "bg-blue-700 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          {copilot.state.messages.length === 1 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {STARTERS.map((starter) => (
                <Button key={starter} color="alternative" onClick={() => send(starter)} disabled={copilot.busy}>
                  {starter}
                </Button>
              ))}
            </div>
          ) : null}

          {copilot.quickReplies.length ? (
            <div className="flex flex-wrap gap-2">
              {copilot.quickReplies.map((reply) => (
                <Button
                  key={reply}
                  size="xs"
                  color="light"
                  disabled={copilot.busy}
                  onClick={() => reply === "Analyze a document" ? setDocumentOpen(true) : send(reply)}
                >
                  {reply}
                </Button>
              ))}
            </div>
          ) : null}

          <form className="border-t border-slate-200 pt-4" onSubmit={submitMessage}>
            <Label htmlFor="copilot-message" className="sr-only">Message the intake copilot</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Textarea
                id="copilot-message"
                rows={3}
                className="flex-1"
                placeholder="Describe the intake, answer the question, or ask what is missing..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={copilot.busy}
              />
              <Button type="submit" size="lg" disabled={copilot.busy || !draft.trim()}>
                {copilot.busy ? "Analyzing..." : "Send"}
              </Button>
            </div>
          </form>
        </Card>

        <aside id="case-packet" className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge color="gray" className="mb-2 w-fit">Case packet</Badge>
                <h2 className="text-xl font-semibold text-slate-950">Review readiness</h2>
              </div>
              <span data-testid="readiness-score" className="text-3xl font-semibold text-blue-700">
                {copilot.packet.readiness}%
              </span>
            </div>
            <Progress progress={copilot.packet.readiness} color="blue" size="lg" />
            <Alert color={copilot.packet.readiness === 100 ? "success" : "info"}>
              <span className="font-semibold">Next action: </span>{copilot.packet.next_action}
            </Alert>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Structured profile</h2>
            <div className="divide-y divide-slate-100">
              {profileEntries.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[90px_1fr] gap-3 py-3 text-sm">
                  <span className="font-medium text-slate-500">{label}</span>
                  <span className={value ? "text-slate-900" : "text-slate-400"}>
                    {value ? String(value) : "Not provided"}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Review issues</h2>
              <Badge color={openIssues.length ? "warning" : "success"}>{openIssues.length} open</Badge>
            </div>
            <div className="space-y-3">
              {copilot.packet.issues.length ? (
                copilot.packet.issues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} busy={copilot.busy} onResolve={copilot.resolveIssue} />
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  Issues will appear as the conversation and documents add evidence.
                </p>
              )}
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Evidence matrix</h2>
            <div className="space-y-3">
              {copilot.packet.evidence.length ? (
                copilot.packet.evidence.map((row) => (
                  <div key={row.field} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{row.label}</p>
                      <Badge color={row.status === "confirmed" ? "success" : row.status === "conflict" ? "warning" : "gray"}>
                        {row.status}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {row.values.map((item) => (
                        <p key={`${item.source}-${item.value}`}>
                          <span className="font-semibold">{item.source}:</span> {item.value}
                        </p>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  The matrix will show every collected value and its source.
                </p>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <Modal show={documentOpen} onClose={() => setDocumentOpen(false)} dismissible size="2xl">
        <ModalHeader>Analyze supporting evidence</ModalHeader>
        <form onSubmit={submitDocument}>
          <ModalBody className="space-y-5">
            <Alert color="info">
              Paste invented or redacted document text. The copilot extracts supported facts and
              compares them with the conversational profile.
            </Alert>
            <div>
              <Label htmlFor="document-label">Document label</Label>
              <TextInput
                id="document-label"
                value={documentLabel}
                onChange={(event) => setDocumentLabel(event.target.value)}
                placeholder="passport.txt"
                required
              />
            </div>
            <div>
              <Label htmlFor="document-text">Document text</Label>
              <Textarea
                id="document-text"
                rows={10}
                value={documentText}
                onChange={(event) => setDocumentText(event.target.value)}
                placeholder={"Name: Elena Rivera\nEmail: elena@example.com\nAddress: Ponce, Puerto Rico"}
                required
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="submit" disabled={copilot.busy || !documentLabel.trim() || !documentText.trim()}>
              {copilot.busy ? "Analyzing..." : "Analyze evidence"}
            </Button>
            <Button color="alternative" type="button" onClick={() => setDocumentOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
