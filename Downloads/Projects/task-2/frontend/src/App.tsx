import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Download,
  FileCheck2,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, loadSession, saveBlob, storeSession } from "./lib/api";
import { formatBytes, formatDate, formatEvent, formatPeriod, formatTime, formatTimestamp, statusLabel } from "./lib/format";
import { EMPTY_READINESS, ReadinessView, toReadinessView } from "./lib/readiness";
import type {
  AuditEvent,
  ChecklistItem,
  CloseDetail,
  DocumentItem,
  ExportStatus,
  GeneratedArtifact,
  GenerationJob,
  ReviewItem,
  Session,
  SignoffItem,
  SuperDocsLedger
} from "./lib/types";

type Tab = "overview" | "documents" | "checklist" | "review" | "signoffs" | "pack" | "superdocs";

const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "checklist", label: "Checklist", icon: CheckCircle2 },
  { id: "review", label: "Review", icon: ShieldCheck },
  { id: "signoffs", label: "Sign-offs", icon: FileCheck2 },
  { id: "pack", label: "Final Pack", icon: PackageCheck },
  { id: "superdocs", label: "SuperDocs", icon: Workflow }
];

const navLinks: Array<{ label: string; tab: Tab }> = [
  { label: "Closes", tab: "overview" },
  { label: "Templates", tab: "checklist" },
  { label: "Audit", tab: "overview" },
  { label: "SuperDocs", tab: "superdocs" },
  { label: "Exports", tab: "pack" }
];

/** The contract, in the order the close pack drives it. */
const CONTRACT_LABELS: Record<string, string> = {
  upload_document: "Upload source documents",
  send_edit_instruction: "Send edit instruction",
  approve_changes: "Approve proposed changes",
  export_document: "Export finished document"
};

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, (error as Error)?.message ?? "Unexpected error");
}

