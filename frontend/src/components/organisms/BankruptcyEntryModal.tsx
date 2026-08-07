import { Alert } from "flowbite-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "../ui/AppButton";
import { AppModal, AppModalBody, AppModalFooter, AppModalForm } from "../overlays/AppModal";
import { FileField, type SelectedFile } from "../forms/FileField";
import { CheckboxField, FormGrid, SelectField, TextField, TextareaField } from "../forms/fields";
import {
  ASSET_CATEGORIES,
  DEBT_TYPES,
  EVIDENCE_TYPES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "../../config/bankruptcyOptions";
import type {
  DebtType,
  EntryKind,
  EntrySubmission,
  EvidenceStatus,
  Frequency,
} from "../../types/bankruptcy";

interface Props {
  open: boolean;
  kind: EntryKind | null;
  onClose: () => void;
  /** May be async; the modal keeps its submitting state until it settles. */
  onSave: (submission: EntrySubmission) => void | Promise<void>;
}

const FREQUENCIES: Array<[Frequency, string]> = [
  ["weekly", "weekly"],
  ["biweekly", "biweekly"],
  ["semimonthly", "semimonthly"],
  ["monthly", "monthly"],
  ["quarterly", "quarterly"],
  ["annual", "annual"],
];

/**
 * The fields each entry kind requires, by the state key that backs them.
 *
 * This is a direct transcription of the `required` attributes the form
 * previously relied on — the rules are unchanged, they are simply evaluated
 * here so the message can be rendered inline, next to the field it belongs to,
 * instead of in a native validation bubble the app cannot translate.
 */
const REQUIRED_FIELDS: Record<EntryKind, ReadonlyArray<"primary" | "secondary" | "amount">> = {
  income: ["primary", "secondary", "amount"],
  expense: ["primary", "secondary", "amount"],
  debt: ["primary", "secondary", "amount"],
  asset: ["primary", "secondary", "amount"],
  evidence: ["primary", "secondary"],
};

/** The DOM id of each required field, so the first invalid one can take focus. */
const FIELD_IDS: Record<EntryKind, Record<string, string>> = {
  income: { primary: "income-category", secondary: "income-source", amount: "gross-amount" },
  expense: { primary: "expense-category", secondary: "expense-description", amount: "expense-amount" },
  debt: { primary: "creditor", secondary: "debt-description", amount: "debt-balance" },
  asset: { primary: "asset-category", secondary: "asset-description", amount: "asset-value" },
  evidence: { primary: "evidence-type", secondary: "evidence-name" },
};

type FieldKey = "primary" | "secondary" | "amount";

export function BankruptcyEntryModal({ open, kind, onClose, onSave }: Props) {
  const { t } = useTranslation(["workspace", "common"]);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [amount, setAmount] = useState("");
  const [netAmount, setNetAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [debtType, setDebtType] = useState<DebtType>("unsecured");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [delinquentAmount, setDelinquentAmount] = useState("");
  const [collateral, setCollateral] = useState("");
  const [flag, setFlag] = useState(false);
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceStatus>("received");
  const [note, setNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<SelectedFile | null>(null);

  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  // Guards against a second submit slipping through before React has
  // re-rendered the disabled button (double-click, or Enter held down).
  const submitLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    setPrimary("");
    setSecondary("");
    setAmount("");
    setNetAmount("");
    setFrequency("monthly");
    setDebtType("unsecured");
    setMonthlyPayment("");
    setDelinquentAmount("");
    setCollateral("");
    setFlag(false);
    setEvidenceStatus("received");
    setNote("");
    setEvidenceFile(null);
    setErrors({});
    setSubmitting(false);
    setSubmitFailed(false);
    submitLock.current = false;
  }, [open, kind]);

  if (!kind) return null;

  const values: Record<FieldKey, string> = { primary, secondary, amount };

  /** Clears a field's error as soon as it has a value, so the fix is immediate. */
  const clearError = (field: FieldKey) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const validate = () => {
    const next: Partial<Record<FieldKey, string>> = {};
    for (const field of REQUIRED_FIELDS[kind]) {
      if (!values[field].trim()) next[field] = t("common:validation.required");
    }
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      const firstInvalid = REQUIRED_FIELDS[kind].find((field) => found[field]);
      const elementId = firstInvalid ? FIELD_IDS[kind][firstInvalid] : undefined;
      if (elementId) document.getElementById(elementId)?.focus();
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setSubmitFailed(false);

    const entryId = `${kind}-${crypto.randomUUID()}`;
    const numericAmount = Number(amount || 0);
    try {
      if (kind === "income") {
        await onSave({ kind, value: { id: entryId, category: primary, source: secondary, grossAmount: numericAmount, netAmount: netAmount ? Number(netAmount) : undefined, frequency, evidenceIds: [] } });
      } else if (kind === "expense") {
        await onSave({ kind, value: { id: entryId, category: primary, description: secondary, monthlyAmount: numericAmount, essential: flag, evidenceIds: [] } });
      } else if (kind === "debt") {
        await onSave({ kind, value: { id: entryId, creditor: primary, debtType, description: secondary, balance: numericAmount, monthlyPayment: Number(monthlyPayment || 0), delinquentAmount: Number(delinquentAmount || 0), collateral: collateral || undefined, collectionLawsuit: flag, evidenceIds: [] } });
      } else if (kind === "asset") {
        await onSave({ kind, value: { id: entryId, category: primary, description: secondary, estimatedValue: numericAmount, loanBalance: Number(monthlyPayment || 0), jointlyOwned: flag, evidenceIds: [] } });
      } else {
        await onSave({ kind, value: { id: entryId, evidenceType: primary, name: secondary, status: evidenceStatus, note: note || undefined, relatedEntryIds: [] } });
      }
      onClose();
    } catch {
      // The entry is still on screen and still editable — surface the failure
      // at form level (it belongs to no single field) and release the lock so
      // the user can retry.
      setSubmitFailed(true);
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const titles: Record<EntryKind, string> = {
    income: t("workspace:entryModal.titles.income"),
    expense: t("workspace:entryModal.titles.expense"),
    debt: t("workspace:entryModal.titles.debt"),
    asset: t("workspace:entryModal.titles.asset"),
    evidence: t("workspace:entryModal.titles.evidence"),
  };

  const selectPlaceholder = t("workspace:entryModal.fields.select");

  return (
    <AppModal open={open} onClose={onClose} title={titles[kind]} size="2xl">
      <AppModalForm onSubmit={submit}>
        <AppModalBody>
          {submitFailed ? (
            <Alert color="failure" role="alert">
              {t("common:validation.submitFailed")}
            </Alert>
          ) : null}

          {kind === "income" ? (
            <>
              <SelectField
                id="income-category"
                label={t("workspace:entryModal.fields.category")}
                required
                error={errors.primary}
                value={primary}
                onChange={(event) => {
                  setPrimary(event.target.value);
                  clearError("primary");
                }}
              >
                <option value="">{selectPlaceholder}</option>
                {INCOME_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`workspace:entryModal.incomeCategories.${value}`)}
                  </option>
                ))}
              </SelectField>
              <TextField
                id="income-source"
                label={t("workspace:entryModal.fields.incomeSource")}
                required
                error={errors.secondary}
                value={secondary}
                onChange={(event) => {
                  setSecondary(event.target.value);
                  clearError("secondary");
                }}
              />
              <FormGrid>
                <TextField
                  id="gross-amount"
                  label={t("workspace:entryModal.fields.grossIncome")}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  error={errors.amount}
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    clearError("amount");
                  }}
                />
                <TextField
                  id="net-amount"
                  label={t("workspace:entryModal.fields.netIncome")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={netAmount}
                  onChange={(event) => setNetAmount(event.target.value)}
                />
              </FormGrid>
              <SelectField
                id="income-frequency"
                label={t("workspace:entryModal.fields.frequency")}
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as Frequency)}
              >
                {FREQUENCIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(`workspace:entryModal.frequencies.${label}`)}
                  </option>
                ))}
              </SelectField>
            </>
          ) : null}

          {kind === "expense" ? (
            <>
              <SelectField
                id="expense-category"
                label={t("workspace:entryModal.fields.category")}
                required
                error={errors.primary}
                value={primary}
                onChange={(event) => {
                  setPrimary(event.target.value);
                  clearError("primary");
                }}
              >
                <option value="">{selectPlaceholder}</option>
                {EXPENSE_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`workspace:entryModal.expenseCategories.${value}`)}
                  </option>
                ))}
              </SelectField>
              <TextField
                id="expense-description"
                label={t("workspace:entryModal.fields.description")}
                required
                error={errors.secondary}
                value={secondary}
                onChange={(event) => {
                  setSecondary(event.target.value);
                  clearError("secondary");
                }}
              />
              <TextField
                id="expense-amount"
                label={t("workspace:entryModal.fields.monthlyAmount")}
                type="number"
                min="0"
                step="0.01"
                required
                error={errors.amount}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  clearError("amount");
                }}
              />
              <CheckboxField
                id="essential-expense"
                label={t("workspace:entryModal.fields.essentialExpense")}
                checked={flag}
                onChange={setFlag}
              />
            </>
          ) : null}

          {kind === "debt" ? (
            <>
              <TextField
                id="creditor"
                label={t("workspace:entryModal.fields.creditor")}
                required
                error={errors.primary}
                value={primary}
                onChange={(event) => {
                  setPrimary(event.target.value);
                  clearError("primary");
                }}
              />
              <TextField
                id="debt-description"
                label={t("workspace:entryModal.fields.description")}
                required
                error={errors.secondary}
                value={secondary}
                onChange={(event) => {
                  setSecondary(event.target.value);
                  clearError("secondary");
                }}
              />
              <SelectField
                id="debt-type"
                label={t("workspace:entryModal.fields.type")}
                value={debtType}
                onChange={(event) => setDebtType(event.target.value as DebtType)}
              >
                {DEBT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t(`workspace:entryModal.debtTypes.${value}`)}
                  </option>
                ))}
              </SelectField>
              <FormGrid>
                <TextField
                  id="debt-balance"
                  label={t("workspace:entryModal.fields.balance")}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  error={errors.amount}
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    clearError("amount");
                  }}
                />
                <TextField
                  id="debt-payment"
                  label={t("workspace:entryModal.fields.monthlyPayment")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyPayment}
                  onChange={(event) => setMonthlyPayment(event.target.value)}
                />
                <TextField
                  id="debt-delinquent"
                  label={t("workspace:entryModal.fields.delinquent")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={delinquentAmount}
                  onChange={(event) => setDelinquentAmount(event.target.value)}
                />
                {debtType === "secured" ? (
                  <TextField
                    id="collateral"
                    label={t("workspace:entryModal.fields.collateral")}
                    value={collateral}
                    onChange={(event) => setCollateral(event.target.value)}
                  />
                ) : null}
              </FormGrid>
              <CheckboxField
                id="collection-lawsuit"
                label={t("workspace:entryModal.fields.collectionAction")}
                checked={flag}
                onChange={setFlag}
              />
            </>
          ) : null}

          {kind === "asset" ? (
            <>
              <SelectField
                id="asset-category"
                label={t("workspace:entryModal.fields.category")}
                required
                error={errors.primary}
                value={primary}
                onChange={(event) => {
                  setPrimary(event.target.value);
                  clearError("primary");
                }}
              >
                <option value="">{selectPlaceholder}</option>
                {ASSET_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`workspace:entryModal.assetCategories.${value}`)}
                  </option>
                ))}
              </SelectField>
              <TextField
                id="asset-description"
                label={t("workspace:entryModal.fields.description")}
                required
                error={errors.secondary}
                value={secondary}
                onChange={(event) => {
                  setSecondary(event.target.value);
                  clearError("secondary");
                }}
              />
              <FormGrid>
                <TextField
                  id="asset-value"
                  label={t("workspace:entryModal.fields.estimatedValue")}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  error={errors.amount}
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    clearError("amount");
                  }}
                />
                <TextField
                  id="asset-loan"
                  label={t("workspace:entryModal.fields.loanBalance")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyPayment}
                  onChange={(event) => setMonthlyPayment(event.target.value)}
                />
              </FormGrid>
              <CheckboxField
                id="jointly-owned"
                label={t("workspace:entryModal.fields.jointlyOwned")}
                checked={flag}
                onChange={setFlag}
              />
            </>
          ) : null}

          {kind === "evidence" ? (
            <>
              {/* The two classifying selects pair on desktop and stack below
                  `md`; the attachment, its name and the note stay full width,
                  because halving them would truncate exactly the values most
                  likely to be long. */}
              <FormGrid>
                <SelectField
                  id="evidence-type"
                  label={t("workspace:entryModal.fields.evidenceType")}
                  required
                  error={errors.primary}
                  value={primary}
                  onChange={(event) => {
                    setPrimary(event.target.value);
                    clearError("primary");
                  }}
                >
                  <option value="">{selectPlaceholder}</option>
                  {EVIDENCE_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {t(`workspace:entryModal.evidenceTypes.${value}`)}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  id="evidence-status"
                  label={t("workspace:entryModal.fields.status")}
                  value={evidenceStatus}
                  onChange={(event) => setEvidenceStatus(event.target.value as EvidenceStatus)}
                >
                  <option value="requested">{t("workspace:entryModal.evidenceStatus.requested")}</option>
                  <option value="received">{t("workspace:entryModal.evidenceStatus.received")}</option>
                  <option value="reviewed">{t("workspace:entryModal.evidenceStatus.reviewed")}</option>
                </SelectField>
              </FormGrid>
              <FileField
                id="evidence-file"
                label={t("workspace:entryModal.fields.file")}
                hint={t("workspace:entryModal.fields.fileHelper")}
                file={evidenceFile}
                onSelect={(file) => {
                  setEvidenceFile(file ? { name: file.name, size: file.size } : null);
                  // Unchanged from before this refactor: picking a file names
                  // the document after it. The file is now tracked separately
                  // so editing the name no longer discards the attachment.
                  if (file) {
                    setSecondary(file.name);
                    clearError("secondary");
                  }
                }}
              />
              <TextField
                id="evidence-name"
                label={t("workspace:entryModal.fields.documentName")}
                required
                error={errors.secondary}
                value={secondary}
                onChange={(event) => {
                  setSecondary(event.target.value);
                  clearError("secondary");
                }}
              />
              <TextareaField
                id="evidence-note"
                label={t("workspace:entryModal.fields.note")}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </>
          ) : null}
        </AppModalBody>

        <AppModalFooter>
          <AppButton type="button" color="alternative" className="w-full sm:w-auto" onClick={onClose} disabled={submitting}>
            {t("common:actions.cancel")}
          </AppButton>
          <AppButton type="submit" className="glade-button w-full sm:w-auto" loading={submitting}>
            {submitting ? t("common:actions.saving") : t("common:actions.save")}
          </AppButton>
        </AppModalFooter>
      </AppModalForm>
    </AppModal>
  );
}
