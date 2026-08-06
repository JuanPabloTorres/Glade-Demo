export interface IntakeField {
  key: string;
  labelEs: string;
  labelEn: string;
  type?: "text" | "number" | "date" | "textarea";
  placeholderEs?: string;
  placeholderEn?: string;
}

export interface IntakeDefinition {
  key: string;
  fields: IntakeField[];
}

export const intakeDefinitions: IntakeDefinition[] = [
  { key: "personal", fields: [
    { key: "legal_name", labelEs: "Nombre legal completo", labelEn: "Full legal name" },
    { key: "date_of_birth", labelEs: "Fecha de nacimiento", labelEn: "Date of birth", type: "date" },
    { key: "address", labelEs: "Dirección residencial", labelEn: "Residential address" },
  ]},
  { key: "household", fields: [
    { key: "household_size", labelEs: "Personas en el hogar", labelEn: "Household size", type: "number" },
    { key: "dependents", labelEs: "Dependientes", labelEn: "Dependents", type: "number" },
  ]},
  { key: "income", fields: [
    { key: "employer", labelEs: "Patrono principal", labelEn: "Primary employer" },
    { key: "monthly_income", labelEs: "Ingreso mensual aproximado", labelEn: "Approximate monthly income", type: "number" },
    { key: "other_income", labelEs: "Otros ingresos", labelEn: "Other income", type: "textarea" },
  ]},
  { key: "expenses", fields: [
    { key: "housing", labelEs: "Vivienda mensual", labelEn: "Monthly housing", type: "number" },
    { key: "utilities", labelEs: "Utilidades mensuales", labelEn: "Monthly utilities", type: "number" },
    { key: "other_expenses", labelEs: "Otros gastos", labelEn: "Other expenses", type: "textarea" },
  ]},
  { key: "assets", fields: [
    { key: "real_estate", labelEs: "Bienes raíces", labelEn: "Real estate", type: "textarea" },
    { key: "vehicles", labelEs: "Vehículos", labelEn: "Vehicles", type: "textarea" },
    { key: "bank_accounts", labelEs: "Cuentas bancarias", labelEn: "Bank accounts", type: "textarea" },
  ]},
  { key: "debts", fields: [
    { key: "secured_debts", labelEs: "Deudas garantizadas", labelEn: "Secured debts", type: "textarea" },
    { key: "unsecured_debts", labelEs: "Deudas no garantizadas", labelEn: "Unsecured debts", type: "textarea" },
  ]},
  { key: "recent_activity", fields: [
    { key: "transfers", labelEs: "Transferencias recientes", labelEn: "Recent transfers", type: "textarea" },
    { key: "lawsuits", labelEs: "Demandas o cobros recientes", labelEn: "Recent lawsuits or collections", type: "textarea" },
  ]},
  { key: "documents", fields: [
    { key: "paystubs", labelEs: "Comprobantes de ingreso disponibles", labelEn: "Available pay stubs" },
    { key: "bank_statements", labelEs: "Estados bancarios disponibles", labelEn: "Available bank statements" },
  ]},
  { key: "review", fields: [
    { key: "confirmation", labelEs: "Escriba CONFIRMO para validar que revisó la información", labelEn: "Type I CONFIRM to verify that you reviewed the information" },
  ]},
];
