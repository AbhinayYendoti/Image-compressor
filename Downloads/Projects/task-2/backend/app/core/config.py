from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Financial Close Pack API"

    # CORS. The dev server runs on 5180 (see frontend/package.json and vite.config.ts).
    frontend_origin: str = "http://localhost:5180"
    additional_cors_origins: str = ""

    # Session signing. Left blank, a durable secret is created under storage_dir so
    # tokens survive restarts and stay valid across multiple uvicorn workers.
    session_secret: str = ""
    session_ttl_seconds: int = 43_200

    # Persistence. Only sqlite:// URLs are supported today; see README.
    database_url: str = "sqlite:///./var/close_pack.db"
    storage_dir: str = "./var/storage"

    # How long a `generating` flag is believed before it is treated as abandoned by a
    # crashed worker. Must exceed a real run: uploads are 60s each and the edit call is
    # 180s, so a full pack cannot legitimately take this long.
    generation_timeout_seconds: int = 900

    # SuperDocs. "mock" runs the deterministic in-process client, "live" calls the REST API.
    superdocs_mode: str = "mock"
    superdocs_api_key: str = ""
    superdocs_base_url: str = "https://api.superdocs.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            self.frontend_origin.strip(),
            "http://localhost:5180",
            "http://127.0.0.1:5180",
        ]
        origins.extend(o.strip() for o in self.additional_cors_origins.split(",") if o.strip())
        deduped: list[str] = []
        for origin in origins:
            if origin and origin not in deduped:
                deduped.append(origin)
        return deduped

    @property
    def sqlite_path(self) -> str:
        # A blank DATABASE_URL in .env must fall back to the default rather than
        # overriding it with an empty string.
        url = self.database_url.strip() or "sqlite:///./var/close_pack.db"
        if not url.startswith("sqlite:"):
            raise RuntimeError(
                f"Unsupported DATABASE_URL {url!r}. This build persists to sqlite only; "
                "use a sqlite:///path URL. Postgres/Neon is not wired yet."
            )
        return url.split("sqlite:///", 1)[-1] if "sqlite:///" in url else url.split("sqlite:", 1)[-1]


settings = Settings()
