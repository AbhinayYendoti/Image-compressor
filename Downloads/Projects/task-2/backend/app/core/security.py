"""Signed session tokens.

Replaces the previous model where every handler hardcoded `actor="Abhinay"` and any
caller could sign off as anybody by putting a name in the request body. The actor is
now derived from a signed session token and can never be supplied by the client.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path
from typing import Any

from fastapi import Header, HTTPException, status

from .config import settings


class Principal(dict):
    """The authenticated caller: {"id", "name", "role"}."""

    @property
    def id(self) -> str:
        return str(self["id"])

    @property
    def name(self) -> str:
        return str(self["name"])

    @property
    def role(self) -> str:
        return str(self["role"])


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64d(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _secret() -> bytes:
    if settings.session_secret:
        return settings.session_secret.encode("utf-8")

    path = Path(settings.storage_dir) / ".session_secret"
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        # O_EXCL so concurrent workers cannot clobber each other on first boot.
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(secrets.token_urlsafe(48))
    return path.read_text(encoding="utf-8").strip().encode("utf-8")


def issue_session(user: dict[str, Any], ttl_seconds: int | None = None) -> dict[str, Any]:
    ttl = ttl_seconds or settings.session_ttl_seconds
    payload = {
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "exp": int(time.time()) + ttl,
    }
    body = _b64e(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signature = _b64e(hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest())
    return {"token": f"{body}.{signature}", "expires_in": ttl, "user": user}


def verify_session(token: str) -> Principal:
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        body, signature = token.split(".", 1)
    except ValueError:
        raise invalid from None

    expected = _b64e(hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest())
    if not hmac.compare_digest(expected, signature):
        raise invalid

    try:
        payload = json.loads(_b64d(body))
    except (ValueError, json.JSONDecodeError):
        raise invalid from None

    if not isinstance(payload, dict) or payload.get("exp", 0) < time.time():
        raise invalid

    return Principal(id=payload["id"], name=payload["name"], role=payload["role"])


def get_current_user(authorization: str | None = Header(default=None)) -> Principal:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_session(authorization.split(" ", 1)[1].strip())
