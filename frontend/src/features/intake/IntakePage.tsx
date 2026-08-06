import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Checkbox, Label, Progress, Spinner, Textarea, TextInput } from "flowbite-react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { PageHeader } from "../../components/ui/PageHeader";
import { caseKeys, useActiveCase } from "../../hooks/useCases";
import { api } from "../../lib/api";
import type { BankruptcyCase } from "../../types";
import { intakeDefinitions } from "./sectionDefinitions";

type FormValues = Record<string, string>;

export function IntakePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { activeCase, isLoading } = useActiveCase();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const definition = intakeDefinitions[step];
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    if (!activeCase) return;
    setStep(Math.min(activeCase.current_step, intakeDefinitions.length - 1));
  }, [activeCase?.id]);

  useEffect(() => {
    const current = activeCase?.sections.find((item) => item.section_key === definition.key);
    reset(Object.fromEntries(Object.entries(current?.data || {}).map(([key, value]) => [key, String(value ?? "")])));
    setCompleted(Boolean(current?.completed));
  }, [activeCase, definition.key, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => (await api.put<BankruptcyCase>(`/cases/${activeCase?.id}/sections/${definition.key}`, { data: values, completed })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: caseKeys.all });
      if (step < intakeDefinitions.length - 1) setStep((current) => current + 1);
    },
  });

  const schema = useMemo(() => z.object(Object.fromEntries(definition.fields.map((field) => [field.key, z.string().trim().min(1, t("intake.required"))]))), [definition, t]);

  function submit(values: FormValues) {
    const result = schema.safeParse(values);
    if (!result.success) return;
    mutation.mutate(values);
  }

  if (isLoading) return <div className="grid min-h-96 place-items-center"><Spinner size="xl" /></div>;
  if (!activeCase) return <Alert color="info">{t("assistant.noCase")}</Alert>;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("intake.title")} subtitle={t("intake.subtitle")} />
      <Card>
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold text-slate-800">{step + 1} / {intakeDefinitions.length}</span><span className="text-slate-500">{t(`sections.${definition.key}`)}</span></div>
          <Progress progress={Math.round(((step + 1) / intakeDefinitions.length) * 100)} />
        </div>
        <ol className="mb-8 hidden grid-cols-9 gap-2 md:grid" aria-label="Intake steps">
          {intakeDefinitions.map((item, index) => (
            <li key={item.key}><button type="button" onClick={() => setStep(index)} className={`h-2 w-full rounded-full ${index <= step ? "bg-cyan-600" : "bg-slate-200"}`} aria-label={t(`sections.${item.key}`)} /></li>
          ))}
        </ol>
        <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
          <h2 className="text-xl font-bold text-slate-900">{t(`sections.${definition.key}`)}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {definition.fields.map((field) => {
              const label = i18n.language.startsWith("es") ? field.labelEs : field.labelEn;
              const common = register(field.key, { required: t("intake.required") });
              return (
                <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                  <Label htmlFor={field.key}>{label}</Label>
                  {field.type === "textarea" ? <Textarea id={field.key} rows={4} {...common} aria-invalid={Boolean(errors[field.key])} /> : <TextInput id={field.key} type={field.type || "text"} {...common} aria-invalid={Boolean(errors[field.key])} />}
                  {errors[field.key] && <p className="mt-1 text-sm text-red-600" role="alert">{String(errors[field.key]?.message)}</p>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <Checkbox id="completed" checked={completed} onChange={(event) => setCompleted(event.target.checked)} />
            <Label htmlFor="completed" className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-700" />{t("intake.complete")}</Label>
          </div>
          {mutation.isError && <Alert color="failure">{t("common.error")}</Alert>}
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <Button color="light" type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft className="mr-2 h-4 w-4" />{t("intake.previous")}</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t("common.loading") : t("intake.next")}<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
