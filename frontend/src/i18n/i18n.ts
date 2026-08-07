import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enAi from "../locales/en/ai.json";
import enAuth from "../locales/en/auth.json";
import enCommon from "../locales/en/common.json";
import enDashboard from "../locales/en/dashboard.json";
import enErrors from "../locales/en/errors.json";
import enForms from "../locales/en/forms.json";
import enHelp from "../locales/en/help.json";
import enNavigation from "../locales/en/navigation.json";
import enReports from "../locales/en/reports.json";
import enSettings from "../locales/en/settings.json";
import enTables from "../locales/en/tables.json";
import enUsers from "../locales/en/users.json";
import enValidation from "../locales/en/validation.json";
import enWorkspace from "../locales/en/workspace.json";
import esAi from "../locales/es/ai.json";
import esAuth from "../locales/es/auth.json";
import esCommon from "../locales/es/common.json";
import esDashboard from "../locales/es/dashboard.json";
import esErrors from "../locales/es/errors.json";
import esForms from "../locales/es/forms.json";
import esHelp from "../locales/es/help.json";
import esNavigation from "../locales/es/navigation.json";
import esReports from "../locales/es/reports.json";
import esSettings from "../locales/es/settings.json";
import esTables from "../locales/es/tables.json";
import esUsers from "../locales/es/users.json";
import esValidation from "../locales/es/validation.json";
import esWorkspace from "../locales/es/workspace.json";
import { DEFAULT_LANGUAGE } from "./languages";

const resources = {
  es: {
    common: esCommon,
    auth: esAuth,
    navigation: esNavigation,
    dashboard: esDashboard,
    forms: esForms,
    help: esHelp,
    tables: esTables,
    validation: esValidation,
    errors: esErrors,
    users: esUsers,
    reports: esReports,
    settings: esSettings,
    ai: esAi,
    workspace: esWorkspace,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    dashboard: enDashboard,
    forms: enForms,
    help: enHelp,
    tables: enTables,
    validation: enValidation,
    errors: enErrors,
    users: enUsers,
    reports: enReports,
    settings: enSettings,
    ai: enAi,
    workspace: enWorkspace,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  /**
   * No cross-language fallback, deliberately.
   *
   * This used to be `fallbackLng: DEFAULT_LANGUAGE` — Spanish. Any key missing
   * from `en` therefore rendered its Spanish string instead, which is precisely
   * how mixed-language screens survived: the defect looked like a translation
   * that existed, so nobody went looking for it. Parity is guaranteed ahead of
   * this by `scripts/validate-locales.mjs` (a build gate), so switching the
   * fallback off costs nothing at runtime and makes any future gap loud.
   */
  fallbackLng: false,
  // Turns a gap that slipped past the gate into a console error during
  // development instead of a silently plausible screen.
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: import.meta.env.DEV
    ? (languages, namespace, key) => {
        console.error(`[i18n] missing key "${namespace}:${key}" for ${languages.join(", ")}`);
      }
    : undefined,
  interpolation: {
    escapeValue: false,
  },
  defaultNS: "common",
  // Derived from the resource bundle rather than restated: the hand-written
  // list had drifted (it declared "help" twice and could omit a namespace that
  // was actually loaded).
  ns: Object.keys(resources.es),
});

export { i18n };
