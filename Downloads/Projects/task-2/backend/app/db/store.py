"""SQLite-backed persistence.

Replaces the module-level `DB: dict` which lost every close on restart and gave each
uvicorn worker its own divergent copy of the data.

Read-modify-write goes through `mutate_close`, which holds a BEGIN IMMEDIATE
transaction for the whole callback so concurrent decisions cannot clobber each other.
"""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Callable, Iterator

from ..core.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS closes (
    id          TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT PRIMARY KEY,
    close_id    TEXT NOT NULL,
    data        TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_close_id ON jobs (close_id);
"""


def _db_path() -> Path:
    path = Path(settings.sqlite_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(_db_path(), timeout=30, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def init_db() -> None:
    with _connect() as connection:
        connection.executescript(SCHEMA)


@contextmanager
def _write_transaction() -> Iterator[sqlite3.Connection]:
    connection = _connect()
    try:
        connection.execute("BEGIN IMMEDIATE")
        yield connection
        connection.execute("COMMIT")
    except Exception:
        connection.execute("ROLLBACK")
        raise
    finally:
        connection.close()


def _now() -> str:
    from ..services.clock import now_iso

    return now_iso()


def list_closes() -> list[dict[str, Any]]:
    connection = _connect()
    try:
        rows = connection.execute("SELECT data FROM closes ORDER BY updated_at DESC").fetchall()
    finally:
        connection.close()
    return [json.loads(row["data"]) for row in rows]


def get_close(close_id: str) -> dict[str, Any] | None:
    connection = _connect()
    try:
        row = connection.execute("SELECT data FROM closes WHERE id = ?", (close_id,)).fetchone()
    finally:
        connection.close()
    return json.loads(row["data"]) if row else None


def save_close(close: dict[str, Any]) -> dict[str, Any]:
    with _write_transaction() as connection:
        connection.execute(
            "INSERT INTO closes (id, data, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
            (close["id"], json.dumps(close), _now()),
        )
    return close


def mutate_close(close_id: str, mutator: Callable[[dict[str, Any]], Any]) -> tuple[dict[str, Any], Any]:
    """Apply `mutator` to a close inside a single write transaction.

    Returns (close, mutator_result). Raises KeyError if the close does not exist.
    """
    with _write_transaction() as connection:
        row = connection.execute("SELECT data FROM closes WHERE id = ?", (close_id,)).fetchone()
        if row is None:
            raise KeyError(close_id)
        close = json.loads(row["data"])
        result = mutator(close)
        connection.execute(
            "UPDATE closes SET data = ?, updated_at = ? WHERE id = ?",
            (json.dumps(close), _now(), close_id),
        )
    return close, result


def close_exists(close_id: str) -> bool:
    connection = _connect()
    try:
        row = connection.execute("SELECT 1 FROM closes WHERE id = ?", (close_id,)).fetchone()
    finally:
        connection.close()
    return row is not None


def save_job(job: dict[str, Any]) -> dict[str, Any]:
    with _write_transaction() as connection:
        connection.execute(
            "INSERT INTO jobs (id, close_id, data, updated_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
            (job["id"], job["close_id"], json.dumps(job), _now()),
        )
    return job


def get_job(job_id: str) -> dict[str, Any] | None:
    connection = _connect()
    try:
        row = connection.execute("SELECT data FROM jobs WHERE id = ?", (job_id,)).fetchone()
    finally:
        connection.close()
    return json.loads(row["data"]) if row else None


def active_job_for_close(close_id: str) -> dict[str, Any] | None:
    connection = _connect()
    try:
        rows = connection.execute(
            "SELECT data FROM jobs WHERE close_id = ? ORDER BY updated_at DESC", (close_id,)
        ).fetchall()
    finally:
        connection.close()
    for row in rows:
        job = json.loads(row["data"])
        if job.get("status") == "RUNNING":
            return job
    return None


def prune_jobs(keep_last: int = 200) -> None:
    """Bound the jobs table; the old in-memory JOBS dict grew forever."""
    with _write_transaction() as connection:
        connection.execute(
            "DELETE FROM jobs WHERE id NOT IN (SELECT id FROM jobs ORDER BY updated_at DESC LIMIT ?)",
            (keep_last,),
        )


def reset_for_tests() -> None:
    with _write_transaction() as connection:
        connection.execute("DELETE FROM closes")
        connection.execute("DELETE FROM jobs")
