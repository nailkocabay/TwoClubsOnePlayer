from datetime import date

from fastapi import HTTPException

from ..repositories import players as players_repo
from ..repositories import teams as teams_repo


def age_from(dob: date | None, today: date | None = None) -> int | None:
    if not dob:
        return None
    t = today or date.today()
    return t.year - dob.year - ((t.month, t.day) < (dob.month, dob.day))


def clean_image(url: str | None, enabled: bool) -> str | None:
    if not enabled or not url or "default.jpg" in url:
        return None
    return url


def require_team(cur, club_id: int) -> dict:
    team = teams_repo.get_team(cur, club_id)
    if team is None:
        raise HTTPException(status_code=404, detail=f"Club {club_id} was not found.")
    return team


def find_shared(cur, team_a: int, team_b: int, sort: str, order: str, limit: int, offset: int,
                images: bool) -> tuple[dict, dict, int, list[dict]]:
    if team_a == team_b:
        raise HTTPException(status_code=400, detail="Please select two different clubs.")
    a, b = require_team(cur, team_a), require_team(cur, team_b)
    rows = players_repo.shared_players(cur, team_a, team_b, sort, order, limit, offset)
    items = []
    for r in rows:
        items.append({
            "player_id": r["player_id"], "name": r["display_name"], "nationality": r["nationality"],
            "position": r["position"], "sub_position": r["sub_position"],
            "date_of_birth": r["date_of_birth"], "age": age_from(r["date_of_birth"]),
            "image_url": clean_image(r["image_url"], images),
            "team_a": {"appearances": r["a_apps"], "goals": r["a_goals"], "assists": r["a_assists"],
                       "first_appearance": r["a_first"], "last_appearance": r["a_last"]},
            "team_b": {"appearances": r["b_apps"], "goals": r["b_goals"], "assists": r["b_assists"],
                       "first_appearance": r["b_first"], "last_appearance": r["b_last"]},
            "total_appearances": r["total_appearances"],
        })
    total = rows[0]["total_count"] if rows else 0
    if not rows and offset > 0:  # page beyond the end: still report the true total
        total = cur.execute(
            "select count(*) from club_player_stats a join club_player_stats b "
            "on a.player_id = b.player_id and b.club_id = ? where a.club_id = ?", [team_b, team_a]
        ).fetchone()[0]
    return a, b, total, items


def build_career(cur, player_id: int, images: bool) -> dict:
    info = players_repo.get_player(cur, player_id)
    stints = players_repo.appearance_history(cur, player_id)
    if info is None and not stints:
        raise HTTPException(status_code=404, detail=f"Player {player_id} was not found.")
    if info is None:
        info = {"player_id": player_id, "name": f"Unknown player #{player_id}"}
    info["age"] = age_from(info.get("date_of_birth"))
    info["image_url"] = clean_image(info.get("image_url"), images)
    return {"player": info, "appearance_history": stints,
            "transfer_history": players_repo.transfer_history(cur, player_id)}
