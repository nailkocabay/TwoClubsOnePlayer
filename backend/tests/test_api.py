import os

import duckdb
import pytest

from tests.conftest import ALPHA, BETA, EMPTY, GAMMA


def shared(client, a, b, **kw):
    return client.get("/api/shared-players", params={"team_a": a, "team_b": b, **kw})


# 1 -------------------------------------------------------------------------
def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


# 2 / 9 ---------------------------------------------------------------------
def test_club_search_partial_case_insensitive(client):
    r = client.get("/api/teams", params={"search": "ALPH"}).json()
    assert [t["name"] for t in r["items"]] == ["Alpha FC"]
    assert r["items"][0]["club_id"] == ALPHA


def test_club_search_accent_insensitive_and_names_from_games(client):
    assert client.get("/api/teams", params={"search": "united zeta"}).json()["items"][0]["club_id"] == 4
    assert client.get("/api/teams", params={"search": "cup opp"}).json()["items"][0]["club_id"] == 9


def test_club_search_excludes_national_teams_and_no_data_clubs(client):
    assert client.get("/api/teams", params={"search": "testland"}).json()["total"] >= 0
    names = [t["name"] for t in client.get("/api/teams", params={"search": "", "limit": 50}).json()["items"]]
    assert "Empty Rovers" not in names and "Testland" not in names
    with_empty = client.get("/api/teams", params={"search": "empty", "only_with_data": False}).json()
    assert with_empty["items"][0]["has_appearance_data"] is False


def test_empty_search_results(client):
    r = client.get("/api/teams", params={"search": "zzzz-nothing"}).json()
    assert r["total"] == 0 and r["items"] == []


def test_wildcards_are_literal(client):
    assert client.get("/api/teams", params={"search": "%"}).json()["total"] == 0


def test_search_pagination_stable(client):
    p1 = client.get("/api/teams", params={"search": "", "limit": 2}).json()["items"]
    p2 = client.get("/api/teams", params={"search": "", "limit": 2, "offset": 2}).json()["items"]
    assert not {t["club_id"] for t in p1} & {t["club_id"] for t in p2}
    assert client.get("/api/teams", params={"search": "", "limit": 2}).json()["items"] == p1


def test_get_team(client):
    assert client.get(f"/api/teams/{ALPHA}").json()["name"] == "Alpha FC"
    assert client.get("/api/teams/424242").status_code == 404


# 3 / 4 / 5 / 6 -------------------------------------------------------------
def test_shared_players_valid_query(client):
    r = shared(client, ALPHA, BETA)
    assert r.status_code == 200
    ids = {p["player_id"] for p in r.json()["items"]}
    assert ids == {10, 13, 14, 99}               # 99 = orphan player without a players row
    assert r.json()["total"] == 4


def test_player_with_both_clubs_has_independent_counts(client):
    p = next(x for x in shared(client, ALPHA, BETA).json()["items"] if x["player_id"] == 10)
    assert p["team_a"]["appearances"] == 5 and p["team_b"]["appearances"] == 3   # not 15, not 8x8
    assert p["total_appearances"] == 8
    assert p["team_a"]["first_appearance"] == "2015-01-01" and p["team_a"]["last_appearance"] == "2015-01-05"
    assert p["team_a"]["goals"] == 5 and p["team_b"]["goals"] == 0


def test_swapping_teams_swaps_counts_only(client):
    ab = {p["player_id"]: p for p in shared(client, ALPHA, BETA).json()["items"]}
    ba = {p["player_id"]: p for p in shared(client, BETA, ALPHA).json()["items"]}
    assert ab.keys() == ba.keys()
    assert ab[10]["team_a"] == ba[10]["team_b"]


def test_single_club_players_excluded(client):
    ids = {p["player_id"] for p in shared(client, ALPHA, BETA).json()["items"]}
    assert 11 not in ids and 12 not in ids     # each appeared for only one of the two
    assert 15 not in ids                       # national-team + Alpha only


def test_no_duplicate_rows_with_many_appearances(client):
    items = shared(client, ALPHA, BETA).json()["items"]
    assert len({p["player_id"] for p in items}) == len(items)
    dup = next(p for p in items if p["player_id"] == 13)
    assert (dup["team_a"]["appearances"], dup["team_b"]["appearances"]) == (6, 6)


def test_transfer_alone_does_not_qualify(client):
    # Wanderer has a *transfer* Beta->Gamma and one Gamma appearance; Alpha x Gamma needs appearances for both
    ids = {p["player_id"] for p in shared(client, ALPHA, GAMMA).json()["items"]}
    assert ids == {14}
    assert shared(client, BETA, EMPTY).status_code == 200 and shared(client, BETA, EMPTY).json()["total"] == 0


