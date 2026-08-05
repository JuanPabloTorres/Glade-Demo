import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  TextInput,
} from "flowbite-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CASE_TYPE_OPTIONS,
  CASE_TYPE_VALUES,
  DEFAULT_CASE_TYPE,
} from "../../config/domainOptions";
import type { MatterCreateDto } from "../../types/api";
import { MutationFeedback } from "../atoms/MutationFeedback";

const EMPTY_FORM: MatterCreateDto = {
  case_type: DEFAULT_CASE_TYPE,
  display_name: "",
  email: "",
  phone: "",
  assigned_to: "",
};

const schema = z.object({
  display_name: z.string().trim().min(2, "Client name is required."),
  case_type: z.enum(CASE_TYPE_VALUES),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  assigned_to: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MatterFormModalProps {
  open: boolean;
  busy: boolean;
  error?: unknown;
  onClose: () => void;
  onSubmit: (dto: MatterCreateDto) => Promise<void>;
}

export function MatterFormModal({ open, busy, error, onClose, onSubmit }: MatterFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_FORM });

  useEffect(() => {
    if (!open) reset(EMPTY_FORM);
  }, [open, reset]);

  const submit = async (values: FormValues) => {
    await onSubmit({
      ...values,
      email: values.email || undefined,
      phone: values.phone || undefined,
      assigned_to: values.assigned_to || undefined,
    });
  };

  return (
    <Modal show={open} onClose={onClose} dismissible size="2xl" position="center">
      <ModalHeader>Start a matter</ModalHeader>
      <form onSubmit={handleSubmit(submit)}>
        <ModalBody className="max-h-[72vh] space-y-5 overflow-y-auto">
          <Alert color="info">
            Create the case record first. The workspace will then guide you through intake,
            documents, decisions, and readiness.
          </Alert>
          <MutationFeedback error={error} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="display_name">Client or matter name</Label>
              <TextInput
                id="display_name"
                placeholder="Jordan Sample"
                {...register("display_name")}
                color={errors.display_name ? "failure" : undefined}
              />
              {errors.display_name ? <p className="mt-1 text-xs text-red-600">{errors.display_name.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="case_type">Matter type</Label>
              <Select id="case_type" {...register("case_type")}>
                {CASE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="assigned_to">Assigned professional</Label>
              <TextInput id="assigned_to" placeholder="A. Rivera" {...register("assigned_to")} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <TextInput id="email" type="email" placeholder="client@example.com" {...register("email")} color={errors.email ? "failure" : undefined} />
              {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <TextInput id="phone" placeholder="Primary contact number" {...register("phone")} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex-col-reverse sm:flex-row sm:justify-end">
          <Button color="alternative" type="button" onClick={onClose} disabled={busy} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? "Creating matter..." : "Create matter and continue"}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
