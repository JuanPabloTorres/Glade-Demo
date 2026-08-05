import {
  Alert,
  Badge,
  Button,
  Card,
  Label,
  Select,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useForm } from "react-hook-form";
import {
  DEFAULT_DOCUMENT_TYPE,
  DOCUMENT_TYPE_OPTIONS,
} from "../../config/domainOptions";
import type { DocumentCreateDto } from "../../types/api";

const DEFAULT_VALUES: DocumentCreateDto = {
  original_name: "",
  document_type: DEFAULT_DOCUMENT_TYPE,
  content: "",
};

interface DocumentFormProps {
  busy: boolean;
  onSubmit: (dto: DocumentCreateDto) => Promise<void>;
}

export function DocumentForm({ busy, onSubmit }: DocumentFormProps) {
  const { register, handleSubmit, reset } = useForm<DocumentCreateDto>({
    defaultValues: DEFAULT_VALUES,
  });

  const submit = async (dto: DocumentCreateDto) => {
    await onSubmit(dto);
    reset(DEFAULT_VALUES);
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <div className="space-y-2">
        <Badge color="info" className="w-fit">
          Step 2
        </Badge>
        <h2 className="text-xl font-semibold text-gray-900">Analyze a supporting document</h2>
        <p className="text-sm leading-6 text-gray-600">
          Provide document text for structured extraction. MatterReady identifies supported
          client fields and sends differences to human review.
        </p>
      </div>

      <Alert color="info">
        Use redacted or sample content in this evaluation workspace. Extracted values require
        explicit approval before they become part of the client record.
      </Alert>

      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="doc-name">Document name</Label>
            <TextInput
              id="doc-name"
              placeholder="Example: passport.txt"
              {...register("original_name", { required: true, minLength: 1 })}
            />
          </div>
          <div>
            <Label htmlFor="doc-type">Document type</Label>
            <Select id="doc-type" {...register("document_type")}>
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="doc-content">Document text</Label>
          <Textarea
            id="doc-content"
            rows={7}
            placeholder={"Use labeled fields such as:\nName: ...\nDOB: ...\nAddress: ..."}
            {...register("content", { required: true, minLength: 1 })}
          />
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? "Analyzing document..." : "Analyze document"}
        </Button>
      </form>
    </Card>
  );
}
