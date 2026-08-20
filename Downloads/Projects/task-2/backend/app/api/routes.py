"""HTTP API.

Every mutating route is authenticated, scoped to a single close, and blocked once the
period is closed. The actor written to the audit trail comes from the session token and
can no longer be supplied (or omitted) by the caller.
"""

import re
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from ..core.security import Principal, get_current_user, issue_session
from ..db import store
from ..integrations.superdocs.client import APPROVE, EXPORT, current_mode, get_client
from ..services import export as export_service
from ..services import generation, storage, superdocs_ops
from ..services.memo import find_artifact, upsert_supporting_memo
from ..services.clock import now_iso
from ..services.closes import (
    audit,
    build_close,
    ensure_mutable,
    ensure_not_generating,
    find_checklist_item,
    find_document,
    find_review,
    find_signoff,
    generation_is_stale,
    invalidate_export,
    new_id,
    serialize,
)
from ..services.readiness import calculate_readiness
from ..services.templates import DEFAULT_TEMPLATE_ID, TEMPLATES, suggest_document_type

router = APIRouter(prefix="/api/v1")

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

DEMO_USER = {"id": "user_demo_controller", "name": "Abhinay Reddy", "role": "Controller"}


# --------------------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------------------


class CreateCloseRequest(BaseModel):
    entity: str = Field(min_length=1, max_length=200)
    period: str = Field(pattern=r"^\d{4}-\d{2}$")
    due_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    owner: str | None = Field(default=None, max_length=200)
    template_id: str = DEFAULT_TEMPLATE_ID


class MappingRequest(BaseModel):
    document_type: str | None = Field(default=None, max_length=120)


class ChecklistUpdateRequest(BaseModel):
    status: str = Field(pattern=r"^(COMPLETE|PENDING)$")


class RejectRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------


def load_close(close_id: str) -> dict[str, Any]:
    close = store.get_close(close_id)
    if close is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Close not found")
    return close


def present(close: dict[str, Any]) -> dict[str, Any]:
    return serialize(close, calculate_readiness(close))


def apply_to_close(close_id: str, mutator) -> dict[str, Any]:
    try:
        close, _ = store.mutate_close(close_id, mutator)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Close not found") from None
    return close


def safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 ._-]", "_", (name or "").strip().replace("\\", "/").split("/")[-1])
    return cleaned[:180] or "upload.bin"


# --------------------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------------------


@router.post("/auth/demo-session")
def demo_session() -> dict[str, Any]:
    """Issue a signed session for the fixed demo identity.

    Deliberately takes no input: the caller cannot choose who they are. Replace this
    with a Clerk token exchange before using the app with real data.
    """
    return issue_session(DEMO_USER)


