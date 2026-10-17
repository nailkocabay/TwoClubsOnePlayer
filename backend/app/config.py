import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    duckdb_path: str
    cors_origins: list[str]
    enable_player_images: bool


def get_settings() -> Settings:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return Settings(
        duckdb_path=os.getenv("DUCKDB_PATH", "../data/transfermarkt-datasets.duckdb"),
        cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
        enable_player_images=os.getenv("ENABLE_PLAYER_IMAGES", "false").lower() in {"1", "true", "yes"},
    )
