import {
  Button,
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
  ["weekly", "Semanal"],
  ["biweekly", "Cada dos semanas"],
  ["semimonthly", "Dos veces al mes"],
  ["monthly", "Mensual"],
  ["quarterly", "Trimestral"],
  ["annual", "Anual"],
];

export function BankruptcyEntryModal({ open, kind, onClose, onSave }: Props) {
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
    income: "Añadir ingreso",
    expense: "Añadir gasto mensual",
    debt: "Añadir deuda",
    asset: "Añadir bien o activo",
    evidence: "Añadir evidencia",
  };

  return (
    <Modal show={open} onClose={onClose} dismissible size="2xl">
      <ModalHeader>{titles[kind]}</ModalHeader>
      <form onSubmit={submit}>
        <ModalBody className="max-h-[72vh] space-y-5 overflow-y-auto">
          {kind === "income" ? (
            <>
              <div><Label htmlFor="income-category">Categoría</Label><Select id="income-category" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">Seleccione</option>{INCOME_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
              <div><Label htmlFor="income-source">Fuente o patrono</Label><TextInput id="income-source" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="gross-amount">Ingreso bruto</Label><TextInput id="gross-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div><Label htmlFor="net-amount">Ingreso neto</Label><TextInput id="net-amount" type="number" min="0" step="0.01" value={netAmount} onChange={(event) => setNetAmount(event.target.value)} /></div></div>
              <div><Label htmlFor="income-frequency">Frecuencia</Label><Select id="income-frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)}>{FREQUENCIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            </>
          ) : null}

          {kind === "expense" ? (
            <>
              <div><Label htmlFor="expense-category">Categoría</Label><Select id="expense-category" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">Seleccione</option>{EXPENSE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
              <div><Label htmlFor="expense-description">Descripción</Label><TextInput id="expense-description" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div><Label htmlFor="expense-amount">Monto mensual</Label><TextInput id="expense-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
              <div className="flex items-center gap-2"><Checkbox id="essential-expense" checked={flag} onChange={(event) => setFlag(event.target.checked)} /><Label htmlFor="essential-expense">Es un gasto necesario para el hogar</Label></div>
            </>
          ) : null}

          {kind === "debt" ? (
            <>
              <div><Label htmlFor="creditor">Acreedor</Label><TextInput id="creditor" value={primary} onChange={(event) => setPrimary(event.target.value)} required /></div>
              <div><Label htmlFor="debt-description">Descripción</Label><TextInput id="debt-description" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div><Label htmlFor="debt-type">Tipo</Label><Select id="debt-type" value={debtType} onChange={(event) => setDebtType(event.target.value as DebtType)}>{DEBT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
              <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="debt-balance">Balance</Label><TextInput id="debt-balance" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div><Label htmlFor="debt-payment">Pago mensual</Label><TextInput id="debt-payment" type="number" min="0" step="0.01" value={monthlyPayment} onChange={(event) => setMonthlyPayment(event.target.value)} /></div><div><Label htmlFor="debt-delinquent">Atraso</Label><TextInput id="debt-delinquent" type="number" min="0" step="0.01" value={delinquentAmount} onChange={(event) => setDelinquentAmount(event.target.value)} /></div></div>
              {debtType === "secured" ? <div><Label htmlFor="collateral">Propiedad que garantiza la deuda</Label><TextInput id="collateral" value={collateral} onChange={(event) => setCollateral(event.target.value)} /></div> : null}
              <div className="flex items-center gap-2"><Checkbox id="collection-lawsuit" checked={flag} onChange={(event) => setFlag(event.target.checked)} /><Label htmlFor="collection-lawsuit">Existe demanda, embargo o acción de cobro</Label></div>
            </>
          ) : null}

          {kind === "asset" ? (
            <>
              <div><Label htmlFor="asset-category">Categoría</Label><Select id="asset-category" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">Seleccione</option>{ASSET_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
              <div><Label htmlFor="asset-description">Descripción</Label><TextInput id="asset-description" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="asset-value">Valor estimado</Label><TextInput id="asset-value" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div><Label htmlFor="asset-loan">Préstamo o gravamen</Label><TextInput id="asset-loan" type="number" min="0" step="0.01" value={monthlyPayment} onChange={(event) => setMonthlyPayment(event.target.value)} /></div></div>
              <div className="flex items-center gap-2"><Checkbox id="jointly-owned" checked={flag} onChange={(event) => setFlag(event.target.checked)} /><Label htmlFor="jointly-owned">Propiedad conjunta</Label></div>
            </>
          ) : null}

          {kind === "evidence" ? (
            <>
              <div><Label htmlFor="evidence-type">Tipo de evidencia</Label><Select id="evidence-type" value={primary} onChange={(event) => setPrimary(event.target.value)} required><option value="">Seleccione</option>{EVIDENCE_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</Select></div>
              <div><Label htmlFor="evidence-file">Archivo</Label><FileInput id="evidence-file" onChange={(event) => setSecondary(event.target.files?.[0]?.name ?? "")} /><p className="mt-1 text-xs text-[#777]">El demo conserva únicamente el nombre y estado del archivo en este navegador.</p></div>
              <div><Label htmlFor="evidence-name">Nombre del documento</Label><TextInput id="evidence-name" value={secondary} onChange={(event) => setSecondary(event.target.value)} required /></div>
              <div><Label htmlFor="evidence-status">Estado</Label><Select id="evidence-status" value={evidenceStatus} onChange={(event) => setEvidenceStatus(event.target.value as EvidenceStatus)}><option value="requested">Solicitado</option><option value="received">Recibido</option><option value="reviewed">Revisado</option></Select></div>
              <div><Label htmlFor="evidence-note">Nota</Label><TextInput id="evidence-note" value={note} onChange={(event) => setNote(event.target.value)} /></div>
            </>
          ) : null}
        </ModalBody>
        <ModalFooter><Button type="submit" className="glade-button">Guardar</Button><Button type="button" color="alternative" onClick={onClose}>Cancelar</Button></ModalFooter>
      </form>
    </Modal>
  );
}
