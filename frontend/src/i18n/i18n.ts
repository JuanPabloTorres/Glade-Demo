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
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  defaultNS: "common",
  ns: [
    "common",
    "auth",
    "navigation",
    "dashboard",
    "forms",
    "help",
    "tables",
    "validation",
    "errors",
    "users",
    "reports",
    "settings",
    "ai",
    "workspace",
    "help",
  ],
});

export { i18n };
