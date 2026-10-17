"""Synthetic DuckDB fixture with the same table/column names as the real dataset."""
import datetime as dt
import warnings

import duckdb
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

warnings.filterwarnings("ignore")

SCHEMA = """
create table clubs(club_id varchar, name varchar, domestic_competition_id varchar, last_season varchar,
                   stadium_name varchar, url varchar);
create table competitions(competition_id varchar, name varchar, country_name varchar);
create table national_teams(national_team_id varchar, name varchar);
create table games(game_id varchar, home_club_id integer, away_club_id integer,
                   home_club_name varchar, away_club_name varchar);
create table players(player_id integer, name varchar, country_of_citizenship varchar,
                     country_of_birth varchar, position varchar, sub_position varchar, foot varchar,
                     height_in_cm integer, date_of_birth timestamp, image_url varchar, url varchar);
create table appearances(appearance_id varchar, game_id integer, player_id integer, player_club_id integer,
                         date date, player_name varchar, competition_id varchar, goals integer,
                         assists integer, minutes_played integer);
create table transfers(player_id integer, transfer_date date, transfer_season varchar, from_club_id integer,
                       to_club_id integer, from_club_name varchar, to_club_name varchar,
                       transfer_fee decimal(18,3), player_name varchar);
"""

ALPHA, BETA, GAMMA, ZETA, EMPTY, CUPONLY, NATION = 1, 2, 3, 4, 5, 9, 900


def build_fixture(path: str) -> None:
    con = duckdb.connect(path)
    con.execute(SCHEMA)
    con.execute("insert into clubs values ('1','Alpha FC','L1','2025','Alpha Park','u1'),"
                "('2','Beta United','L1','2025','Beta Arena','u2'),('3','Gamma Town','L1','2025',null,'u3'),"
                "('4','Ünited Zeta','L1','2025',null,'u4'),('5','Empty Rovers','L1','2010',null,'u5')")
    con.execute("insert into competitions values ('L1','league-one','Testland')")
    con.execute(f"insert into national_teams values ('{NATION}','Testland')")
    con.execute("insert into players values "
                "(10,'Both Player','Spain','Spain','Attack','Centre-Forward','right',180,'1990-06-15','img/default.jpg','p10'),"
                "(11,'Only Alpha','Italy','Italy','Defender','Centre-Back','left',185,'1995-01-01',null,'p11'),"
                "(12,'Only Beta','France','France','Midfield','Central Midfield','right',175,'1992-03-03',null,'p12'),"
                "(13,'Dup Heavy','Brazil','Brazil','Attack','Left Winger','left',170,null,null,'p13'),"
                "(14,'Wanderer','Portugal','Portugal','Midfield','Defensive Midfield','right',178,'1988-12-31',null,'p14'),"
                "(15,'National Dude','Testland','Testland','Attack','Striker','right',180,'1999-09-09',null,'p15')")
    # clubs missing from `clubs` get their names from games
    con.execute(f"insert into games values ('g0',{ALPHA},{CUPONLY},'Alpha FC','Cup Opponent'),"
                f"('g00',{BETA},{GAMMA},'Beta United','Gamma Town')")

    n = [0]

    def app(player, club, date, goals=0, comp="L1"):
        n[0] += 1
        con.execute("insert into appearances values (?,?,?,?,?,?,?,?,?,?)",
                    [f"a{n[0]}", 1000 + n[0], player, club, date, None, comp, goals, 0, 90])

    d = dt.date
    for i in range(5):                       # Both Player: 5 for Alpha, 3 for Beta (a join bug would give 15)
        app(10, ALPHA, d(2015, 1, 1 + i), goals=1)
    for i in range(3):
        app(10, BETA, d(2018, 2, 1 + i))
    for i in range(4):
        app(11, ALPHA, d(2016, 3, 1 + i))    # only Alpha
    for i in range(4):
        app(12, BETA, d(2016, 3, 1 + i))     # only Beta
    for i in range(6):                       # Dup Heavy: many apps for both
        app(13, ALPHA, d(2013, 5, 1 + i))
        app(13, BETA, d(2014, 5, 1 + i))
    app(14, GAMMA, d(2019, 8, 1)); app(14, ALPHA, d(2014, 8, 1)); app(14, BETA, d(2016, 8, 1))  # out of order
    app(14, NATION, d(2018, 6, 20), comp="FIWC")   # national team stint must not appear as a club
    app(15, NATION, d(2018, 6, 20), comp="FIWC"); app(15, ALPHA, d(2018, 7, 20))
    app(99, ALPHA, d(2017, 1, 1)); app(99, BETA, d(2017, 2, 1))     # orphan: not in players
    app(11, CUPONLY, d(2016, 9, 9))
    app(12, ZETA, d(2017, 9, 9))

    con.execute(f"insert into transfers values (14,'2016-07-01','16/17',{ALPHA},{BETA},'Alpha FC','Beta United',1000000,'Wanderer'),"
                f"(14,'2012-07-01','12/13',77,{ALPHA},'Youth','Alpha FC',null,'Wanderer'),"
                f"(14,'2019-07-01','19/20',{BETA},{GAMMA},'Beta United','Gamma Town',2000000,'Wanderer')")
    con.close()


@pytest.fixture(scope="session")
def client(tmp_path_factory):
    path = str(tmp_path_factory.mktemp("db") / "fixture.duckdb")
    build_fixture(path)
    settings = Settings(duckdb_path=path, cors_origins=["http://localhost:3000"], enable_player_images=True)
    with TestClient(create_app(settings)) as c:
        yield c
