import { Button, Card, Label, Select, Textarea, TextInput } from "flowbite-react";
import { useForm } from "react-hook-form";
import {
  DEFAULT_DOCUMENT_TYPE,
  DOCUMENT_TYPE_OPTIONS,
} from "../../config/domainOptions";
import type { DocumentCreateDto } from "../../types/api";

const SAMPLE_DOCUMENT = `Name: Jordan A. Sample
Email: jordan@example.com
Phone: 787-555-0100
DOB: 1990-05-04
Address: 123 Main St Apt 2, San Juan, PR`;

const DEFAULT_VALUES: DocumentCreateDto = {
  original_name: "passport.txt",
  document_type: DEFAULT_DOCUMENT_TYPE,
  content: SAMPLE_DOCUMENT,
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
    reset({
      original_name: "document.txt",
      document_type: DEFAULT_DOCUMENT_TYPE,
      content: "",
    });
  };

  return (
    <Card>
      <div>
        <h2 className="text-lg font-semibold">Add document text</h2>
        <p className="text-sm text-gray-500">
          The deterministic provider extracts labeled facts. Missing or different
          canonical values require explicit review.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="doc-name">File name</Label>
            <TextInput
              id="doc-name"
              {...register("original_name", { required: true, minLength: 1 })}
            />
          </div>
          <div>
            <Label htmlFor="doc-type">Document type</Label>
            <Select id="doc-type" {...register("document_type") }>
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="doc-content">Extractable text</Label>
          <Textarea
            id="doc-content"
            rows={7}
            {...register("content", { required: true, minLength: 1 })}
          />
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? "Processing..." : "Process document"}
        </Button>
      </form>
    </Card>
  );
}
