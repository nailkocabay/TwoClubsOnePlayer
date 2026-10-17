"""DuckDB access.

The source file is ATTACHed READ_ONLY to a private in-memory database. Two small
derived tables are materialised in memory at startup (never written to the source):

* club_directory     - one row per club id, names merged from `clubs` and `games`
* club_player_stats  - one row per (player, club) aggregated from `appearances`

DuckDB connections are not safe for concurrent use, so each request works on its own
`cursor()` of the root connection (the documented thread-safe pattern).
"""
import logging
import os
from collections.abc import Iterator

import shutil
import urllib.request
import duckdb
from fastapi import Request

def download_database_if_needed(db_path: str) -> None:
    """Download the DuckDB release asset if the file is missing."""
    if os.path.isfile(db_path) and os.path.getsize(db_path) > 0:
        return

    url = os.getenv("DUCKDB_URL")
    if not url:
        raise FileNotFoundError(
            "DuckDB file not found. Set DUCKDB_PATH and DUCKDB_URL."
        )

    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    temp_path = db_path + ".part"

    try:
        with urllib.request.urlopen(url, timeout=120) as response:
            with open(temp_path, "wb") as output:
                shutil.copyfileobj(response, output)

        if os.path.getsize(temp_path) == 0:
            raise RuntimeError("Downloaded DuckDB file is empty.")

        os.replace(temp_path, db_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
log = logging.getLogger("shared_footballers")

BUILD_SQL = [
    """
    create table club_directory as
    with names as (
        select home_club_id as id, any_value(home_club_name) as name from src.games
        where home_club_name is not null group by 1
        union all
        select away_club_id, any_value(away_club_name) from src.games
        where away_club_name is not null group by 1
    ),
    game_names as (select id, any_value(name) as name from names group by 1),
    used as (
        select player_club_id as id, count(*) as apps, count(distinct player_id) as players,
               min(date) as first_date, max(date) as last_date
        from src.appearances group by 1
    ),
    c as (
        select try_cast(club_id as integer) as cid, name, domestic_competition_id,
               last_season, stadium_name, url
        from src.clubs
    ),
    national as (select try_cast(national_team_id as integer) as id from src.national_teams)
    select coalesce(c.cid, u.id) as club_id,
           coalesce(c.name, g.name) as name,
           c.domestic_competition_id as competition_id,
           comp.country_name as country,
           c.stadium_name, c.last_season, c.url as source_url,
           coalesce(u.apps, 0) as appearances,
           coalesce(u.players, 0) as players,
           u.first_date, u.last_date
    from c
    full join used u on u.id = c.cid
    left join game_names g on g.id = coalesce(c.cid, u.id)
    left join (select competition_id, country_name from src.competitions) comp
           on comp.competition_id = c.domestic_competition_id
    where coalesce(c.cid, u.id) not in (select id from national where id is not null)
      and coalesce(c.name, g.name) is not null
    """,
    """
    create table club_player_stats as
    select player_id, player_club_id as club_id,
           count(*) as appearances,
           min(date) as first_date, max(date) as last_date,
           coalesce(sum(goals), 0) as goals, coalesce(sum(assists), 0) as assists,
           coalesce(sum(minutes_played), 0) as minutes
    from src.appearances
    group by 1, 2
    """,
    "create index idx_cps_club on club_player_stats(club_id)",
    "create index idx_cps_player on club_player_stats(player_id)",
]


class Database:
    def __init__(self, path: str):
        self.path = path
        self.con: duckdb.DuckDBPyConnection | None = None
        self.coverage: dict = {}

    
    def connect(self) -> None:
        download_database_if_needed(self.path)

        if not os.path.isfile(self.path) or os.path.getsize(self.path) == 0:
            raise FileNotFoundError(
                f"DuckDB file not found or empty: {self.path}. "
                "Check DUCKDB_PATH and DUCKDB_URL."
            )

        con = duckdb.connect(":memory:")
        safe = self.path.replace("'", "''")
        con.execute(f"ATTACH '{safe}' AS src (READ_ONLY)")

        for stmt in BUILD_SQL:
            con.execute(stmt)

        self.con = con
        self.coverage = self._coverage()
        log.info("Database ready: %s", self.coverage)


    def _coverage(self) -> dict:
        assert self.con
        lo, hi, n_apps, n_players, n_comp = self.con.execute(
            "select min(date), max(date), count(*), count(distinct player_id), "
            "count(distinct competition_id) from src.appearances"
        ).fetchone()
        return {
            "first_date": lo, "last_date": hi, "total_appearances": n_apps,
            "players": n_players, "competitions": n_comp,
            "message": (
                f"Appearance data covers {lo:%b %Y} to {hi:%b %Y} and only the competitions in this "
                "dataset (mainly 14 European top-flight leagues, their major cups and UEFA "
                "competitions). Players who shared two clubs outside that window or outside "
                "those competitions will not appear."
            ),
        }

    def close(self) -> None:
        if self.con:
            self.con.close()


def get_cursor(request: Request) -> Iterator[duckdb.DuckDBPyConnection]:
    db: Database = request.app.state.db
    cur = db.con.cursor()
    try:
        yield cur
    finally:
        cur.close()
