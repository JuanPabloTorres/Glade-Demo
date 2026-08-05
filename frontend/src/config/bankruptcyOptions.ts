export const INCOME_CATEGORIES = [
  ["wages", "Salario o empleo"],
  ["self-employment", "Trabajo por cuenta propia"],
  ["social-security", "Seguro Social"],
  ["pension", "Pensión o retiro"],
  ["support", "Pensión alimentaria o manutención recibida"],
  ["rental", "Ingreso de alquiler"],
  ["other", "Otro ingreso"],
] as const;

export const EXPENSE_CATEGORIES = [
  ["housing", "Vivienda"],
  ["utilities", "Servicios y utilidades"],
  ["food", "Alimentos y artículos del hogar"],
  ["clothing", "Ropa y lavandería"],
  ["medical", "Salud, medicina y cuidado dental"],
  ["transportation", "Transportación"],
  ["insurance", "Seguros e impuestos"],
  ["childcare", "Cuido, educación y dependientes"],
  ["support", "Manutención pagada"],
  ["personal", "Cuidado personal y recreación"],
  ["other", "Otro gasto"],
] as const;

export const DEBT_TYPES = [
  ["secured", "Garantizada por propiedad"],
  ["priority", "Prioritaria"],
  ["unsecured", "No garantizada"],
] as const;

export const ASSET_CATEGORIES = [
  ["real-estate", "Bienes raíces"],
  ["vehicle", "Vehículo"],
  ["bank-account", "Cuenta bancaria"],
  ["retirement", "Cuenta de retiro"],
  ["personal-property", "Propiedad personal"],
  ["insurance", "Póliza o valor en seguro"],
  ["business", "Interés en negocio"],
  ["claim", "Reclamación o derecho a recibir dinero"],
  ["other", "Otro activo"],
] as const;

export const EVIDENCE_TYPES = [
  "Identificación vigente",
  "Talones de pago",
  "Estado bancario",
  "Planilla o transcripción contributiva",
  "Estado de cuenta de acreedor",
  "Contrato de arrendamiento",
  "Estado hipotecario",
  "Estado de préstamo de vehículo",
  "Demanda, embargo o notificación de cobro",
  "Documento de propiedad o valoración",
  "Certificado de orientación crediticia",
  "Otro documento",
] as const;

export const STATUS_LABELS = {
  draft: "Borrador",
  collecting_information: "Recopilando información",
  submitted: "Solicitud enviada",
  attorney_review: "Revisión del abogado",
  consultation_scheduled: "Consulta programada",
  decision_pending: "Decisión pendiente",
  filing_preparation: "Preparación para presentación",
  closed: "Cerrado",
} as const;
