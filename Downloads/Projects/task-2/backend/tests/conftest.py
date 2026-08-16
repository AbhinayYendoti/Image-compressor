import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.db import store


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    """Every test gets its own sqlite file and storage root."""
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{tmp_path.as_posix()}/close_pack.db")
    monkeypatch.setattr(settings, "storage_dir", str(tmp_path / "storage"))
    monkeypatch.setattr(settings, "session_secret", "test-session-secret")
    monkeypatch.setattr(settings, "superdocs_mode", "mock")
    store.init_db()
    yield


@pytest.fixture
def client(isolated_storage):
    from backend.app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth(client):
    token = client.post("/api/v1/auth/demo-session").json()["token"]
    return {"Authorization": f"Bearer {token}"}


REQUIRED_UPLOADS = [
    "Trial Balance.pdf",
    "Bank Recon.pdf",
    "AR Memo.pdf",
    "Revenue Memo.pdf",
    "Accrual Support.pdf",
    "AP Aging.pdf",
    "Payroll Register.pdf",
    "Fixed Assets.pdf",
]


@pytest.fixture
def make_close(client, auth):
    def _make(entity="Globex Ltd", period="2026-04", due_date="2026-05-05"):
        response = client.post(
            "/api/v1/closes",
            json={"entity": entity, "period": period, "due_date": due_date},
            headers=auth,
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _make


@pytest.fixture
def ready_close(client, auth, make_close):
    """A close with every document uploaded and classified and the checklist complete."""

    def _ready(entity="Globex Ltd", period="2026-04"):
        close = make_close(entity=entity, period=period)
        close_id = close["id"]

        for filename in REQUIRED_UPLOADS:
            response = client.post(
                f"/api/v1/closes/{close_id}/documents",
                files={"file": (filename, f"content of {filename}".encode(), "application/pdf")},
                headers=auth,
            )
            assert response.status_code == 201, response.text
            document = response.json()
            if document["status"] != "READY":
                client.patch(
                    f"/api/v1/closes/{close_id}/documents/{document['id']}/mapping",
                    json={"document_type": document["suggested_type"] or "Supporting Document"},
                    headers=auth,
                )

        for item in client.get(f"/api/v1/closes/{close_id}/checklist", headers=auth).json():
            client.patch(
                f"/api/v1/closes/{close_id}/checklist/{item['id']}",
                json={"status": "COMPLETE"},
                headers=auth,
            )

        return client.get(f"/api/v1/closes/{close_id}", headers=auth).json()

    return _ready
