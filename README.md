# TwoClubsOnePlayer

Pick two football clubs and see every player with a **recorded match appearance for both**. It looks at careers, not current squads.

- **Backend:** Python, FastAPI, Pydantic, DuckDB (source file opened read-only)
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide icons
- **Tests:** pytest (synthetic fixture + optional real-database cross-check)

## Features

Searchable club pickers (accent/case-insensitive, keyboard accessible) · same-club prevention · shared players with independent per-club appearance counts, goals, assists and first/last dates · sort by combined appearances or name · "Show more" pagination · swap / change teams · shareable URLs (`/?a=418&b=506`) · player drawer with a **recorded-appearance timeline** and a **separate transfer history** · visible data-coverage notice · loading, empty and error states · responsive layout.

## Architecture

```
backend/app/
  main.py            app factory, CORS, safe error handlers
  database.py        read-only ATTACH + two in-memory derived tables; cursor-per-request
  api/routes.py      endpoints
  services/          validation (same club, 404s), age, image policy
  repositories/      all SQL (parameterised; ORDER BY comes from a whitelist)
  schemas/           Pydantic response models
backend/tests/       pytest suite with a synthetic DuckDB fixture
frontend/            app/, components/, lib/ (API client), types/
scripts/             verify_real_pair.py (independent SQL check + latency)
```

DuckDB connections are not thread-safe, so the app keeps one root in-memory connection and gives every request its own `cursor()`. The supplied file is `ATTACH ... (READ_ONLY)`; nothing is ever written to it. Derived tables live only in memory and are rebuilt at startup (about 0.5 s).

## Database schema discovered

The file (`transfermarkt-datasets.duckdb`, ~210 MB) has 13 tables and no views. The ones used:

| Table | Rows | Used for |
|---|---|---|
| `appearances` | 1,894,350 | **Source of truth for "played for"**: one row per player per match, `player_club_id` (INTEGER), `date` |
| `players` | 50,149 | Name, nationality, position, date of birth, etc. |
| `clubs` | 796 | Club names. `club_id` is **VARCHAR** (cast to integer) |
| `games` | 88,958 | Club names for club ids missing from `clubs` |
| `transfers` | 175,165 | Transfer history, shown separately, never used to qualify a player |
| `national_teams`, `competitions` | 124 / 65 | Exclude national teams from clubs; country labels |

Data-quality findings that shaped the design:

- `appearances` has **no duplicates** (checked `appearance_id` and `(game_id, player_id)`), and no nulls in `player_id`, `player_club_id`, `date`.
- **686 club ids** in `appearances` are not in `clubs` (cup/European opponents). 685 have names in `games`, so the club directory merges both. One has no name anywhere and is omitted from search.
- **46 national-team ids** appear (World Cup 2026, Africa Cup of Nations). They are excluded from clubs and from club career history.
- `appearances` contains one `player_id` (380365) with no row in `players`; it is shown as "Unknown player #380365".
- 251 clubs in `clubs` have no appearance rows. They are hidden from search by default (`only_with_data=false` shows them).
- No club-logo column exists. `players.image_url` exists (see licensing).

## How the shared-player algorithm works

1. At startup, `club_player_stats` is built with one pass: `GROUP BY player_id, player_club_id` over `appearances` (count, first/last date, goals, assists).
2. A request self-joins that table: rows for club A joined to rows for club B on `player_id`. Because there is exactly one row per player and club, the join cannot multiply rows, and each club's count is independent.
3. A player qualifies only if both rows exist, so at least one real appearance at each club. Transfers play no part.
4. Players are left-joined to `players` for display; sorting and paging happen in SQL (`LIMIT/OFFSET`, total via a window count).

## Prerequisites

Python 3.11+, Node 20+, the DuckDB file (DuckDB >= 1.5 is required to open it).

## Setup and run

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then set DUCKDB_PATH to your file
uvicorn app.main:app --reload --port 8000

# Frontend (second terminal)
cd frontend
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                     # http://localhost:3000
```

`DUCKDB_PATH` is read from the environment or `backend/.env`; nothing is hardcoded. Docker: put the file in `./data/` and run `docker compose up --build`. (The Docker files were written but **not executed** in the environment where this was built.)

## Tests

```bash
cd backend
pytest -q                                    # synthetic fixture only; real-DB test is skipped
DUCKDB_PATH=/path/to/file.duckdb pytest -q   # also cross-checks Real Madrid x Juventus against raw SQL
DUCKDB_PATH=/path/to/file.duckdb python ../scripts/verify_real_pair.py
```

The suite covers: health; club search (partial, accents, wildcards, pagination, empty); valid shared query; player at both clubs; player at only one; duplicate-looking appearances (5 and 3 apps must not become 15); same club twice (400); unknown/national-team ids (404); invalid params (422); injection attempts; career ordering with national-team and transfer separation; orphan player.

## API

Interactive docs at `http://localhost:8000/docs`.

| Endpoint | Notes |
|---|---|
| `GET /api/health` | Status and coverage dates |
| `GET /api/coverage` | Dataset coverage and caveat text |
| `GET /api/teams?search=&limit=&offset=&only_with_data=` | Stable ranking: prefix, word-start, anywhere, then size, name, id |
| `GET /api/teams/{team_id}` | 404 if unknown |
| `GET /api/shared-players?team_a=&team_b=&sort=name\|appearances&order=&limit=&offset=` | 400 same club, 404 unknown, 422 invalid |
| `GET /api/players/{player_id}/career` | `appearance_history` and `transfer_history` as separate lists |

## Data coverage and limitations

- Appearances run **3 Jul 2012 to 28 Jun 2026**. Anything earlier is absent, so e.g. a Maradona or Zidane overlap cannot appear.
- Coverage is limited to the competitions in the dataset: 14 domestic top flights, domestic cups and UEFA club competitions. Clubs in other leagues (MLS, Saudi Pro League, Brazil, etc.) mostly have no appearance rows, so for example **Cristiano Ronaldo's Al-Nassr years are missing** from his appearance timeline, although his transfer history lists the move.
- A club's appearance count therefore reflects only matches in covered competitions, which can understate real totals. The UI states this on every result.
- Appearance bars in the timeline span first to last recorded match per club; a player who left and returned appears as one span.
- Verified examples: Real Madrid x Juventus returns 7 players including Cristiano Ronaldo (294 and 134 apps) and Álvaro Morata. Results for any pair match an independent SQL query (`verify_real_pair.py`).

## Licensing and attribution

Data originates from Transfermarkt, as packaged by the open Transfermarkt datasets project. Check the dataset's licence before public deployment, keep attribution, and do not imply affiliation. **Club logos are not used** (no licensed source in the data; monogram badges are shown). **Player photos are disabled by default**: `image_url` points to Transfermarkt's CDN and reuse rights are not granted by the dataset. Set `ENABLE_PLAYER_IMAGES=true` only if you have permission.

## Production deployment recommendations

- Host the backend (Docker) and frontend (Vercel or Docker) behind HTTPS; set `CORS_ORIGINS` to the real frontend origin and `NEXT_PUBLIC_API_URL` at frontend build time.
- Mount the DuckDB file read-only; run a single uvicorn process (or several, each holds its own ~in-memory derived tables).
- Add rate limiting at the proxy (e.g. nginx or Cloudflare) and a response cache for `/api/shared-players`, which is deterministic for a fixed dataset.
- Refresh the dataset on a schedule and redeploy; startup rebuilds the aggregates automatically.
