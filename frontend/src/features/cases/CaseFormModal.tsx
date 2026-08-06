import { useQuery } from "@tanstack/react-query";
import { Button, Label, Modal, Select, TextInput } from "flowbite-react";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import type { BankruptcyCase, CaseStatus, PreferredLanguage, User, UserRole } from "../../types";

export interface CaseFormPayload {
  title: string;
  preferred_language: PreferredLanguage;
  status?: CaseStatus;
  applicant_id?: string;
}

export function CaseFormModal({ open, item, role, onClose, onSave, saving }: {
  open: boolean;
  item: BankruptcyCase | null;
  role: UserRole;
  onClose: () => void;
  onSave: (payload: CaseFormPayload) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<PreferredLanguage>("es");
  const [status, setStatus] = useState<CaseStatus>("draft");
  const [applicantId, setApplicantId] = useState("");
  const applicants = useQuery({
    queryKey: ["applicants"],
    enabled: open && role !== "applicant",
    queryFn: async () => (await api.get<User[]>("/users/applicants")).data,
  });

  useEffect(() => {
    setTitle(item?.title || "");
    setLanguage(item?.preferred_language || "es");
    setStatus(item?.status || "draft");
    setApplicantId(item?.applicant_id || applicants.data?.[0]?.id || "");
  }, [item, open, applicants.data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      preferred_language: language,
      ...(item && role !== "applicant" ? { status } : {}),
      ...(!item && role !== "applicant" ? { applicant_id: applicantId } : {}),
    });
  }

  const statuses: CaseStatus[] = ["draft", "in_progress", "ready_for_review", "under_review", "closed"];

  return (
    <Modal show={open} onClose={onClose} size="lg">
      <Modal.Header>{item ? t("cases.edit") : t("cases.create")}</Modal.Header>
      <Modal.Body>
        <form id="case-form" onSubmit={submit} className="space-y-5">
          {role !== "applicant" && !item && (
            <div>
              <Label htmlFor="case-applicant">{t("cases.applicant")}</Label>
              <Select id="case-applicant" value={applicantId} onChange={(event) => setApplicantId(event.target.value)} required>
                {(applicants.data || []).map((applicant) => <option key={applicant.id} value={applicant.id}>{applicant.full_name}</option>)}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="case-title">{t("cases.name")}</Label>
            <TextInput id="case-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="case-language">{t("cases.language")}</Label>
            <Select id="case-language" value={language} onChange={(event) => setLanguage(event.target.value as PreferredLanguage)}>
              <option value="es">Español</option><option value="en">English</option>
            </Select>
          </div>
          {item && role !== "applicant" && (
            <div>
              <Label htmlFor="case-status">{t("cases.status")}</Label>
              <Select id="case-status" value={status} onChange={(event) => setStatus(event.target.value as CaseStatus)}>
                {statuses.map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}
              </Select>
            </div>
          )}
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="case-form" disabled={saving || (!item && role !== "applicant" && !applicantId)}>{saving ? t("common.loading") : t("cases.save")}</Button>
        <Button color="light" onClick={onClose}>{t("cases.cancel")}</Button>
      </Modal.Footer>
    </Modal>
  );
}
