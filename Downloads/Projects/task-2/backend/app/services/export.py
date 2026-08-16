"""Final pack export.

`POST /export` used to flip a boolean and return three hardcoded filenames with no
bytes behind them. It now assembles a real zip containing generated PDF sheets and the
actual uploaded source documents, which the browser downloads.
"""

import io
import json
import zipfile
from typing import Any

from . import storage
from .clock import now_iso
from .pdf import build_pdf

SHEETS = [
    "00-manifest.json",
    "01-close-summary.pdf",
    "02-checklist.pdf",
    "03-review-decisions.pdf",
    "04-signoffs.pdf",
    "05-audit-trail.pdf",
]


def planned_files(close: dict[str, Any]) -> list[str]:
    """What the pack will contain. Used by the UI before an export exists."""
    documents = [f"documents/{doc['filename']}" for doc in close["documents"] if doc["status"] == "READY"]
    return SHEETS + sorted(documents)


def _summary_pdf(close: dict[str, Any], readiness: dict[str, Any]) -> bytes:
    return build_pdf(
        f"Close Pack - {close['entity']} {close['period']}",
        [
            f"Template: {close.get('template_name', close.get('template_id', ''))}",
            f"Owner: {close['owner']}",
            f"Due date: {close['due_date']}",
            f"Created: {close['created_at']} by {close['created_by']}",
            f"Closed: {close.get('closed_at') or 'not yet closed'}",
            "",
            f"Readiness: {readiness['readiness']}%",
            f"Documents: {readiness['documents']['present']} of {readiness['documents']['required']} required",
            f"Checklist: {readiness['checklist']['complete']} of {readiness['checklist']['required']} complete",
            f"Reviews: {readiness['reviews']['resolved']} of {readiness['reviews']['total']} resolved",
            f"Sign-offs: {readiness['signoffs']['approved']} of {readiness['signoffs']['required']} approved",
            "",
            "Outstanding blockers:" if readiness["blockers"] else "No outstanding blockers.",
            *[f"  - {blocker}" for blocker in readiness["blockers"]],
        ],
    )


def _checklist_pdf(close: dict[str, Any]) -> bytes:
    lines: list[str] = []
    for item in close["checklist"]:
        mark = "[x]" if item["status"] == "COMPLETE" else "[ ]"
        who = item.get("completed_by") or "unassigned"
        when = item.get("completed_at") or "-"
        lines.append(f"{mark} {item['title']}")
        lines.append(f"      evidence: {item.get('evidence', item['document_type'])}")
        lines.append(f"      completed by {who} at {when}")
    return build_pdf(f"Close Checklist - {close['period']}", lines or ["No checklist items."])


def _reviews_pdf(close: dict[str, Any]) -> bytes:
    lines: list[str] = []
    for item in close["reviews"]:
        lines.append(f"[{item['status']}] {item['section']}")
        lines.append(f"      source: {item.get('source_reference') or 'n/a'}")
        lines.append(f"      before: {item['before_value']}")
        lines.append(f"      after:  {item['after_value']}")
        lines.append(f"      decided by {item.get('reviewed_by') or '-'} at {item.get('reviewed_at') or '-'}")
        if item.get("reason"):
            lines.append(f"      reason: {item['reason']}")
    return build_pdf(f"Review Decisions - {close['period']}", lines or ["No proposed changes were generated."])


def _signoffs_pdf(close: dict[str, Any]) -> bytes:
    lines: list[str] = []
    for item in close["signoffs"]:
        lines.append(f"{item['role']}: {item.get('person') or 'unsigned'}")
        lines.append(f"      status: {item['status']}")
        lines.append(f"      signed at: {item.get('signed_at') or '-'}")
    return build_pdf(f"Sign-off Sheet - {close['period']}", lines or ["No sign-offs required."])


def _audit_pdf(close: dict[str, Any]) -> bytes:
    lines = [
        f"{entry['created_at']}  {entry['event']}  by {entry['actor']}"
        + (f"  - {entry['detail']}" if entry.get("detail") else "")
        for entry in close.get("audit", [])
    ]
    return build_pdf(f"Audit Trail - {close['period']}", lines or ["No audit events recorded."])


def build_pack(close: dict[str, Any], readiness: dict[str, Any]) -> dict[str, Any]:
    manifest = {
        "close_id": close["id"],
        "entity": close["entity"],
        "period": close["period"],
        "generated_at": now_iso(),
        "readiness": readiness,
        "documents": [
            {
                "filename": doc["filename"],
                "document_type": doc.get("document_type"),
                "sha256": doc.get("sha256"),
                "size": doc.get("size"),
                "uploaded_by": doc.get("uploaded_by"),
                "uploaded_at": doc.get("uploaded_at"),
            }
            for doc in close["documents"]
            if doc["status"] == "READY"
        ],
    }

    buffer = io.BytesIO()
    written: list[str] = []
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("00-manifest.json", json.dumps(manifest, indent=2))
        archive.writestr("01-close-summary.pdf", _summary_pdf(close, readiness))
        archive.writestr("02-checklist.pdf", _checklist_pdf(close))
        archive.writestr("03-review-decisions.pdf", _reviews_pdf(close))
        archive.writestr("04-signoffs.pdf", _signoffs_pdf(close))
        archive.writestr("05-audit-trail.pdf", _audit_pdf(close))
        written.extend(SHEETS)

        for document in close["documents"]:
            if document["status"] != "READY":
                continue
            try:
                content = storage.get_bytes(document["storage_key"])
            except FileNotFoundError:
                # Record the gap rather than silently shipping an incomplete pack.
                placeholder = f"documents/MISSING-{document['filename']}.txt"
                archive.writestr(
                    placeholder,
                    f"Source bytes for {document['filename']} were not found at "
                    f"{document['storage_key']} when the pack was assembled.",
                )
                written.append(placeholder)
                continue
            entry = f"documents/{document['filename']}"
            archive.writestr(entry, content)
            written.append(entry)

    filename = f"close-pack-{close['entity'].replace(' ', '-').lower()}-{close['period']}.zip"
    key = f"exports/{close['id']}/{filename}"
    stored = storage.put_bytes(key, buffer.getvalue())

    return {
        "storage_key": key,
        "filename": filename,
        "size": stored["size"],
        "sha256": stored["sha256"],
        "generated_at": manifest["generated_at"],
        "files": written,
    }
