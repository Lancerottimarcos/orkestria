export type Option = { id: string; name: string };

export type FieldType = "TEXT" | "TEXTAREA" | "SELECT" | "RADIO" | "CHECKBOX" | "DATE" | "RATING";

export type FormField = {
  id?: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
};

export type FormSummary = {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  token: string;
  createdAt: string;
  client: Option | null;
  _count: { fields: number; submissions: number };
};

export type Submission = {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  createdAt: string;
  responses: { value: string; field: { id: string; label: string; type: FieldType } }[];
};