@router.get("/auth/me")
def me(user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    return dict(user)


# --------------------------------------------------------------------------------------
# Health / templates
# --------------------------------------------------------------------------------------


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/templates")
def templates(user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    return [
        {
            "id": template["id"],
            "name": template["name"],
            "required_document_types": template["required_document_types"],
            "checklist_items": len(template["checklist"]),
            "signoffs": [item["role"] for item in template["signoffs"]],
        }
        for template in TEMPLATES.values()
    ]


# --------------------------------------------------------------------------------------
# Closes
# --------------------------------------------------------------------------------------


@router.get("/closes")
def list_closes(user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    return [present(close) for close in store.list_closes()]


@router.post("/closes", status_code=status.HTTP_201_CREATED)
def create_close(payload: CreateCloseRequest, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    try:
        close = build_close(
            entity=payload.entity,
            period=payload.period,
            owner=payload.owner or user.name,
            due_date=payload.due_date,
            template_id=payload.template_id,
            actor=user,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown template {payload.template_id!r}"
        ) from None
    store.save_close(close)
    return present(close)


@router.get("/closes/{close_id}")
def get_close(close_id: str, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    return present(load_close(close_id))


@router.get("/closes/{close_id}/readiness")
def readiness(close_id: str, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    return calculate_readiness(load_close(close_id))


@router.get("/closes/{close_id}/audit")
def audit_trail(close_id: str, user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    """The real audit trail. Previously collected but exposed by no endpoint at all."""
    return sorted(load_close(close_id).get("audit", []), key=lambda entry: entry["created_at"])


# --------------------------------------------------------------------------------------
# Documents
# --------------------------------------------------------------------------------------


@router.get("/closes/{close_id}/documents")
def documents(close_id: str, user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    return load_close(close_id)["documents"]


@router.post("/closes/{close_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    close_id: str,
    file: UploadFile = File(...),
    user: Principal = Depends(get_current_user),
) -> dict[str, Any]:
    close = load_close(close_id)
    ensure_mutable(close)

    document_id = new_id("doc")
    filename = safe_filename(file.filename or "")
    key = f"closes/{close_id}/documents/{document_id}/{filename}"
    stored = await run_in_threadpool(storage.put_stream, key, file.file)

    if stored["size"] == 0:
        await run_in_threadpool(storage.delete_prefix, f"closes/{close_id}/documents/{document_id}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if stored["size"] > MAX_UPLOAD_BYTES:
        await run_in_threadpool(storage.delete_prefix, f"closes/{close_id}/documents/{document_id}")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit",
        )

    suggested = suggest_document_type(filename, close["required_document_types"])

    def mutator(current: dict[str, Any]) -> None:
        ensure_mutable(current)
        current["documents"].append(
            {
                "id": document_id,
                "filename": filename,
                "content_type": file.content_type or "application/octet-stream",
                # Confidently matched filenames are classified straight away and the
                # audit says so; anything else waits for an explicit mapping.
                "document_type": suggested,
                "suggested_type": suggested,
                "status": "READY" if suggested else "PROCESSING",
                "size": stored["size"],
                "sha256": stored["sha256"],
                "storage_key": key,
                "uploaded_by": user.name,
                "uploaded_at": None,
            }
        )
        current["documents"][-1]["uploaded_at"] = audit(
            current, "DOCUMENT_UPLOADED", user, f"{filename} ({stored['size']} bytes)"
        )["created_at"]
        if suggested:
            audit(current, "DOCUMENT_AUTO_CLASSIFIED", user, f"{filename} -> {suggested}")
        invalidate_export(current, user)

    close = apply_to_close(close_id, mutator)
    return find_document(close, document_id)


@router.patch("/closes/{close_id}/documents/{document_id}/mapping")
def map_document(
    close_id: str,
    document_id: str,
    payload: MappingRequest,
    user: Principal = Depends(get_current_user),
) -> dict[str, Any]:
    """Classify a document. The old endpoint took no body and stamped everything READY."""

    def mutator(current: dict[str, Any]) -> None:
        ensure_mutable(current)
        document = find_document(current, document_id)
        document_type = (payload.document_type or document.get("suggested_type") or "").strip()
        if not document_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="document_type is required; no type could be inferred from the filename",
            )
        document.update({"document_type": document_type, "status": "READY"})
        audit(current, "DOCUMENT_CLASSIFIED", user, f"{document['filename']} -> {document_type}")
        invalidate_export(current, user)

    return find_document(apply_to_close(close_id, mutator), document_id)


@router.get("/closes/{close_id}/documents/{document_id}/content")
def document_content(
    close_id: str, document_id: str, user: Principal = Depends(get_current_user)
) -> Response:
    document = find_document(load_close(close_id), document_id)
    try:
        content = storage.get_bytes(document["storage_key"])
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file is missing") from None
    return Response(
        content=content,
        media_type=document.get("content_type") or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{document["filename"]}"'},
    )


# --------------------------------------------------------------------------------------
# Checklist
# --------------------------------------------------------------------------------------


# --------------------------------------------------------------------------------------
# SuperDocs integration surface
# --------------------------------------------------------------------------------------


@router.get("/closes/{close_id}/superdocs")
def superdocs_ledger(close_id: str, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    """The SuperDocs operation ledger for this close.

    Exposed so a reviewer can confirm the contract is genuinely exercised rather than
    described. Contains no credentials: the API key is never recorded, and every stored
    response envelope is redacted before it gets here.
    """
    close = load_close(close_id)
    return {
        "mode": current_mode(),
        "working_document_id": close.get("superdocs_working_document_id"),
        "source_document_ids": close.get("superdocs_document_ids") or [],
        "export": close.get("superdocs_export"),
        "coverage": superdocs_ops.contract_coverage(close),
        "operations": close.get("superdocs_operations") or [],
    }


@router.get("/closes/{close_id}/artifacts")
def artifacts(close_id: str, user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    return load_close(close_id).get("generated_artifacts") or []


@router.get("/closes/{close_id}/artifacts/{artifact_id}/content")
def artifact_content(
    close_id: str, artifact_id: str, user: Principal = Depends(get_current_user)
) -> Response:
    artifact = find_artifact(load_close(close_id), artifact_id)
    if artifact is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found in this close")
    try:
        content = storage.get_bytes(artifact["storage_key"])
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generated artifact is missing") from None
    return Response(
        content=content,
        media_type=artifact.get("content_type") or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{artifact["name"]}"'},
    )


@router.get("/closes/{close_id}/checklist")
def checklist(close_id: str, user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    return present(load_close(close_id))["checklist"]


@router.patch("/closes/{close_id}/checklist/{item_id}")
def update_checklist(
    close_id: str,
    item_id: str,
    payload: ChecklistUpdateRequest,
    user: Principal = Depends(get_current_user),
) -> dict[str, Any]:
    """Explicit target state instead of a blind toggle, and the actor is recorded."""

    def mutator(current: dict[str, Any]) -> None:
        ensure_mutable(current)
        item = find_checklist_item(current, item_id)
        if payload.status == "COMPLETE":
            item.update({"status": "COMPLETE", "completed_by": user.name, "completed_at": None})
            item["completed_at"] = audit(current, "CHECKLIST_COMPLETED", user, item["title"])["created_at"]
        else:
            item.update({"status": "PENDING", "completed_by": None, "completed_at": None})
            audit(current, "CHECKLIST_REOPENED", user, item["title"])
        invalidate_export(current, user)

    close = apply_to_close(close_id, mutator)
    return next(item for item in present(close)["checklist"] if item["id"] == item_id)


# --------------------------------------------------------------------------------------
# Generation
# --------------------------------------------------------------------------------------


@router.post("/closes/{close_id}/generate", status_code=status.HTTP_202_ACCEPTED)
def generate(
    close_id: str,
    background_tasks: BackgroundTasks,
    user: Principal = Depends(get_current_user),
) -> dict[str, Any]:
    close = load_close(close_id)
    ensure_mutable(close)
    ensure_not_generating(close)

    gate = calculate_readiness(close)
    if not gate["ready_for_generation"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "GENERATION_BLOCKED",
                "message": "Documents and checklist must be complete before generating.",
                "blockers": gate["blockers"],
            },
        )

    # A run abandoned by a crashed worker leaves its job row RUNNING forever, which the
    # UI would poll indefinitely. Retire it before superseding it.
    abandoned = store.active_job_for_close(close_id) if generation_is_stale(close) else None
    if abandoned:
        abandoned.update(
            {
                "status": "FAILED",
                "error": "Generation was interrupted before it finished and has been superseded.",
                "completed_at": now_iso(),
            }
        )
        store.save_job(abandoned)

    job = generation.new_job(close_id, user.name)
    store.save_job(job)

    def mutator(current: dict[str, Any]) -> None:
        # Re-checked inside the write transaction so two concurrent requests cannot
        # both get past the guard above and run generation twice.
        ensure_not_generating(current)
        if current.get("generating"):
            audit(current, "GENERATION_ABANDONED", user, "previous run did not finish; starting a new one")
        current["generating"] = True
        current["generating_since"] = job["started_at"]
        audit(current, "GENERATION_STARTED", user, f"job {job['id']}")

    apply_to_close(close_id, mutator)
    background_tasks.add_task(generation.run_generation, job["id"], close_id, dict(user))
    return job


@router.get("/closes/{close_id}/jobs/{job_id}")
def job_status(close_id: str, job_id: str, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    job = store.get_job(job_id)
    if job is None or job["close_id"] != close_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found for this close")
    return job


# --------------------------------------------------------------------------------------
# Review decisions
# --------------------------------------------------------------------------------------


@router.get("/closes/{close_id}/reviews")
def reviews(close_id: str, user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    return load_close(close_id)["reviews"]


def _decide(
    close_id: str,
    review_id: str,
    decision: str,
    user: Principal,
    reason: str | None,
    approval: dict[str, Any] | None = None,
    ledger_entry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    def mutator(current: dict[str, Any]) -> None:
        ensure_mutable(current)
        review = find_review(current, review_id)
        review.update(
            {
                "status": decision,
                "reviewed_by": user.name,
                "reviewed_at": None,
                "reason": reason,
                "superdocs_approval": approval,
                "error": None,
            }
        )
        review["reviewed_at"] = audit(
            current, f"REVIEW_{decision}", user, f"{review['section']}" + (f": {reason}" if reason else "")
        )["created_at"]
        if ledger_entry is not None:
            superdocs_ops.record(current, ledger_entry)
        invalidate_export(current, user)

    return find_review(apply_to_close(close_id, mutator), review_id)


@router.post("/closes/{close_id}/reviews/{review_id}/approve")
async def approve_review(
    close_id: str, review_id: str, user: Principal = Depends(get_current_user)
) -> dict[str, Any]:
    """Approving a proposed change sends it to SuperDocs before it counts as approved.

    A local approval that SuperDocs never received would be a lie in the audit trail and
    in the exported pack, so the SuperDocs call happens first and a failure leaves the
    item PENDING with the error attached rather than quietly marking it APPROVED.
    """
    close = load_close(close_id)
    ensure_mutable(close)
    review = find_review(close, review_id)

    working_document_id = close.get("superdocs_working_document_id")
    if not working_document_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "NOT_GENERATED",
                "message": "Generate the close pack before approving proposed changes.",
            },
        )

    change_id = review.get("external_change_id") or review["id"]
    client = get_client()
    try:
        envelope, entry = await superdocs_ops.call(
            close_id,
            APPROVE,
            lambda: client.approve_changes(working_document_id, [change_id]),
            document_id=working_document_id,
            change_ids=[change_id],
            detail=review["section"],
            # Recorded inside the same transaction that flips the review to APPROVED,
            # so the ledger row and the decision commit together.
            persist=False,
        )
    except superdocs_ops.SuperDocsCallFailed as failure:
        _record_failed_approval(close_id, review_id, user, failure)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "SUPERDOCS_APPROVAL_FAILED",
                "message": (
                    f"SuperDocs rejected the approval of {review['section']!r}: {failure}. "
                    "The change is still pending."
                ),
            },
        ) from failure

    return _decide(
        close_id,
        review_id,
        "APPROVED",
        user,
        None,
        approval=superdocs_ops.redact(envelope),
        ledger_entry=entry,
    )


def _record_failed_approval(
    close_id: str, review_id: str, user: Principal, failure: "superdocs_ops.SuperDocsCallFailed"
) -> None:
    """Leave the change PENDING, but make the attempt and its reason visible."""

    def mutator(current: dict[str, Any]) -> None:
        review = find_review(current, review_id)
        review["error"] = str(failure)
        review["superdocs_approval"] = None
        superdocs_ops.record(current, failure.entry)
        audit(current, "REVIEW_APPROVAL_FAILED", user, f"{review['section']}: {failure}")

    try:
        apply_to_close(close_id, mutator)
    except HTTPException:
        # The close or review vanished mid-flight; the 502 below is still the right answer.
        pass


@router.post("/closes/{close_id}/reviews/{review_id}/reject")
def reject_review(
    close_id: str,
    review_id: str,
    payload: RejectRequest | None = None,
    user: Principal = Depends(get_current_user),
) -> dict[str, Any]:
    """Rejection is a local decision.

    `approve_changes` is the only SuperDocs mutation in the contract; a rejected change
    is simply never sent, so it cannot reach the exported document.
    """
    return _decide(close_id, review_id, "REJECTED", user, payload.reason if payload else None)


# --------------------------------------------------------------------------------------
# Sign-offs
# --------------------------------------------------------------------------------------


@router.get("/closes/{close_id}/signoffs")
def signoffs(close_id: str, user: Principal = Depends(get_current_user)) -> list[dict[str, Any]]:
    return load_close(close_id)["signoffs"]


@router.post("/closes/{close_id}/signoffs/{signoff_id}/approve")
def approve_signoff(
    close_id: str, signoff_id: str, user: Principal = Depends(get_current_user)
) -> dict[str, Any]:
    """The signer is the session holder. It is not a name in the request body."""

    def mutator(current: dict[str, Any]) -> None:
        ensure_mutable(current)
        signoff = find_signoff(current, signoff_id)
        if signoff["status"] == "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": "ALREADY_SIGNED", "message": f"{signoff['role']} is already signed."},
            )
        signoff.update({"status": "APPROVED", "person": user.name, "signed_by": user.id, "signed_at": None})
        signoff["signed_at"] = audit(current, "SIGNOFF_APPROVED", user, signoff["role"])["created_at"]
        invalidate_export(current, user)

    return find_signoff(apply_to_close(close_id, mutator), signoff_id)


# --------------------------------------------------------------------------------------
# Export and closure
# --------------------------------------------------------------------------------------


@router.get("/closes/{close_id}/export")
def export_status(close_id: str, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    close = load_close(close_id)
    return {
        "exported": bool(close.get("exported")),
        "export": close.get("export"),
        # Kept separate from the zip: one is what SuperDocs produced, the other is what
        # the app assembled around it.
        "superdocs_export": close.get("superdocs_export"),
        "planned_files": export_service.planned_files(close),
    }


@router.post("/closes/{close_id}/export")
async def create_export(close_id: str, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    """Ask SuperDocs to export the finished document, then package the close pack.

    Two distinct artifacts come out of this, and the response keeps them apart:

      * `superdocs_export` - the finished file SuperDocs produced from the approved
        changes. This is the last step of the SuperDocs contract.
      * the app-level zip - the evidence package a controller has to retain: the
        SuperDocs export plus the source documents, the sign-off sheet, the audit
        trail, the Supporting Memo and the SuperDocs operation ledger. SuperDocs
        exports a document; a close pack is a file of record, so the app builds it.
    """
    close = load_close(close_id)
    ensure_mutable(close)

    working_document_id = close.get("superdocs_working_document_id")
    if not working_document_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "NOT_GENERATED",
                "message": "Generate the close pack before exporting it.",
            },
        )

    approved_change_ids = [
        review.get("external_change_id") or review["id"]
        for review in close["reviews"]
        if review["status"] == "APPROVED"
    ]

    client = get_client()
    try:
        envelope, entry = await superdocs_ops.call(
            close_id,
            EXPORT,
            lambda: client.export_document(working_document_id, approved_change_ids),
            document_id=working_document_id,
            change_ids=approved_change_ids,
            detail=f"{len(approved_change_ids)} approved changes",
            persist=False,
        )
    except superdocs_ops.SuperDocsCallFailed as failure:
        _record_failed_export(close_id, user, failure)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "SUPERDOCS_EXPORT_FAILED",
                "message": f"SuperDocs could not export the close document: {failure}. Nothing was exported.",
            },
        ) from failure

    superdocs_export = await run_in_threadpool(
        export_service.store_superdocs_export, close, envelope
    )
    close["superdocs_export"] = superdocs_export
    close["superdocs_operations"] = [*(close.get("superdocs_operations") or []), entry]
    result = await run_in_threadpool(export_service.build_pack, close, calculate_readiness(close))

    def mutator(current: dict[str, Any]) -> None:
        current["exported"] = True
        current["export"] = result
        current["superdocs_export"] = superdocs_export
        superdocs_ops.record(current, entry)
        # Rebuild the memo so the packaged copy matches the decisions just made.
        memo = upsert_supporting_memo(current, calculate_readiness(current))
        current["generated_artifacts"] = current.get("generated_artifacts") or []
        audit(
            current,
            "SUPERDOCS_EXPORTED",
            user,
            f"{superdocs_export['filename']} ({superdocs_export.get('size') or 0} bytes)",
        )
        audit(
            current,
            "EXPORT_COMPLETED",
            user,
            f"{result['filename']} ({result['size']} bytes), memo {memo['sha256'][:12]}",
        )

    apply_to_close(close_id, mutator)
    return {"status": "EXPORTED", **result, "superdocs_export": superdocs_export}


def _record_failed_export(
    close_id: str, user: Principal, failure: "superdocs_ops.SuperDocsCallFailed"
) -> None:
    def mutator(current: dict[str, Any]) -> None:
        superdocs_ops.record(current, failure.entry)
        audit(current, "SUPERDOCS_EXPORT_FAILED", user, str(failure))

    try:
        apply_to_close(close_id, mutator)
    except HTTPException:
        pass


@router.get("/closes/{close_id}/export/download")
def download_export(close_id: str, user: Principal = Depends(get_current_user)) -> Response:
    close = load_close(close_id)
    export = close.get("export")
    if not export:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "NOT_EXPORTED", "message": "Export the pack before downloading it."},
        )
    try:
        content = storage.get_bytes(export["storage_key"])
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exported pack is missing") from None
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{export["filename"]}"'},
    )


@router.post("/closes/{close_id}/close")
def close_period(close_id: str, user: Principal = Depends(get_current_user)) -> dict[str, Any]:
    close = load_close(close_id)
    ensure_mutable(close)  # also rejects re-closing an already closed period
    gate = calculate_readiness(close)

    if not gate["ready_for_close"]:
        def record_block(current: dict[str, Any]) -> None:
            audit(current, "CLOSE_BLOCKED", user, "; ".join(gate["blockers"]))

        apply_to_close(close_id, record_block)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "CLOSE_BLOCKED", "blockers": gate["blockers"]},
        )

    def mutator(current: dict[str, Any]) -> None:
        ensure_mutable(current)
        current["closed_by"] = user.name
        current["closed_at"] = audit(current, "CLOSE_CLOSED", user, current["period"])["created_at"]

    return present(apply_to_close(close_id, mutator))
