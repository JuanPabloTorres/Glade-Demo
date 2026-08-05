import { Badge, Button, Card, Label, Textarea, TextInput } from "flowbite-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { MatterDetailDto, MatterIntakeUpdateDto } from "../../types/api";

interface IntakeFormProps {
  matter: MatterDetailDto;
  busy: boolean;
  onSubmit: (dto: MatterIntakeUpdateDto) => Promise<void>;
}

export function IntakeForm({ matter, busy, onSubmit }: IntakeFormProps) {
  const { register, handleSubmit, reset } = useForm<MatterIntakeUpdateDto>();

  useEffect(() => {
    reset({
      display_name: matter.display_name,
      email: matter.email ?? "",
      phone: matter.phone ?? "",
      address: matter.address ?? "",
      date_of_birth: matter.date_of_birth ?? "",
      summary: matter.summary ?? "",
    });
  }, [matter, reset]);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <div className="space-y-2">
        <Badge color="info" className="w-fit">
          Step 1
        </Badge>
        <h2 className="text-xl font-semibold text-gray-900">Confirm client information</h2>
        <p className="text-sm leading-6 text-gray-600">
          Review the approved client record. Document findings are compared against this
          information and are never applied without a recorded decision.
        </p>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="intake-name">Client name</Label>
          <TextInput
            id="intake-name"
            {...register("display_name", { required: true, minLength: 2 })}
          />
        </div>
        <div>
          <Label htmlFor="intake-email">Email</Label>
          <TextInput id="intake-email" type="email" {...register("email")} />
        </div>
        <div>
          <Label htmlFor="intake-phone">Phone</Label>
          <TextInput id="intake-phone" {...register("phone")} />
        </div>
        <div>
          <Label htmlFor="intake-dob">Date of birth</Label>
          <TextInput id="intake-dob" type="date" {...register("date_of_birth")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="intake-address">Address</Label>
          <TextInput id="intake-address" {...register("address")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="intake-summary">Matter summary</Label>
          <Textarea
            id="intake-summary"
            rows={4}
            placeholder="Summarize the objective, context, and relevant review notes."
            {...register("summary")}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving information..." : "Save client information"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
