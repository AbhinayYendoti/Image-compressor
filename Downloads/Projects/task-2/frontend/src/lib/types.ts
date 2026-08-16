export type CloseStatus = "COLLECTING" | "GENERATING" | "REVIEW_REQUIRED" | "READY_TO_CLOSE" | "CLOSED";

export type DocumentItem = {
  id: string;
  filename: string;
  content_type: string;
  document_type: string | null;
  suggested_type: string | null;
  status: "READY" | "PROCESSING";
  size: number;
  sha256: string;
  storage_key: string;
  uploaded_by: string;
  uploaded_at: string | null;
};

export type ChecklistItem = {
  id: string;
  title: string;
  document_type: string;
  owner: string;
  status: "COMPLETE" | "PENDING";
  evidence: string;
  completed_by: string | null;
  completed_at: string | null;
};

export type ReviewItem = {
  id: string;
  external_change_id: string | null;
  section: string;
  before_value: string;
  after_value: string;
  source_reference: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewed_by: string | null;
  reviewed_at: string | null;
  reason: string | null;
};

export type SignoffItem = {
  id: string;
  role: string;
  person: string | null;
  status: "PENDING" | "APPROVED";
  signed_at: string | null;
  signed_by: string | null;
};

export type AuditEvent = {
  id: string;
  event: string;
  actor: string;
  actor_id: string | null;
  detail: string;
  created_at: string;
};

export type ApiReadiness = {
  ready_for_generation: boolean;
  ready_for_close: boolean;
  readiness: number;
  documents: { required: number; present: number; missing_types: string[]; unclassified: number };
  checklist: { required: number; complete: number };
  generation: { generated: boolean };
  reviews: { total: number; resolved: number };
  signoffs: { required: number; approved: number };
  export: { exported: boolean };
  blockers: string[];
};

export type CloseDetail = {
  id: string;
  entity: string;
  period: string;
  owner: string;
  due_date: string;
  template_id: string;
  template_name: string;
  required_document_types: string[];
  status: CloseStatus;
  created_at: string;
  created_by: string;
  closed_at: string | null;
  closed_by: string | null;
  generating: boolean;
  exported: boolean;
  superdocs_document_ids: string[];
  documents: DocumentItem[];
  checklist: ChecklistItem[];
  reviews: ReviewItem[];
  signoffs: SignoffItem[];
  audit: AuditEvent[];
  readiness: ApiReadiness;
};

export type GenerationJob = {
  id: string;
  close_id: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  stage: string;
  stage_index: number;
  stages: string[];
  attempt: number;
  error: string | null;
  started_by: string;
  started_at: string;
  completed_at: string | null;
};

export type ExportStatus = {
  exported: boolean;
  export: { filename: string; size: number; generated_at: string; files: string[] } | null;
  planned_files: string[];
};

export type Session = {
  token: string;
  user: { id: string; name: string; role: string };
};
