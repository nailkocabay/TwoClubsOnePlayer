from typing import Literal

from fastapi import APIRouter, Depends, Query, Request

from ..database import get_cursor
from ..schemas.models import (CareerResponse, PlayerSearchResponse, SharedPlayersResponse, Team, TeamSearchResponse)
from ..repositories import teams as teams_repo
from ..repositories import players as players_repo
from ..services import shared

router = APIRouter(prefix="/api")


@router.get("/health", tags=["meta"])
def health(request: Request):
    return {"status": "ok", "coverage_from": request.app.state.db.coverage["first_date"],
            "coverage_to": request.app.state.db.coverage["last_date"]}


@router.get("/coverage", tags=["meta"])
def coverage(request: Request):
    return request.app.state.db.coverage


@router.get("/teams", response_model=TeamSearchResponse, tags=["teams"])
def search_teams(
    search: str = Query("", max_length=100, description="Case/accent-insensitive partial club name"),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    only_with_data: bool = Query(True, description="Hide clubs with no recorded appearances"),
    cur=Depends(get_cursor),
):
    total, rows = teams_repo.search_teams(cur, search, limit, offset, only_with_data)
    return {"query": search, "total": total, "limit": limit, "offset": offset, "items": rows}


@router.get("/teams/{team_id}", response_model=Team, tags=["teams"])
def get_team(team_id: int, cur=Depends(get_cursor)):
    return shared.require_team(cur, team_id)


@router.get("/shared-players", response_model=SharedPlayersResponse, tags=["players"])
def shared_players(
    request: Request,
    team_a: int = Query(..., ge=1),
    team_b: int = Query(..., ge=1),
    sort: Literal["name", "appearances"] = "appearances",
    order: Literal["asc", "desc"] | None = None,
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    cur=Depends(get_cursor),
):
    order = order or ("asc" if sort == "name" else "desc")
    images = request.app.state.settings.enable_player_images
    a, b, total, items = shared.find_shared(cur, team_a, team_b, sort, order, limit, offset, images)
    return {"team_a": a, "team_b": b, "total": total, "limit": limit, "offset": offset,
            "sort": sort, "order": order, "items": items, "coverage": request.app.state.db.coverage}


@router.get("/players/search", response_model=PlayerSearchResponse, tags=["players"])
def search_players(
    search: str = Query("", max_length=100, description="Case/accent-insensitive partial player name"),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    cur=Depends(get_cursor),
):
    total, rows = players_repo.search_players(cur, search, limit, offset)
    return {"query": search, "total": total, "limit": limit, "offset": offset, "items": rows}


@router.get("/players/{player_id}/career", response_model=CareerResponse, tags=["players"])
def player_career(player_id: int, request: Request, cur=Depends(get_cursor)):
    data = shared.build_career(cur, player_id, request.app.state.settings.enable_player_images)
    data["coverage"] = request.app.state.db.coverage
    return data
