import { zodResolver } from "@hookform/resolvers/zod";
import {
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

const EMPTY_FORM: MatterCreateDto = {
  case_type: DEFAULT_CASE_TYPE,
  display_name: "",
  email: "",
  phone: "",
  assigned_to: "",
};

const schema = z.object({
  display_name: z.string().min(2, "Client name is required."),
  case_type: z.enum(CASE_TYPE_VALUES),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  assigned_to: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MatterFormModalProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (dto: MatterCreateDto) => void;
}

export function MatterFormModal({
  open,
  busy,
  onClose,
  onSubmit,
}: MatterFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) {
      reset(EMPTY_FORM);
    }
  }, [open, reset]);

  const submit = (values: FormValues) => {
    onSubmit({ ...values, email: values.email || undefined });
  };

  return (
    <Modal show={open} onClose={onClose}>
      <ModalHeader>Create matter</ModalHeader>
      <form onSubmit={handleSubmit(submit)}>
        <ModalBody className="space-y-4">
          <div>
            <Label htmlFor="display_name">Client name</Label>
            <TextInput
              id="display_name"
              {...register("display_name")}
              color={errors.display_name ? "failure" : undefined}
            />
            {errors.display_name ? (
              <p className="mt-1 text-sm text-red-600">{errors.display_name.message}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="case_type">Case type</Label>
            <Select id="case_type" {...register("case_type")}>
              {CASE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <TextInput
              id="email"
              type="email"
              {...register("email")}
              color={errors.email ? "failure" : undefined}
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <TextInput id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="assigned_to">Assigned to</Label>
            <TextInput id="assigned_to" {...register("assigned_to")} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating..." : "Create"}
          </Button>
          <Button color="alternative" type="button" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
