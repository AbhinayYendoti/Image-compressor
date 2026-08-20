"""SuperDocs REST client.

The audit found this module was imported by nothing but its own unit test: generation
just slept through a list of hardcoded stage names. `get_client()` is now the single
entry point used by the generation service, selected by `SUPERDOCS_MODE`.
"""

import asyncio
import base64
import hashlib
import json
from typing import Any, Protocol

import httpx

REQUIRED_CHANGE_FIELDS = ("section", "before_value", "after_value")

# The four operations that make up the SuperDocs contract, in the order the close pack
# workflow exercises them. `send_edit_instruction` is the ledger's name for the
# `edit_document` adapter call; the rest match the adapter method names.
UPLOAD = "upload_document"
EDIT = "send_edit_instruction"
APPROVE = "approve_changes"
EXPORT = "export_document"
CONTRACT_OPERATIONS = (UPLOAD, EDIT, APPROVE, EXPORT)


class SuperDocsResponseError(RuntimeError):
    pass


class SuperDocsClientProtocol(Protocol):
    async def upload_document(self, filename: str, content: bytes) -> dict[str, Any]: ...

    async def edit_document(self, document_id: str, instruction: str) -> list[dict[str, Any]]: ...

    async def approve_changes(self, document_id: str, change_ids: list[str]) -> dict[str, Any]: ...

    async def export_document(
        self, document_id: str, approved_change_ids: list[str] | None = None
    ) -> dict[str, Any]: ...


