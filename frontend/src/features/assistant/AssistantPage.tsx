import { useMutation } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, Progress, Spinner, Textarea } from "flowbite-react";
import { Bot, CheckCircle2, Send, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { useActiveCase } from "../../hooks/useCases";
import { api } from "../../lib/api";
import type { AssistantReply } from "../../types";

interface ChatMessage { role: "assistant" | "user"; text: string }

export function AssistantPage() {
  const { t, i18n } = useTranslation();
  const { activeCase, isLoading } = useActiveCase();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: t("assistant.welcome") }]);
  const mutation = useMutation({
    mutationFn: async (content: string) => (await api.post<AssistantReply>("/assistant/chat", { case_id: activeCase?.id, message: content, language: i18n.language.startsWith("es") ? "es" : "en" })).data,
    onSuccess: (reply) => setMessages((current) => [...current, { role: "assistant", text: reply.message }]),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const content = message.trim();
    if (!content || !activeCase) return;
    setMessages((current) => [...current, { role: "user", text: content }]);
    setMessage("");
    mutation.mutate(content);
  }

  if (isLoading) return <div className="grid min-h-96 place-items-center"><Spinner size="xl" /></div>;
  if (!activeCase) return <Alert color="info">{t("assistant.noCase")}</Alert>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("assistant.title")} subtitle={t("assistant.subtitle")} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("common.progress")} value={`${activeCase.progress}%`} icon={CheckCircle2} />
        <StatCard label={t("common.readiness")} value={`${activeCase.readiness_score}%`} icon={Bot} />
        <Card><p className="text-sm text-slate-500">Status</p><Badge color="info" className="mt-2 w-fit">{activeCase.status}</Badge><Progress progress={activeCase.progress} className="mt-4" /></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="max-h-[52vh] min-h-96 space-y-4 overflow-y-auto pr-2" aria-live="polite">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`flex gap-3 ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                {item.role === "assistant" && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-100 text-cyan-700"><Bot className="h-4 w-4" /></div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}>{item.text}</div>
                {item.role === "user" && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-700"><UserRound className="h-4 w-4" /></div>}
              </div>
            ))}
            {mutation.isPending && <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner size="sm" />{t("common.loading")}</div>}
          </div>
          {mutation.isError && <Alert color="failure" className="mt-4">{t("common.error")}</Alert>}
          <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
            <Textarea aria-label={t("assistant.placeholder")} placeholder={t("assistant.placeholder")} value={message} onChange={(event) => setMessage(event.target.value)} rows={2} className="flex-1" />
            <Button type="submit" disabled={!message.trim() || mutation.isPending}><Send className="mr-2 h-4 w-4" />{t("assistant.send")}</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold text-slate-900">{activeCase.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("common.legal")}</p>
          <div className="mt-5 space-y-2">
            {activeCase.sections.filter((section) => !section.completed).slice(0, 5).map((section) => (
              <div key={section.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{t(`sections.${section.section_key}`)}</span><Badge color="warning">Pending</Badge></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
