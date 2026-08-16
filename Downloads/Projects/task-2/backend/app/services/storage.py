"""Content-addressed local file storage.

Previously `upload_url` handed back a `mock://r2/...` string and `complete_upload`
threw the bytes away and hardcoded a filename. Uploads now land here as real files.

Cloudflare R2/S3 is NOT wired. Swapping this module for an S3 backend is the intended
extension point, but nothing in this build pretends to talk to object storage.
"""

import hashlib
import shutil
from pathlib import Path
from typing import BinaryIO


def _root() -> Path:
    from ..core.config import settings

    root = Path(settings.storage_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _resolve(key: str) -> Path:
    root = _root()
    path = (root / key).resolve()
    # Refuse keys that would escape the storage root.
    if root not in path.parents and path != root:
        raise ValueError(f"Refusing to resolve key outside storage root: {key!r}")
    return path


def put_stream(key: str, source: BinaryIO) -> dict[str, object]:
    path = _resolve(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    with path.open("wb") as target:
        while chunk := source.read(1024 * 256):
            digest.update(chunk)
            size += len(chunk)
            target.write(chunk)
    return {"key": key, "size": size, "sha256": digest.hexdigest()}


def put_bytes(key: str, data: bytes) -> dict[str, object]:
    path = _resolve(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return {"key": key, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def get_bytes(key: str) -> bytes:
    return _resolve(key).read_bytes()


def path_for(key: str) -> Path:
    return _resolve(key)


def exists(key: str) -> bool:
    return _resolve(key).exists()


def delete_prefix(prefix: str) -> None:
    target = _resolve(prefix)
    if target.is_dir():
        shutil.rmtree(target, ignore_errors=True)
