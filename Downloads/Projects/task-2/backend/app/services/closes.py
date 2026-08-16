"""Close domain logic: construction, lookups, guards, and the audit trail.

Three defects from the audit are addressed structurally here:

1. Every id is a uuid and every lookup is scoped to a single close. The old handlers
   searched *all* closes by a seeded id like "s3", so a decision on one close silently
   wrote to another.
2. `create_close` builds from a template. It no longer clones a fixture that arrived
   with two sign-offs already approved by people who never saw the close.
3. `status` is derived, never stored, so it cannot go stale or regress.
"""

import uuid
from typing import Any, Iterable

from fastapi import HTTPException, status as http_status

from .clock import now_iso
from .templates import DEFAULT_TEMPLATE_ID, get_template

MUTABLE_CONFLICT = "CLOSE_IS_CLOSED"


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def audit(close: dict[str, Any], event: str, actor: Any, detail: str = "", at: str | None = None) -> dict[str, Any]:
    entry = {
        "id": new_id("ev"),
        "event": event,
        "actor": getattr(actor, "name", None) or (actor.get("name") if isinstance(actor, dict) else str(actor)),
        "actor_id": getattr(actor, "id", None) or (actor.get("id") if isinstance(actor, dict) else None),
        "detail": detail,
        "created_at": at or now_iso(),
    }
    close.setdefault("audit", []).append(entry)
    return entry


def build_close(
    *,
    entity: str,
    period: str,
    owner: str,
    due_date: str,
    template_id: str,
    actor: Any,
    close_id: str | None = None,
) -> dict[str, Any]:
    template = get_template(template_id or DEFAULT_TEMPLATE_ID)

    close: dict[str, Any] = {
        "id": close_id or new_id("close"),
        "entity": entity,
        "period": period,
        "owner": owner,
        "due_date": due_date,
        "template_id": template["id"],
        "template_name": template["name"],
        "required_document_types": list(template["required_document_types"]),
        "created_at": now_iso(),
        "created_by": getattr(actor, "name", str(actor)),
        "closed_at": None,
        "closed_by": None,
        "generating": False,
        "exported": False,
        "export": None,
        "superdocs_document_ids": [],
        "documents": [],
        # A fresh close owns nothing yet: no documents, no reviews, and every
        # sign-off unsigned. Reviews are created by generation, not seeded.
        "checklist": [
            {
                "id": new_id("chk"),
                "title": item["title"],
                "document_type": item["document_type"],
                "owner": owner,
                "status": "PENDING",
                "completed_by": None,
                "completed_at": None,
            }
            for item in template["checklist"]
        ],
        "reviews": [],
        "signoffs": [
            {
                "id": new_id("sig"),
                "role": item["role"],
                "person": None,
                "status": "PENDING",
                "signed_at": None,
                "signed_by": None,
            }
            for item in template["signoffs"]
        ],
        "audit": [],
    }
    audit(close, "CLOSE_CREATED", actor, f"{entity} {period} from template {template['id']}")
    return close


# --------------------------------------------------------------------------------------
# Lookups. All of these are scoped to one close by construction.
# --------------------------------------------------------------------------------------


def _find(items: Iterable[dict[str, Any]], item_id: str, label: str) -> dict[str, Any]:
    for item in items:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"{label} not found in this close")


def find_document(close: dict[str, Any], document_id: str) -> dict[str, Any]:
    return _find(close["documents"], document_id, "Document")


def find_checklist_item(close: dict[str, Any], item_id: str) -> dict[str, Any]:
    return _find(close["checklist"], item_id, "Checklist item")


def find_review(close: dict[str, Any], review_id: str) -> dict[str, Any]:
    return _find(close["reviews"], review_id, "Review item")


def find_signoff(close: dict[str, Any], signoff_id: str) -> dict[str, Any]:
    return _find(close["signoffs"], signoff_id, "Sign-off")


# --------------------------------------------------------------------------------------
# Guards
# --------------------------------------------------------------------------------------


def ensure_mutable(close: dict[str, Any]) -> None:
    """A closed period is immutable.

    Previously nothing checked this: a CLOSED close could be re-closed, its checklist
    un-ticked, and its sign-offs re-signed.
    """
    if close.get("closed_at"):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail={
                "error": MUTABLE_CONFLICT,
                "message": f"{close['period']} is closed and can no longer be modified.",
                "closed_at": close["closed_at"],
            },
        )


def ensure_not_generating(close: dict[str, Any]) -> None:
    if close.get("generating"):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail={"error": "GENERATION_IN_PROGRESS", "message": "A pack generation is already running."},
        )


# --------------------------------------------------------------------------------------
# Derived presentation
# --------------------------------------------------------------------------------------


def derive_status(close: dict[str, Any], readiness: dict[str, Any]) -> str:
    if close.get("closed_at"):
        return "CLOSED"
    if close.get("generating"):
        return "GENERATING"
    if any(item["status"] == "PENDING" for item in close["reviews"]):
        return "REVIEW_REQUIRED"
    if readiness["ready_for_close"]:
        return "READY_TO_CLOSE"
    return "COLLECTING"


def evidence_for(close: dict[str, Any], item: dict[str, Any]) -> str:
    """Resolve a checklist item's evidence to a real document, not a hardcoded string."""
    for document in close["documents"]:
        if document.get("document_type") == item["document_type"] and document["status"] == "READY":
            return document["filename"]
    return f"{item['document_type']} (not yet provided)"


def serialize(close: dict[str, Any], readiness: dict[str, Any]) -> dict[str, Any]:
    payload = dict(close)
    payload["status"] = derive_status(close, readiness)
    payload["checklist"] = [
        {**item, "evidence": evidence_for(close, item)} for item in close["checklist"]
    ]
    payload["readiness"] = readiness
    return payload
