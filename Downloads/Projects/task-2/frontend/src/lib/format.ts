const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const DATE_ONLY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const TIME_ONLY = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "16 Aug 2026 10:42" */
export function formatTimestamp(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE_TIME.format(date).replace(",", "") : "";
}

/** "Apr 5, 2026" */
export function formatDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? DATE_ONLY.format(date) : "";
}

/** "10:42" */
export function formatTime(value: string | null | undefined): string {
  const date = parse(value);
  return date ? TIME_ONLY.format(date) : "";
}

/** "2026-03" -> "March 2026" */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return "";
  const [year, month] = period.split("-");
  const index = Number(month) - 1;
  return MONTHS[index] ? `${MONTHS[index]} ${year}` : period;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EVENT_LABELS: Record<string, string> = {
  CLOSE_CREATED: "Close created",
  DOCUMENT_UPLOADED: "Document uploaded",
  DOCUMENT_CLASSIFIED: "Document classified",
  DOCUMENT_AUTO_CLASSIFIED: "Document auto-classified",
  CHECKLIST_COMPLETED: "Checklist item completed",
  CHECKLIST_REOPENED: "Checklist item reopened",
  GENERATION_STARTED: "Pack generation started",
  GENERATION_COMPLETED: "Pack generated",
  GENERATION_FAILED: "Pack generation failed",
  GENERATION_ABANDONED: "Pack generation abandoned",
  ARTIFACT_GENERATED: "Artifact generated",
  REVIEW_APPROVED: "Change approved",
  REVIEW_REJECTED: "Change rejected",
  REVIEW_APPROVAL_FAILED: "SuperDocs approval failed",
  SUPERDOCS_EXPORTED: "SuperDocs document exported",
  SUPERDOCS_EXPORT_FAILED: "SuperDocs export failed",
  SIGNOFF_APPROVED: "Sign-off approved",
  EXPORT_COMPLETED: "Pack exported",
  EXPORT_INVALIDATED: "Exported pack superseded",
  CLOSE_BLOCKED: "Close blocked",
  CLOSE_CLOSED: "Period closed"
};

export function formatEvent(event: string): string {
  return EVENT_LABELS[event] ?? event.toLowerCase().replace(/_/g, " ");
}

/** Backend statuses are upper case; the UI has always rendered them lower case. */
export function statusLabel(status: string): string {
  return status.toLowerCase().replace(/_/g, " ");
}
