from datetime import date
from typing import Literal

from pydantic import BaseModel


class Team(BaseModel):
    club_id: int
    name: str
    competition_id: str | None = None
    country: str | None = None
    stadium: str | None = None
    last_season: str | None = None
    appearances: int
    players: int
    first_appearance: date | None = None
    last_appearance: date | None = None
    has_appearance_data: bool
    source_url: str | None = None


class TeamSearchResponse(BaseModel):
    query: str
    total: int
    limit: int
    offset: int
    items: list[Team]


class ClubStat(BaseModel):
    appearances: int
    goals: int
    assists: int
    first_appearance: date
    last_appearance: date


class SharedPlayer(BaseModel):
    player_id: int
    name: str
    nationality: str | None = None
    position: str | None = None
    sub_position: str | None = None
    date_of_birth: date | None = None
    age: int | None = None
    image_url: str | None = None
    team_a: ClubStat
    team_b: ClubStat
    total_appearances: int


class Coverage(BaseModel):
    first_date: date
    last_date: date
    total_appearances: int
    players: int
    competitions: int
    message: str


class SharedPlayersResponse(BaseModel):
    team_a: Team
    team_b: Team
    total: int
    limit: int
    offset: int
    sort: Literal["name", "appearances"]
    order: Literal["asc", "desc"]
    items: list[SharedPlayer]
    coverage: Coverage


class PlayerInfo(BaseModel):
    player_id: int
    name: str
    nationality: str | None = None
    country_of_birth: str | None = None
    position: str | None = None
    sub_position: str | None = None
    foot: str | None = None
    height_cm: int | None = None
    date_of_birth: date | None = None
    age: int | None = None
    image_url: str | None = None
    source_url: str | None = None


class AppearanceStint(BaseModel):
    """Derived from recorded match appearances only."""
    club_id: int
    club_name: str
    appearances: int
    goals: int
    assists: int
    first_appearance: date
    last_appearance: date


class TransferRecord(BaseModel):
    """Transfer history - when a move was recorded, NOT when the player actually played."""
    transfer_date: date | None = None
    season: str | None = None
    from_club_id: int | None = None
    from_club_name: str | None = None
    to_club_id: int | None = None
    to_club_name: str | None = None
    fee_eur: float | None = None
    is_future: bool = False


class CareerResponse(BaseModel):
    player: PlayerInfo
    appearance_history: list[AppearanceStint]
    transfer_history: list[TransferRecord]
    coverage: Coverage


class PlayerClubStint(BaseModel):
    """A club a player has appeared for (summary, for search results)."""
    club_id: int
    club_name: str
    appearances: int
    first_appearance: date
    last_appearance: date


class PlayerSearchResult(BaseModel):
    player_id: int
    name: str
    nationality: str | None = None
    position: str | None = None
    sub_position: str | None = None
    date_of_birth: date | None = None
    image_url: str | None = None
    clubs: list[PlayerClubStint]


class PlayerSearchResponse(BaseModel):
    query: str
    total: int
    limit: int
    offset: int
    items: list[PlayerSearchResult]