function matches(query: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [close, setClose] = useState<CloseDetail | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [ledger, setLedger] = useState<SuperDocsLedger | null>(null);
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [blockNotice, setBlockNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const token = session?.token ?? "";
  const readiness = useMemo(() => toReadinessView(close?.readiness), [close]);
  const closed = Boolean(close?.closed_at);

  const handleFailure = useCallback((error: unknown) => {
    const failure = asApiError(error);
    if (failure.status === 401) {
      storeSession(null);
      setSession(null);
      setClose(null);
      return;
    }
    setError(failure.message);
  }, []);

  const loadWorkspace = useCallback(
    async (preferredId?: string) => {
      if (!token) return;
      try {
        let closeId = preferredId;
        if (!closeId) {
          const closes = await api.listCloses(token);
          if (closes.length === 0) {
            setClose(null);
            setError("No closes are available for this account yet.");
            return;
          }
          closeId = (closes.find((item) => item.id.startsWith("close-demo")) ?? closes[0]).id;
        }

        const [detail, trail, exported, superdocs, generated] = await Promise.all([
          api.getClose(token, closeId),
          api.getAudit(token, closeId),
          api.getExportStatus(token, closeId),
          api.getSuperDocs(token, closeId),
          api.getArtifacts(token, closeId)
        ]);

        setClose(detail);
        setAuditEvents(trail);
        setExportStatus(exported);
        setLedger(superdocs);
        setArtifacts(generated);
        setError("");
      } catch (failure) {
        handleFailure(failure);
      }
    },
    [token, handleFailure]
  );

  useEffect(() => {
    if (token) void loadWorkspace();
  }, [token, loadWorkspace]);

  // Poll a running generation job. The previous implementation fired five detached
  // setTimeouts with no cleanup, so it kept setting state after unmount.
  useEffect(() => {
    if (!close || !job || job.status !== "RUNNING") return;
    let cancelled = false;

    const timer = window.setInterval(async () => {
      try {
        const next = await api.getJob(token, close.id, job.id);
        if (cancelled) return;
        setJob(next);
        if (next.status !== "RUNNING") void loadWorkspace(close.id);
      } catch {
        /* transient; the next tick retries */
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, close, job, loadWorkspace]);

  // Clear a stale "close blocked" banner once the blockers are actually resolved.
  useEffect(() => {
    if (readiness.canClose) setBlockNotice("");
  }, [readiness.canClose]);

  const run = useCallback(
    async (action: (closeId: string) => Promise<unknown>) => {
      if (!close || busy) return;
      setBusy(true);
      try {
        await action(close.id);
        setError("");
        await loadWorkspace(close.id);
      } catch (failure) {
        handleFailure(failure);
      } finally {
        setBusy(false);
      }
    },
    [close, busy, loadWorkspace, handleFailure]
  );

  const signIn = useCallback(async (tab: Tab = "overview") => {
    try {
      const issued = await api.startDemoSession();
      const next: Session = { token: issued.token, user: issued.user };
      storeSession(next);
      setSession(next);
      setActiveTab(tab);
      setError("");
    } catch (failure) {
      setError(asApiError(failure).message);
    }
  }, []);

  const startGeneration = useCallback(async () => {
    if (!close || busy) return;
    setBusy(true);
    try {
      const started = await api.generate(token, close.id);
      setJob(started);
      setError("");
      await loadWorkspace(close.id);
    } catch (failure) {
      const apiFailure = asApiError(failure);
      setError(
        apiFailure.blockers.length ? `${apiFailure.message} ${apiFailure.blockers.join(" • ")}` : apiFailure.message
      );
    } finally {
      setBusy(false);
    }
  }, [close, busy, token, loadWorkspace]);

  const exportPack = useCallback(async () => {
    if (!close || busy) return;
    setBusy(true);
    try {
      if (!close.exported) await api.createExport(token, close.id);
      const { blob, filename } = await api.downloadExport(token, close.id);
      saveBlob(blob, filename);
      setError("");
      await loadWorkspace(close.id);
    } catch (failure) {
      handleFailure(failure);
    } finally {
      setBusy(false);
    }
  }, [close, busy, token, loadWorkspace, handleFailure]);

  // The close gate is now decided by the backend, not by local state.
  const closePeriod = useCallback(async () => {
    if (!close || busy) return;
    setBusy(true);
    try {
      await api.closePeriod(token, close.id);
      setBlockNotice("");
      setError("");
      await loadWorkspace(close.id);
    } catch (failure) {
      const apiFailure = asApiError(failure);
      if (apiFailure.status === 409 && apiFailure.blockers.length) {
        setBlockNotice(apiFailure.blockers.join(" • "));
        await loadWorkspace(close.id);
      } else {
        handleFailure(apiFailure);
      }
    } finally {
      setBusy(false);
    }
  }, [close, busy, token, loadWorkspace, handleFailure]);

  const downloadArtifact = useCallback(
    async (artifact: GeneratedArtifact) => {
      if (!close) return;
      try {
        const { blob, filename } = await api.downloadArtifact(token, close.id, artifact.id, artifact.name);
        saveBlob(blob, filename);
      } catch (failure) {
        handleFailure(failure);
      }
    },
    [close, token, handleFailure]
  );

  const navigate = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setNavOpen(false);
  }, []);

  if (!session) {
    return <AuthScreen onSignIn={signIn} error={error} />;
  }

  const nav = (
    <TopNav
      navOpen={navOpen}
      onToggleNav={() => setNavOpen((open) => !open)}
      onNavigate={navigate}
      query={query}
      onQuery={setQuery}
      searchOpen={searchOpen}
      onToggleSearch={() => {
        setSearchOpen((open) => !open);
        if (searchOpen) setQuery("");
      }}
    />
  );

  if (!close) {
    return (
      <div className="shell">
        {nav}
        <main className="workspace">
          <section className="work-surface">
            <div className="panel-flow">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    <span /> Workspace
                  </p>
                  <h2>{error ? "Cannot load the close" : "Loading close…"}</h2>
                </div>
              </div>
              {error && <div className="failure-band">{error}</div>}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      {nav}
      <main className="workspace">
        <section className="hero-band">
          <div>
            <p className="eyebrow">
              <span /> {formatPeriod(close.period)} close
            </p>
            <h1>{close.entity}</h1>
            <p className="hero-copy">
              One workspace for documents, checklist evidence, SuperDocs review decisions, sign-offs, and final export.
            </p>
          </div>
          <div className="readiness-orbit" aria-label={`${readiness.readiness}% ready`}>
            <svg viewBox="0 0 180 180" role="img">
              <title>{`Close readiness ${readiness.readiness} percent`}</title>
              <circle cx="90" cy="90" r="72" className="orbit-track" />
              <circle
                cx="90"
                cy="90"
                r="72"
                className="orbit-progress"
                pathLength="100"
                strokeDasharray={`${readiness.readiness} 100`}
              />
            </svg>
            <div>
              <strong>{readiness.readiness}%</strong>
              <span>ready</span>
            </div>
          </div>
        </section>

        <section className="app-grid">
          <aside className="side-rail">
            <div className="close-chip">Due {formatDate(close.due_date)}</div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={activeTab === tab.id ? "rail-item active" : "rail-item"}
                  key={tab.id}
                  onClick={() => navigate(tab.id)}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          <section className="work-surface">
            {error && <div className="failure-band">{error}</div>}

            {activeTab === "overview" && (
              <Overview
                readiness={readiness}
                job={job}
                busy={busy}
                closed={closed}
                events={auditEvents}
                onGenerate={startGeneration}
                onGo={navigate}
              />
            )}
            {activeTab === "documents" && (
              <Documents
                documents={close.documents}
                readiness={readiness}
                query={query}
                busy={busy}
                closed={closed}
                onConfirm={(id, type) => run((closeId) => api.mapDocument(token, closeId, id, type))}
                onUpload={(file) => run((closeId) => api.uploadDocument(token, closeId, file))}
              />
            )}
            {activeTab === "checklist" && (
              <Checklist
                checklist={close.checklist}
                query={query}
                busy={busy}
                closed={closed}
                onToggle={(item) =>
                  run((closeId) =>
                    api.setChecklistStatus(
                      token,
                      closeId,
                      item.id,
                      item.status === "COMPLETE" ? "PENDING" : "COMPLETE"
                    )
                  )
                }
              />
            )}
            {activeTab === "review" && (
              <Review
                reviews={close.reviews}
                artifacts={artifacts}
                query={query}
                busy={busy}
                closed={closed}
                generated={readiness.generated}
                onDownloadArtifact={downloadArtifact}
                onDecision={(id, decision) =>
                  run((closeId) =>
                    decision === "approved"
                      ? api.approveReview(token, closeId, id)
                      : api.rejectReview(token, closeId, id)
                  )
                }
              />
            )}
            {activeTab === "signoffs" && (
              <Signoffs
                signoffs={close.signoffs}
                query={query}
                busy={busy}
                closed={closed}
                onApprove={(id) => run((closeId) => api.approveSignoff(token, closeId, id))}
              />
            )}
            {activeTab === "pack" && (
              <FinalPack
                close={close}
                exportStatus={exportStatus}
                readiness={readiness}
                blockNotice={blockNotice}
                busy={busy}
                onExport={exportPack}
                onClose={closePeriod}
              />
            )}
            {activeTab === "superdocs" && (
              <SuperDocsPanel
                ledger={ledger}
                artifacts={artifacts}
                onDownloadArtifact={downloadArtifact}
              />
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="brand" aria-label="CloseOrbit">
      <div className="logo-mark">
        <span className="logo-core">CO</span>
        <span className="logo-satellite" />
      </div>
      <span>CloseOrbit</span>
    </div>
  );
}

function TopNav({
  onNavigate,
  query,
  onQuery,
  searchOpen,
  onToggleSearch,
  navOpen,
  onToggleNav
}: {
  onNavigate: (tab: Tab) => void;
  query?: string;
  onQuery?: (value: string) => void;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  navOpen?: boolean;
  onToggleNav?: () => void;
}) {
  return (
    <header className={navOpen ? "top-nav nav-open" : "top-nav"}>
      <Logo />
      <nav>
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={`#${link.tab}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(link.tab);
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="nav-actions">
        {searchOpen && onQuery && (
          <input
            className="nav-search"
            autoFocus
            value={query ?? ""}
            placeholder="Filter this view"
            aria-label="Filter the current view"
            onChange={(event) => onQuery(event.target.value)}
          />
        )}
        {onToggleSearch && (
          <button className="icon-button" aria-label="Search" aria-expanded={Boolean(searchOpen)} onClick={onToggleSearch}>
            <Search size={18} />
          </button>
        )}
        <button className="icon-button menu" aria-label="Menu" aria-expanded={Boolean(navOpen)} onClick={onToggleNav}>
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}

function AuthScreen({ onSignIn, error }: { onSignIn: (tab?: Tab) => void; error: string }) {
  return (
    <main className="auth-screen">
      <TopNav onNavigate={(tab) => onSignIn(tab)} onToggleNav={() => onSignIn()} />
      <section className="auth-hero">
        <div>
          <p className="eyebrow">
            <span /> Financial close pack
          </p>
          <h1>Close with evidence, review, and sign-off in one place.</h1>
          <p>
            A focused controller workspace powered by SuperDocs document operations and governed by a human approval trail.
          </p>
          <button className="primary-button" onClick={() => onSignIn()}>
            <LockKeyhole size={18} />
            Continue demo
          </button>
          {error && <div className="failure-band">{error}</div>}
        </div>
        <div className="auth-orbit">
          <div className="portrait one">
            <Gauge size={54} />
          </div>
          <div className="portrait two">
            <FileCheck2 size={54} />
          </div>
          <div className="portrait three">
            <ShieldCheck size={54} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Overview({
  readiness,
  job,
  busy,
  closed,
  events,
  onGenerate,
  onGo
}: {
  readiness: ReadinessView;
  job: GenerationJob | null;
  busy: boolean;
  closed: boolean;
  events: AuditEvent[];
  onGenerate: () => void;
  onGo: (tab: Tab) => void;
}) {
  // Denominators come from the close template instead of being hardcoded to 8/7/3/3.
  const rows: Array<[string, string, Tab]> = [
    ["Documents", `${readiness.docsReady} / ${readiness.docsRequired}`, "documents"],
    ["Checklist", `${readiness.checklistDone} / ${readiness.checklistRequired}`, "checklist"],
    ["Review", `${readiness.reviewsResolved} / ${readiness.reviewsTotal}`, "review"],
    ["Sign-offs", `${readiness.signoffsDone} / ${readiness.signoffsRequired}`, "signoffs"]
  ];

  const stages = job?.stages ?? [];
  const completedStages = job ? (job.status === "SUCCEEDED" ? stages.length : job.stage_index) : -1;

  return (
    <div className="panel-flow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span /> Readiness
          </p>
          <h2>What needs attention before close?</h2>
        </div>
        <button className="primary-button" onClick={onGenerate} disabled={busy || closed}>
          <Sparkles size={18} />
          {readiness.generated ? "Regenerate close pack" : "Generate close pack"}
        </button>
      </div>
      <div className="metric-grid">
        {rows.map(([label, value, tab]) => (
          <button className="metric" key={label} onClick={() => onGo(tab)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
      <div className="blocker-band">
        <div>
          <p className="eyebrow">
            <span /> Close gate
          </p>
          <h3>{closed ? "Period closed" : readiness.canClose ? "Ready to close" : "Close blocked"}</h3>
          <p>
            {closed
              ? "This period is closed and locked for editing."
              : readiness.canClose
                ? "All required evidence and approvals are complete."
                : readiness.blockers[0] ?? "Waiting on the readiness gate."}
          </p>
        </div>
        <button className="secondary-button" onClick={() => onGo("signoffs")}>
          View sign-offs
        </button>
      </div>
      {job && (
        <div className="stage-list">
          {stages.map((stage, index) => (
            <div className="stage-row" key={stage}>
              {completedStages > index ? (
                <CheckCircle2 size={18} />
              ) : completedStages === index ? (
                <CircleDashed size={18} />
              ) : (
                <span className="empty-dot" />
              )}
              <span>{stage}</span>
            </div>
          ))}
        </div>
      )}
      {job?.status === "FAILED" && <div className="failure-band">Generation failed: {job.error}</div>}
      <AuditTimeline events={events} />
    </div>
  );
}

function Documents({
  documents,
  readiness,
  query,
  busy,
  closed,
  onConfirm,
  onUpload
}: {
  documents: DocumentItem[];
  readiness: ReadinessView;
  query: string;
  busy: boolean;
  closed: boolean;
  onConfirm: (id: string, documentType: string | null) => void;
  onUpload: (file: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const visible = documents.filter((doc) => matches(query, doc.filename, doc.document_type, doc.suggested_type));

  return (
    <div className="panel-flow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span /> Source documents
          </p>
          <h2>
            {readiness.docsReady} of {readiness.docsRequired} required ready
          </h2>
        </div>
        <button className="primary-button" onClick={() => fileInput.current?.click()} disabled={busy || closed}>
          <Upload size={18} />
          Upload
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = "";
          }}
        />
      </div>
      <div className="table-list">
        {visible.map((doc) => (
          <div className="data-row" key={doc.id}>
            <FileText size={20} />
            <div>
              <strong>{doc.filename}</strong>
              <span>
                {doc.document_type ?? (doc.suggested_type ? `Suggested: ${doc.suggested_type}` : "Unclassified")}
                {" • "}
                {formatBytes(doc.size)}
              </span>
            </div>
            {doc.status === "READY" ? (
              <span className="status ready">Ready</span>
            ) : (
              <button
                className="secondary-button compact"
                disabled={busy || closed}
                onClick={() => onConfirm(doc.id, doc.suggested_type)}
              >
                Confirm mapping
              </button>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="data-row">
            <FileText size={20} />
            <div>
              <strong>{documents.length ? "No documents match this filter" : "No documents uploaded yet"}</strong>
              <span>{readiness.blockers[0] ?? "Upload the required source documents to begin."}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Checklist({
  checklist,
  query,
  busy,
  closed,
  onToggle
}: {
  checklist: ChecklistItem[];
  query: string;
  busy: boolean;
  closed: boolean;
  onToggle: (item: ChecklistItem) => void;
}) {
  const visible = checklist.filter((item) => matches(query, item.title, item.owner, item.evidence));

  return (
    <div className="panel-flow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span /> Close checklist
          </p>
          <h2>
            {checklist.filter((item) => item.status === "COMPLETE").length} / {checklist.length} complete
          </h2>
        </div>
      </div>
      <div className="table-list">
        {visible.map((item) => (
          <button
            className="data-row button-row"
            key={item.id}
            disabled={busy || closed}
            onClick={() => onToggle(item)}
          >
            {item.status === "COMPLETE" ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}
            <div>
              <strong>{item.title}</strong>
              <span>
                {item.completed_by ?? item.owner} • Evidence: {item.evidence}
              </span>
            </div>
            <span className={item.status === "COMPLETE" ? "status ready" : "status pending"}>
              {statusLabel(item.status)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ArtifactList({
  artifacts,
  onDownload
}: {
  artifacts: GeneratedArtifact[];
  onDownload: (artifact: GeneratedArtifact) => void;
}) {
  if (artifacts.length === 0) return null;

  return (
    <div className="pack-list">
      {artifacts.map((artifact) => (
        <div className="data-row" key={artifact.id}>
          <FileText size={20} />
          <div>
            <strong>{artifact.name}</strong>
            <span>
              {artifact.description} • {formatBytes(artifact.size)} • {formatTimestamp(artifact.generated_at)}
            </span>
          </div>
          <button className="secondary-button" onClick={() => onDownload(artifact)}>
            <Download size={16} /> Open
          </button>
        </div>
      ))}
    </div>
  );
}

function Review({
  reviews,
  artifacts,
  query,
  busy,
  closed,
  generated,
  onDecision,
  onDownloadArtifact
}: {
  reviews: ReviewItem[];
  artifacts: GeneratedArtifact[];
  query: string;
  busy: boolean;
  closed: boolean;
  generated: boolean;
  onDecision: (id: string, status: "approved" | "rejected") => void;
  onDownloadArtifact: (artifact: GeneratedArtifact) => void;
}) {
  const visible = reviews.filter((item) => matches(query, item.section, item.source_reference));
  const pending = reviews.filter((item) => item.status === "PENDING").length;

  return (
    <div className="panel-flow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span /> SuperDocs review
          </p>
          <h2>
            {generated
              ? `${pending} proposed changes pending`
              : "Generate the close pack to produce proposed changes"}
          </h2>
        </div>
      </div>
      {artifacts.length > 0 && (
        <>
          <p className="eyebrow">
            <span /> Generated artifacts
          </p>
          <ArtifactList artifacts={artifacts} onDownload={onDownloadArtifact} />
        </>
      )}
      <div className="review-stack">
        {visible.map((item) => (
          <article className="review-item" key={item.id}>
            <div className="review-header">
              <div>
                <strong>{item.section}</strong>
                <span>
                  Source: {item.source_reference || "not cited"}
                  {item.reviewed_by ? ` • ${statusLabel(item.status)} by ${item.reviewed_by}` : ""}
                </span>
              </div>
              <span className={item.status === "PENDING" ? "status pending" : "status ready"}>
                {statusLabel(item.status)}
              </span>
            </div>
            <div className="diff-grid">
              <div>
                <small>Current</small>
                <p>{item.before_value}</p>
              </div>
              <div>
                <small>Proposed</small>
                <p>{item.after_value}</p>
              </div>
            </div>
            {item.superdocs_approval && (
              <p className="superdocs-receipt">
                SuperDocs approve_changes · {item.superdocs_approval.mode ?? "unknown"} mode · change{" "}
                {item.superdocs_approval.approved_change_ids.join(", ") || "n/a"}
                {item.superdocs_approval.request_id ? ` · ${item.superdocs_approval.request_id}` : ""}
              </p>
            )}
            {item.error && (
              <div className="failure-band">SuperDocs approval failed: {item.error} This change is still pending.</div>
            )}
            {item.status === "PENDING" && !closed && (
              <div className="decision-row">
                <button className="secondary-button" disabled={busy} onClick={() => onDecision(item.id, "rejected")}>
                  <X size={16} /> Reject
                </button>
                <button className="primary-button" disabled={busy} onClick={() => onDecision(item.id, "approved")}>
                  <Check size={16} /> Approve
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Signoffs({
  signoffs,
  query,
  busy,
  closed,
  onApprove
}: {
  signoffs: SignoffItem[];
  query: string;
  busy: boolean;
  closed: boolean;
  onApprove: (id: string) => void;
}) {
  const visible = signoffs.filter((item) => matches(query, item.role, item.person));

  return (
    <div className="panel-flow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span /> Attributed approval
          </p>
          <h2>Required sign-offs</h2>
        </div>
      </div>
      <div className="signoff-grid">
        {visible.map((item) => (
          <div className="signoff" key={item.id}>
            <span>{item.role}</span>
            <strong>{item.person ?? "Unassigned"}</strong>
            <p>{item.status === "APPROVED" ? formatTimestamp(item.signed_at) : "Pending approval"}</p>
            {item.status === "PENDING" ? (
              <button className="primary-button" disabled={busy || closed} onClick={() => onApprove(item.id)}>
                <ShieldCheck size={16} /> Approve
              </button>
            ) : (
              <span className="status ready">Approved</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalPack({
  close,
  exportStatus,
  readiness,
  blockNotice,
  busy,
  onExport,
  onClose
}: {
  close: CloseDetail;
  exportStatus: ExportStatus | null;
  readiness: ReadinessView;
  blockNotice: string;
  busy: boolean;
  onExport: () => void;
  onClose: () => void;
}) {
  const closed = Boolean(close.closed_at);
  const exported = Boolean(exportStatus?.exported);
  const files = exportStatus?.export?.files ?? exportStatus?.planned_files ?? [];

  return (
    <div className="panel-flow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span /> Final pack
          </p>
          <h2>
            {closed
              ? `${formatPeriod(close.period)} Close Closed`
              : readiness.canClose
                ? "Ready to close"
                : "Complete the gate to close"}
          </h2>
        </div>
        <button className="primary-button" onClick={onExport} disabled={busy || (closed && !exported)}>
          <Download size={18} />
          {exported ? "Download pack" : "Export pack"}
        </button>
      </div>
      <div className="pack-list">
        {files.map((file) => (
          <div className="data-row" key={file}>
            <FileCheck2 size={20} />
            <div>
              <strong>{file}</strong>
              <span>{exported ? "Exported and ready" : "Waiting for export"}</span>
            </div>
            <span className={exported ? "status ready" : "status pending"}>{exported ? "Ready" : "Pending"}</span>
          </div>
        ))}
      </div>
      {exportStatus?.superdocs_export && (
        <div className="timeline">
          <p className="eyebrow">
            <span /> SuperDocs exported document
          </p>
          <div className="timeline-row">
            <PackageCheck size={16} />
            {exportStatus.superdocs_export.filename}
            {exportStatus.superdocs_export.size ? ` • ${formatBytes(exportStatus.superdocs_export.size)}` : ""} •{" "}
            {exportStatus.superdocs_export.mode} mode
          </div>
          <div className="timeline-row">
            Produced by <code>export_document</code> from {exportStatus.superdocs_export.approved_change_ids.length}{" "}
            approved change
            {exportStatus.superdocs_export.approved_change_ids.length === 1 ? "" : "s"}. It ships inside the zip
            under <code>superdocs/</code>.
          </div>
        </div>
      )}
      {exportStatus?.export && (
        <div className="timeline">
          <p className="eyebrow">
            <span /> App close-pack archive
          </p>
          <div className="timeline-row">
            <History size={16} />
            {exportStatus.export.filename} • {formatBytes(exportStatus.export.size)} •{" "}
            {formatTimestamp(exportStatus.export.generated_at)}
          </div>
          <div className="timeline-row">
            The retained file of record: the SuperDocs export plus source evidence, Supporting Memo, sign-off
            sheet, audit trail and the SuperDocs operation ledger.
          </div>
        </div>
      )}
      {blockNotice && <div className="failure-band">{blockNotice}</div>}
      <button className="close-period-button" onClick={onClose} disabled={busy || closed}>
        {closed ? "Closed" : "Close Period"}
      </button>
    </div>
  );
}

function SuperDocsPanel({
  ledger,
  artifacts,
  onDownloadArtifact
}: {
  ledger: SuperDocsLedger | null;
  artifacts: GeneratedArtifact[];
  onDownloadArtifact: (artifact: GeneratedArtifact) => void;
}) {
  if (!ledger) {
    return (
      <div className="panel-flow">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span /> SuperDocs
            </p>
            <h2>Loading the operation ledger…</h2>
          </div>
        </div>
      </div>
    );
  }

  const { coverage, operations } = ledger;
  const superdocsExport = ledger.export;

  return (
    <div className="panel-flow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            <span /> SuperDocs contract
          </p>
          <h2>{coverage.complete ? "All four operations exercised" : "Contract partially exercised"}</h2>
          <p className="hero-copy">
            Running in <strong>{ledger.mode}</strong> mode. Every adapter call this close has made is listed
            below, successes and failures alike. Mock mode issues the same calls through the same interface as
            live mode; only the transport differs.
          </p>
        </div>
      </div>

      <div className="pack-list">
        {coverage.operations.map((operation) => (
          <div className="data-row" key={operation.operation}>
            {operation.exercised ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}
            <div>
              <strong>{CONTRACT_LABELS[operation.operation] ?? operation.operation}</strong>
              <span>
                <code>{operation.operation}</code> • {operation.count} call
                {operation.count === 1 ? "" : "s"}
                {operation.failures > 0 ? ` • ${operation.failures} failed` : ""}
              </span>
            </div>
            <span className={operation.exercised ? "status ready" : "status pending"}>
              {operation.exercised ? "Exercised" : "Not yet"}
            </span>
          </div>
        ))}
      </div>

      {artifacts.length > 0 && (
        <>
          <p className="eyebrow">
            <span /> Generated artifacts
          </p>
          <ArtifactList artifacts={artifacts} onDownload={onDownloadArtifact} />
        </>
      )}

      {superdocsExport && (
        <div className="timeline">
          <p className="eyebrow">
            <span /> SuperDocs exported document
          </p>
          <div className="timeline-row">
            <PackageCheck size={16} />
            {superdocsExport.filename}
            {superdocsExport.size ? ` • ${formatBytes(superdocsExport.size)}` : ""} •{" "}
            {superdocsExport.mode} mode • {superdocsExport.export_id ?? "no export id"}
          </div>
          {superdocsExport.note && <div className="timeline-row">{superdocsExport.note}</div>}
        </div>
      )}

      <p className="eyebrow">
        <span /> Operation ledger
      </p>
      <div className="pack-list superdocs-ledger">
        {operations.length === 0 && (
          <div className="data-row">
            <CircleDashed size={20} />
            <div>
              <strong>No SuperDocs calls yet</strong>
              <span>Generate the close pack to start the contract.</span>
            </div>
          </div>
        )}
        {operations.map((operation) => (
          <div className="data-row" key={operation.id}>
            {operation.status === "SUCCEEDED" ? <Check size={20} /> : <X size={20} />}
            <div>
              <strong>
                <code>{operation.operation}</code>
                {operation.detail ? ` — ${operation.detail}` : ""}
              </strong>
              <span>
                {formatTimestamp(operation.started_at)} • {operation.mode} • {operation.duration_ms}ms
                {operation.document_id ? ` • ${operation.document_id}` : ""}
                {operation.request_id ? ` • ${operation.request_id}` : ""}
                {operation.error ? ` • ${operation.error}` : ""}
              </span>
            </div>
            <span className={operation.status === "SUCCEEDED" ? "status ready" : "status pending"}>
              {statusLabel(operation.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTimeline({ events }: { events: AuditEvent[] }) {
  // Real events from the backend trail. This used to be five hardcoded strings that
  // were displayed no matter what the user had actually done.
  const recent = events.slice(-12);

  return (
    <div className="timeline">
      <p className="eyebrow">
        <span /> Audit timeline
      </p>
      {recent.map((event) => (
        <div className="timeline-row" key={event.id}>
          <History size={16} />
          {formatTime(event.created_at)} {formatEvent(event.event)} — {event.actor}
          {event.detail ? ` (${event.detail})` : ""}
        </div>
      ))}
      {recent.length === 0 && (
        <div className="timeline-row">
          <History size={16} />
          No activity recorded yet
        </div>
      )}
    </div>
  );
}