class SuperDocsClient:
    def __init__(self, api_key: str, base_url: str = "https://api.superdocs.com") -> None:
        if not api_key:
            raise SuperDocsResponseError(
                "SUPERDOCS_MODE=live requires SUPERDOCS_API_KEY. Set it, or use SUPERDOCS_MODE=mock."
            )
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    @property
    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    async def _request(self, method: str, path: str, timeout: float, **kwargs: Any) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.request(method, f"{self.base_url}{path}", headers=self._headers, **kwargs)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            raise SuperDocsResponseError(
                f"SuperDocs returned {exc.response.status_code} for {method} {path}: {exc.response.text[:300]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise SuperDocsResponseError(f"SuperDocs request failed for {method} {path}: {exc}") from exc
        except ValueError as exc:
            raise SuperDocsResponseError(f"SuperDocs returned a non-JSON body for {method} {path}") from exc

    async def upload_document(self, filename: str, content: bytes) -> dict[str, Any]:
        return await self._request(
            "POST", "/documents", timeout=60, files={"file": (filename, content)}
        )

    async def edit_document(self, document_id: str, instruction: str) -> list[dict[str, Any]]:
        payload = await self._request(
            "POST", f"/documents/{document_id}/edit", timeout=180, json={"instruction": instruction}
        )
        return parse_proposed_changes(payload)

    async def approve_changes(self, document_id: str, change_ids: list[str]) -> dict[str, Any]:
        return await self._request(
            "POST", f"/documents/{document_id}/approve", timeout=60, json={"change_ids": change_ids}
        )

    async def export_document(
        self, document_id: str, approved_change_ids: list[str] | None = None
    ) -> dict[str, Any]:
        # The approved ids are already server-side from approve_changes; they are echoed
        # so the request is self-describing and the exported file is unambiguous.
        payload: dict[str, Any] = {}
        if approved_change_ids is not None:
            payload["approved_change_ids"] = approved_change_ids
        return await self._request(
            "POST", f"/documents/{document_id}/export", timeout=180, json=payload
        )


class MockSuperDocsClient:
    """Deterministic offline stand-in, selected by SUPERDOCS_MODE=mock.

    Returns clearly synthetic proposed changes so the review queue has something to
    decide on without live credentials.
    """

    _CHANGES = [
        {
            "external_change_id": "change-revenue-1",
            "section": "Revenue Summary",
            "before_value": "Revenue increased by 5.1%.",
            "after_value": "Revenue increased by 8.4% based on the uploaded March memo.",
            "source_reference": "Revenue Memo.pdf, page 4",
        },
        {
            "external_change_id": "change-accrual-1",
            "section": "Accrual Exceptions",
            "before_value": "No material accrual exceptions noted.",
            "after_value": "One vendor accrual requires controller review before close.",
            "source_reference": "Accrual Support.pdf, page 2",
        },
        {
            "external_change_id": "change-bank-1",
            "section": "Checklist Footnote",
            "before_value": "Bank reconciliation pending.",
            "after_value": "Bank reconciliation completed with no unreconciled variance.",
            "source_reference": "Bank Recon.pdf, page 1",
        },
    ]

    async def upload_document(self, filename: str, content: bytes) -> dict[str, Any]:
        await asyncio.sleep(0.05)
        slug = filename.lower().replace(" ", "-")
        return {
            "document_id": f"mock-{slug}",
            "status": "uploaded",
            "bytes": len(content),
            "request_id": "mock-upload-" + _digest(slug, hashlib.sha256(content).hexdigest())[:16],
            "mode": "mock",
        }

    async def edit_document(self, document_id: str, instruction: str) -> list[dict[str, Any]]:
        await asyncio.sleep(0.05)
        return parse_proposed_changes({"result": json.dumps(self._CHANGES)})

    async def approve_changes(self, document_id: str, change_ids: list[str]) -> dict[str, Any]:
        await asyncio.sleep(0.05)
        ordered = sorted(change_ids)
        return {
            "document_id": document_id,
            "approved_change_ids": ordered,
            "status": "approved",
            # Derived from the inputs so the same approval always yields the same
            # receipt; nothing here comes from a live service.
            "request_id": "mock-approve-" + _digest(document_id, *ordered)[:16],
            "mode": "mock",
        }

    async def export_document(
        self, document_id: str, approved_change_ids: list[str] | None = None
    ) -> dict[str, Any]:
        await asyncio.sleep(0.05)
        from ...services.pdf import build_pdf

        approved = sorted(approved_change_ids or [])
        lines = [
            "Produced by the SuperDocs MOCK adapter. This is not live SuperDocs output.",
            "The bytes below are derived only from the inputs, so they are reproducible.",
            "",
            f"Working document id : {document_id}",
            f"Approved changes    : {len(approved)}",
        ]
        lines.extend(f"  - {change_id}" for change_id in approved)
        if not approved:
            lines.append("  (no changes were approved)")
        content = build_pdf("SuperDocs Export (mock)", lines)

        return {
            "document_id": document_id,
            "export_id": "mock-export-" + _digest(document_id, *approved)[:16],
            "status": "exported",
            "format": "pdf",
            "filename": f"{_stem(document_id)}-final.pdf",
            "approved_change_ids": approved,
            "content_base64": base64.b64encode(content).decode("ascii"),
            "sha256": hashlib.sha256(content).hexdigest(),
            "mode": "mock",
        }


def _digest(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def _stem(document_id: str) -> str:
    """Drop a trailing file extension so exports are not named `x.pdf-final.pdf`."""
    head, _, tail = document_id.rpartition(".")
    return head if head and 1 <= len(tail) <= 5 and tail.isalnum() else document_id


def current_mode() -> str:
    from ...core.config import settings

    return settings.superdocs_mode.strip().lower()


def get_client() -> SuperDocsClientProtocol:
    from ...core.config import settings

    mode = settings.superdocs_mode.strip().lower()
    if mode == "mock":
        return MockSuperDocsClient()
    if mode == "live":
        return SuperDocsClient(settings.superdocs_api_key, settings.superdocs_base_url)
    raise SuperDocsResponseError(f"Unknown SUPERDOCS_MODE {settings.superdocs_mode!r}; expected 'mock' or 'live'.")


def parse_proposed_changes(payload: dict[str, Any]) -> list[dict[str, Any]]:
    nested = payload.get("result") or payload.get("proposed_changes")
    if isinstance(nested, str):
        try:
            nested = json.loads(nested)
        except json.JSONDecodeError as exc:
            raise SuperDocsResponseError("SuperDocs proposed changes were not valid JSON") from exc

    if not isinstance(nested, list):
        raise SuperDocsResponseError("SuperDocs proposed changes must be a list")

    for index, change in enumerate(nested):
        if not isinstance(change, dict):
            raise SuperDocsResponseError(f"Proposed change at index {index} is not an object")
        missing = [field for field in REQUIRED_CHANGE_FIELDS if not change.get(field)]
        if missing:
            raise SuperDocsResponseError(
                f"Proposed change at index {index} is missing required fields: {', '.join(missing)}"
            )

    return nested
