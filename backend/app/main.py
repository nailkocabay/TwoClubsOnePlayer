import logging
from contextlib import asynccontextmanager

import duckdb
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import router
from .config import Settings, get_settings
from .database import Database

log = logging.getLogger("shared_footballers")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        db = Database(settings.duckdb_path)
        db.connect()
        app.state.db = db
        yield
        db.close()

    app = FastAPI(title="Shared Footballers API", version="1.0.0", lifespan=lifespan,
                  description="Find players with recorded appearances for two football clubs.")
    app.state.settings = settings
    app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://2c1p.nailkocabay.com",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

    @app.exception_handler(duckdb.Error)
    async def db_error(request: Request, exc: duckdb.Error):
        log.exception("Database error on %s", request.url.path)  # details stay in server logs
        return JSONResponse(status_code=500, content={"detail": "A database error occurred."})

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception):
        log.exception("Unhandled error on %s", request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong."})

    app.include_router(router)
    return app


app = create_app()
