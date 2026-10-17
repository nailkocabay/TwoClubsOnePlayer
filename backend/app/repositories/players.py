from .common import fetch_dicts

# Whitelisted ORDER BY fragments: user input only ever selects a key, never reaches SQL text.
SORTS = {
    "name": "strip_accents(lower(display_name))",
    "appearances": "total_appearances",
}

PLAYER_COLS = """p.name, p.country_of_citizenship as nationality, p.position, p.sub_position,
                 cast(p.date_of_birth as date) as date_of_birth, p.image_url"""


def shared_players(cur, team_a: int, team_b: int, sort: str, order: str, limit: int, offset: int):
    """Players with >=1 recorded appearance for BOTH clubs.

    club_player_stats has exactly one row per (player, club), aggregated from appearances in
    a single pass, so the self-join cannot multiply rows and each club is counted independently.
    """
    direction = "desc" if order == "desc" else "asc"
    order_by = SORTS[sort]
    sql = f"""
        select a.player_id,
               coalesce(p.name, 'Unknown player #' || a.player_id) as display_name,
               p.country_of_citizenship as nationality, p.position, p.sub_position,
               cast(p.date_of_birth as date) as date_of_birth, p.image_url,
               a.appearances as a_apps, a.goals as a_goals, a.assists as a_assists,
               a.first_date as a_first, a.last_date as a_last,
               b.appearances as b_apps, b.goals as b_goals, b.assists as b_assists,
               b.first_date as b_first, b.last_date as b_last,
               a.appearances + b.appearances as total_appearances,
               count(*) over () as total_count
        from club_player_stats a
        join club_player_stats b on b.player_id = a.player_id and b.club_id = ?
        left join src.players p on p.player_id = a.player_id
        where a.club_id = ?
        order by {order_by} {direction}, a.player_id
        limit ? offset ?
    """
    return fetch_dicts(cur, sql, [team_b, team_a, limit, offset])


def get_player(cur, player_id: int) -> dict | None:
    rows = fetch_dicts(
        cur,
        """select player_id, name, country_of_citizenship as nationality, country_of_birth,
                  position, sub_position, foot, height_in_cm as height_cm,
                  cast(date_of_birth as date) as date_of_birth, image_url, url as source_url
           from src.players where player_id = ?""",
        [player_id],
    )
    return rows[0] if rows else None


def appearance_history(cur, player_id: int) -> list[dict]:
    return fetch_dicts(
        cur,
        """select s.club_id, coalesce(d.name, 'Club #' || s.club_id) as club_name,
                  s.appearances, s.goals, s.assists,
                  s.first_date as first_appearance, s.last_date as last_appearance
           from club_player_stats s left join club_directory d using (club_id)
           where s.player_id = ?
             and s.club_id not in (select try_cast(national_team_id as integer) from src.national_teams
                                   where try_cast(national_team_id as integer) is not null)
           order by s.first_date, s.last_date, s.club_id""",
        [player_id],
    )


def transfer_history(cur, player_id: int) -> list[dict]:
    return fetch_dicts(
        cur,
        """select transfer_date, transfer_season as season, from_club_id, from_club_name,
                  to_club_id, to_club_name, cast(transfer_fee as double) as fee_eur,
                  coalesce(transfer_date > current_date, false) as is_future
           from src.transfers where player_id = ?
           order by transfer_date nulls last, to_club_id""",
        [player_id],
    )

def search_players(cur, search: str, limit: int, offset: int):
    """Full-text player name search, returning each player with their club stints."""
    pattern = f"%{search.strip().lower()}%"

    count_sql = """
        select count(distinct p.player_id) as total
        from src.players p
        join club_player_stats s on s.player_id = p.player_id
        where strip_accents(lower(coalesce(p.name, ''))) like ?
    """
    count_rows = fetch_dicts(cur, count_sql, [pattern])
    total = count_rows[0]["total"] if count_rows else 0

    players_sql = """
        select player_id, name, nationality, position, sub_position, date_of_birth, image_url
        from (
            select p.player_id,
                   any_value(coalesce(p.name, 'Unknown #' || p.player_id)) as name,
                   any_value(p.country_of_citizenship) as nationality,
                   any_value(p.position) as position,
                   any_value(p.sub_position) as sub_position,
                   any_value(cast(p.date_of_birth as date)) as date_of_birth,
                   any_value(p.image_url) as image_url,
                   strip_accents(lower(any_value(coalesce(p.name, '')))) as _sort
            from src.players p
            join club_player_stats s on s.player_id = p.player_id
            where strip_accents(lower(coalesce(p.name, ''))) like ?
            group by p.player_id
        )
        order by _sort
        limit ? offset ?
    """
    players = fetch_dicts(cur, players_sql, [pattern, limit, offset])
    if not players:
        return int(total), []

    ids = [p["player_id"] for p in players]
    placeholders = ",".join("?" * len(ids))
    stints_sql = f"""
        select s.player_id, s.club_id,
               coalesce(d.name, 'Club #' || s.club_id) as club_name,
               s.appearances,
               s.first_date as first_appearance,
               s.last_date as last_appearance
        from club_player_stats s
        left join club_directory d using (club_id)
        where s.player_id in ({placeholders})
          and s.club_id not in (
              select try_cast(national_team_id as integer) from src.national_teams
              where try_cast(national_team_id as integer) is not null
          )
        order by s.player_id, s.first_date
    """
    stints = fetch_dicts(cur, stints_sql, ids)

    stints_by_player = {}
    for stint in stints:
        stints_by_player.setdefault(stint["player_id"], []).append(stint)

    for p in players:
        p["clubs"] = stints_by_player.get(p["player_id"], [])

    return int(total), players
