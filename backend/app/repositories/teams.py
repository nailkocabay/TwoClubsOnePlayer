from .common import fetch_dicts

TEAM_COLS = """club_id, name, competition_id, country, stadium_name as stadium, last_season,
               appearances, players, first_date as first_appearance, last_date as last_appearance,
               (appearances > 0) as has_appearance_data, source_url"""


def search_teams(cur, query: str, limit: int, offset: int, only_with_data: bool) -> tuple[int, list[dict]]:
    """Accent- and case-insensitive substring search. `contains()` is used instead of LIKE so that
    user-typed % or _ are never treated as wildcards. Ranking: prefix > word-start > anywhere,
    then clubs with data, then size, then name and id for a fully stable order."""
    q = query.strip().lower()
    where = "contains(strip_accents(lower(name)), strip_accents(?))"
    params: list = [q]
    if only_with_data:
        where += " and appearances > 0"
    total = cur.execute(f"select count(*) from club_directory where {where}", params).fetchone()[0]
    rows = fetch_dicts(
        cur,
        f"""select {TEAM_COLS} from club_directory
            where {where}
            order by case when starts_with(strip_accents(lower(name)), strip_accents(?)) then 0
                          when contains(strip_accents(lower(name)), ' ' || strip_accents(?)) then 1
                          else 2 end,
                     (appearances > 0) desc, appearances desc, name, club_id
            limit ? offset ?""",
        params + [q, q, limit, offset],
    )
    return total, rows


def get_team(cur, club_id: int) -> dict | None:
    rows = fetch_dicts(cur, f"select {TEAM_COLS} from club_directory where club_id = ?", [club_id])
    return rows[0] if rows else None