def test_sorting_and_pagination(client):
    by_apps = [p["total_appearances"] for p in shared(client, ALPHA, BETA, sort="appearances").json()["items"]]
    assert by_apps == sorted(by_apps, reverse=True)
    names = [p["name"] for p in shared(client, ALPHA, BETA, sort="name").json()["items"]]
    assert names == sorted(names, key=str.lower)
    page2 = shared(client, ALPHA, BETA, limit=2, offset=2).json()
    assert page2["total"] == 4 and len(page2["items"]) == 2
    beyond = shared(client, ALPHA, BETA, limit=2, offset=10).json()
    assert beyond["items"] == [] and beyond["total"] == 4


def test_orphan_player_gets_placeholder_name_and_default_image_hidden(client):
    items = {p["player_id"]: p for p in shared(client, ALPHA, BETA).json()["items"]}
    assert items[99]["name"] == "Unknown player #99"
    assert items[10]["image_url"] is None      # 'default.jpg' placeholders are never returned


# 7 / 8 ---------------------------------------------------------------------
def test_same_club_twice_is_400(client):
    r = shared(client, ALPHA, ALPHA)
    assert r.status_code == 400 and "different" in r.json()["detail"]


@pytest.mark.parametrize("a,b", [(ALPHA, 424242), (424242, BETA), (900, BETA)])  # 900 = national team
def test_nonexistent_or_national_team_is_404(client, a, b):
    assert shared(client, a, b).status_code == 404


@pytest.mark.parametrize("params", [{"team_a": "abc", "team_b": 1}, {"team_a": 1}, {"team_a": 0, "team_b": 2},
                                    {"team_a": 1, "team_b": 2, "sort": "salary"}, {"team_a": 1, "team_b": 2, "limit": 9999}])
def test_invalid_params_are_422(client, params):
    assert client.get("/api/shared-players", params=params).status_code == 422


def test_sql_injection_attempt_is_rejected_safely(client):
    assert client.get("/api/shared-players", params={"team_a": "1; drop table clubs", "team_b": 2}).status_code == 422
    assert client.get("/api/teams", params={"search": "'; drop table club_directory; --"}).json()["total"] == 0
    assert client.get("/api/teams", params={"search": "alpha"}).json()["total"] == 1


# 10 ------------------------------------------------------------------------
def test_career_timeline_ordering_and_separation(client):
    r = client.get("/api/players/14/career").json()
    stints = r["appearance_history"]
    assert [s["club_name"] for s in stints] == ["Alpha FC", "Beta United", "Gamma Town"]
    assert [s["first_appearance"] for s in stints] == sorted(s["first_appearance"] for s in stints)
    assert "Testland" not in [s["club_name"] for s in stints]          # national team excluded
    dates = [t["transfer_date"] for t in r["transfer_history"]]
    assert dates == sorted(dates) and len(dates) == 3                  # transfers listed separately, ordered
    assert r["player"]["name"] == "Wanderer" and r["player"]["age"] is not None


def test_career_unknown_player_404_and_orphan_ok(client):
    assert client.get("/api/players/31337/career").status_code == 404
    assert client.get("/api/players/99/career").json()["player"]["name"] == "Unknown player #99"


def test_errors_do_not_leak_internals(client):
    body = client.get("/api/teams/424242").text
    assert "/tmp" not in body and "Traceback" not in body


# Real-dataset verification (skipped when the database is not available) -----
REAL = os.getenv("DUCKDB_PATH", "")


@pytest.mark.skipif(not os.path.isfile(REAL), reason="set DUCKDB_PATH to the real database to run")
def test_real_db_real_madrid_juventus_matches_raw_sql():
    from fastapi.testclient import TestClient
    from app.config import Settings
    from app.main import create_app

    with TestClient(create_app(Settings(REAL, ["*"], False))) as c:
        r = c.get("/api/shared-players", params={"team_a": 418, "team_b": 506, "limit": 100}).json()
        got = {p["name"]: (p["team_a"]["appearances"], p["team_b"]["appearances"]) for p in r["items"]}
        assert "Cristiano Ronaldo" in got
        raw = duckdb.connect(REAL, read_only=True).execute(
            """select p.name, count(*) filter (where a.player_club_id=418), count(*) filter (where a.player_club_id=506)
               from appearances a join players p using (player_id) where a.player_club_id in (418,506)
               group by 1 having count(*) filter (where a.player_club_id=418)>0
                             and count(*) filter (where a.player_club_id=506)>0""").fetchall()
        assert got == {n: (x, y) for n, x, y in raw}
