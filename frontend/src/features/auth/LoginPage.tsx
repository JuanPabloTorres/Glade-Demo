import { Alert, Button, Card, Label, TextInput } from "flowbite-react";
import { Scale, ShieldCheck, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const DEMO_PASSWORD = "Demo123!";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("applicant@freshstart.demo");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/assistant" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(false);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  function useDemoAccount(account: "applicant" | "manager") {
    setEmail(account === "applicant" ? "applicant@freshstart.demo" : "manager@freshstart.demo");
    setPassword(DEMO_PASSWORD);
  }

  function changeLanguage(language: "es" | "en") {
    localStorage.setItem("freshstart_language", language);
    void i18n.changeLanguage(language);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-2">
        <section className="text-white">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            {t("brand")}
          </div>
          <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl">{t("login.title")}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{t("login.subtitle")}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <ShieldCheck className="mb-3 h-6 w-6 text-cyan-300" aria-hidden="true" />
              <p className="font-semibold">JWT + roles</p>
              <p className="mt-1 text-sm text-slate-300">Applicant, case manager and administrator access.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <Scale className="mb-3 h-6 w-6 text-cyan-300" aria-hidden="true" />
              <p className="font-semibold">Human review first</p>
              <p className="mt-1 text-sm text-slate-300">Administrative preparation without replacing legal advice.</p>
            </div>
          </div>
        </section>

        <Card className="w-full shadow-2xl">
          <div className="flex justify-end gap-2" aria-label="Language selector">
            <Button size="xs" color={i18n.language === "es" ? "blue" : "light"} onClick={() => changeLanguage("es")}>ES</Button>
            <Button size="xs" color={i18n.language === "en" ? "blue" : "light"} onClick={() => changeLanguage("en")}>EN</Button>
          </div>
          <form className="space-y-5" onSubmit={submit} noValidate>
            {error && <Alert color="failure">{t("login.invalid")}</Alert>}
            <div>
              <Label htmlFor="email">{t("login.email")}</Label>
              <TextInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">{t("login.password")}</Label>
              <TextInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("common.loading") : t("login.submit")}
            </Button>
          </form>
          <div className="border-t border-slate-200 pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">{t("login.demo")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button color="light" onClick={() => useDemoAccount("applicant")}>{t("login.applicant")}</Button>
              <Button color="light" onClick={() => useDemoAccount("manager")}>{t("login.manager")}</Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
