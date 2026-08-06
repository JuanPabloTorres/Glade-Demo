import {
  Checkbox,
  FileInput,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  TextInput,
} from "flowbite-react";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "../ui/AppButton";
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
  onSave: (submission: EntrySubmission) => void;
}

const FREQUENCIES: Array<[Frequency, string]> = [
  ["weekly", "weekly"],
  ["biweekly", "biweekly"],
  ["semimonthly", "semimonthly"],
  ["monthly", "monthly"],
  ["quarterly", "quarterly"],
  ["annual", "annual"],
];

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
  }, [open, kind]);

  if (!kind) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const entryId = `${kind}-${crypto.randomUUID()}`;
    const numericAmount = Number(amount || 0);
    if (kind === "income") {
      onSave({ kind, value: { id: entryId, category: primary, source: secondary, grossAmount: numericAmount, netAmount: netAmount ? Number(netAmount) : undefined, frequency, evidenceIds: [] } });
    } else if (kind === "expense") {
      onSave({ kind, value: { id: entryId, category: primary, description: secondary, monthlyAmount: numericAmount, essential: flag, evidenceIds: [] } });
    } else if (kind === "debt") {
      onSave({ kind, value: { id: entryId, creditor: primary, debtType, description: secondary, balance: numericAmount, monthlyPayment: Number(monthlyPayment || 0), delinquentAmount: Number(delinquentAmount || 0), collateral: collateral || undefined, collectionLawsuit: flag, evidenceIds: [] } });
    } else if (kind === "asset") {
      onSave({ kind, value: { id: entryId, category: primary, description: secondary, estimatedValue: numericAmount, loanBalance: Number(monthlyPayment || 0), jointlyOwned: flag, evidenceIds: [] } });
    } else {
      onSave({ kind, value: { id: entryId, evidenceType: primary, name: secondary, status: evidenceStatus, note: note || undefined, relatedEntryIds: [] } });
    }
    onClose();
  };

  const titles: Record<EntryKind, string> = {
    income: t("workspace:entryModal.titles.income"),
    expense: t("workspace:entryModal.titles.expense"),
    debt: t("workspace:entryModal.titles.debt"),
    asset: t("workspace:entryModal.titles.asset"),
    evidence: t("workspace:entryModal.titles.evidence"),
  };

  return (
    <Modal show={open} onClose={onClose} dismissible size="2xl">
      <ModalHeader>{titles[kind]}</ModalHeader>
      <form onSubmit={submit}>
        <ModalBody className="max-h-[72vh] space-y-5 overflow-y-auto">
          {kind === "income" ? (
            <>
              <div><Label htmlFor="income-category">{t("workspace:entryModal.fields.category")}</Label><Select id="income-category" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">{t("workspace:entryModal.fields.select")}</option>{INCOME_CATEGORIES.map((value) => <option key={value} value={value}>{t(`workspace:entryModal.incomeCategories.${value}`)}</option>)}</Select></div>
              <div><Label htmlFor="income-source">{t("workspace:entryModal.fields.incomeSource")}</Label><TextInput id="income-source" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="gross-amount">{t("workspace:entryModal.fields.grossIncome")}</Label><TextInput id="gross-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div><Label htmlFor="net-amount">{t("workspace:entryModal.fields.netIncome")}</Label><TextInput id="net-amount" type="number" min="0" step="0.01" value={netAmount} onChange={(event) => setNetAmount(event.target.value)} /></div></div>
              <div><Label htmlFor="income-frequency">{t("workspace:entryModal.fields.frequency")}</Label><Select id="income-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>{FREQUENCIES.map(([value, label]) => <option key={value} value={value}>{t(`workspace:entryModal.frequencies.${label}`)}</option>)}</Select></div>
            </>
          ) : null}

          {kind === "expense" ? (
            <>
              <div><Label htmlFor="expense-category">{t("workspace:entryModal.fields.category")}</Label><Select id="expense-category" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">{t("workspace:entryModal.fields.select")}</option>{EXPENSE_CATEGORIES.map((value) => <option key={value} value={value}>{t(`workspace:entryModal.expenseCategories.${value}`)}</option>)}</Select></div>
              <div><Label htmlFor="expense-description">{t("workspace:entryModal.fields.description")}</Label><TextInput id="expense-description" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div><Label htmlFor="expense-amount">{t("workspace:entryModal.fields.monthlyAmount")}</Label><TextInput id="expense-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
              <div className="flex items-center gap-2"><Checkbox id="essential-expense" checked={flag} onChange={(event) => setFlag(event.target.checked)} /><Label htmlFor="essential-expense">{t("workspace:entryModal.fields.essentialExpense")}</Label></div>
            </>
          ) : null}

          {kind === "debt" ? (
            <>
              <div><Label htmlFor="creditor">{t("workspace:entryModal.fields.creditor")}</Label><TextInput id="creditor" value={primary} onChange={(event) => setPrimary(event.target.value)} required /></div>
              <div><Label htmlFor="debt-description">{t("workspace:entryModal.fields.description")}</Label><TextInput id="debt-description" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div><Label htmlFor="debt-type">{t("workspace:entryModal.fields.type")}</Label><Select id="debt-type" value={debtType} onChange={(event) => setDebtType(event.target.value as DebtType)}>{DEBT_TYPES.map((value) => <option key={value} value={value}>{t(`workspace:entryModal.debtTypes.${value}`)}</option>)}</Select></div>
              <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="debt-balance">{t("workspace:entryModal.fields.balance")}</Label><TextInput id="debt-balance" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div><Label htmlFor="debt-payment">{t("workspace:entryModal.fields.monthlyPayment")}</Label><TextInput id="debt-payment" type="number" min="0" step="0.01" value={monthlyPayment} onChange={(event) => setMonthlyPayment(event.target.value)} /></div><div><Label htmlFor="debt-delinquent">{t("workspace:entryModal.fields.delinquent")}</Label><TextInput id="debt-delinquent" type="number" min="0" step="0.01" value={delinquentAmount} onChange={(event) => setDelinquentAmount(event.target.value)} /></div></div>
              {debtType === "secured" ? <div><Label htmlFor="collateral">{t("workspace:entryModal.fields.collateral")}</Label><TextInput id="collateral" value={collateral} onChange={(event) => setCollateral(event.target.value)} /></div> : null}
              <div className="flex items-center gap-2"><Checkbox id="collection-lawsuit" checked={flag} onChange={(event) => setFlag(event.target.checked)} /><Label htmlFor="collection-lawsuit">{t("workspace:entryModal.fields.collectionAction")}</Label></div>
            </>
          ) : null}

          {kind === "asset" ? (
            <>
              <div><Label htmlFor="asset-category">{t("workspace:entryModal.fields.category")}</Label><Select id="asset-category" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">{t("workspace:entryModal.fields.select")}</option>{ASSET_CATEGORIES.map((value) => <option key={value} value={value}>{t(`workspace:entryModal.assetCategories.${value}`)}</option>)}</Select></div>
              <div><Label htmlFor="asset-description">{t("workspace:entryModal.fields.description")}</Label><TextInput id="asset-description" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="asset-value">{t("workspace:entryModal.fields.estimatedValue")}</Label><TextInput id="asset-value" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div><Label htmlFor="asset-loan">{t("workspace:entryModal.fields.loanBalance")}</Label><TextInput id="asset-loan" type="number" min="0" step="0.01" value={monthlyPayment} onChange={(event) => setMonthlyPayment(event.target.value)} /></div></div>
              <div className="flex items-center gap-2"><Checkbox id="jointly-owned" checked={flag} onChange={(event) => setFlag(event.target.checked)} /><Label htmlFor="jointly-owned">{t("workspace:entryModal.fields.jointlyOwned")}</Label></div>
            </>
          ) : null}

          {kind === "evidence" ? (
            <>
              <div><Label htmlFor="evidence-type">{t("workspace:entryModal.fields.evidenceType")}</Label><Select id="evidence-type" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">{t("workspace:entryModal.fields.select")}</option>{EVIDENCE_TYPES.map((value) => <option key={value} value={value}>{t(`workspace:entryModal.evidenceTypes.${value}`)}</option>)}</Select></div>
              <div><Label htmlFor="evidence-file">{t("workspace:entryModal.fields.file")}</Label><FileInput id="evidence-file" onChange={(event) => setSecondary(event.target.files?.[0]?.name ?? "")} /><p className="mt-1 text-xs text-[#777]">{t("workspace:entryModal.fields.fileHelper")}</p></div>
              <div><Label htmlFor="evidence-name">{t("workspace:entryModal.fields.documentName")}</Label><TextInput id="evidence-name" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div><Label htmlFor="evidence-status">{t("workspace:entryModal.fields.status")}</Label><Select id="evidence-status" value={evidenceStatus} onChange={(event) => setEvidenceStatus(event.target.value as EvidenceStatus)}><option value="requested">{t("workspace:entryModal.evidenceStatus.requested")}</option><option value="received">{t("workspace:entryModal.evidenceStatus.received")}</option><option value="reviewed">{t("workspace:entryModal.evidenceStatus.reviewed")}</option></Select></div>
              <div><Label htmlFor="evidence-note">{t("workspace:entryModal.fields.note")}</Label><TextInput id="evidence-note" value={note} onChange={(event) => setNote(event.target.value)} /></div>
            </>
          ) : null}
        </ModalBody>
        <ModalFooter><AppButton type="submit" className="glade-button">{t("common:actions.save")}</AppButton><AppButton type="button" color="alternative" onClick={onClose}>{t("common:actions.cancel")}</AppButton></ModalFooter>
      </form>
    </Modal>
  );
}
