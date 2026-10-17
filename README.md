# ⚽ TwoClubsOnePlayer

> **Two Clubs. One Player. Shared Football History.**

Discover footballers who have made recorded match appearances for two
different clubs throughout their careers.

Choose two clubs, compare their histories, and find the players who have
played for both.

```{=html}
<p align="center">
```
`<a href="https://2c1p.nailkocabay.com">`{=html}`<strong>`{=html}🌐 Live
Demo`</strong>`{=html}`</a>`{=html}   ·  
`<a href="https://github.com/nailkocabay/TwoClubsOnePlayer">`{=html}`<strong>`{=html}💻
GitHub Repository`</strong>`{=html}`</a>`{=html}
```{=html}
</p>
```

------------------------------------------------------------------------

## ✨ Features

-   **Club search** --- Find and select two football clubs.
-   **Shared player discovery** --- List players with at least one
    recorded match appearance for both clubs.
-   **Career statistics** --- View available appearances, goals,
    assists, and first/last recorded appearance dates for each club.
-   **Player career timeline** --- Explore recorded appearances and
    transfer history separately.
-   **Sorting and pagination** --- Sort by player name or combined
    appearances and load more results.
-   **Club switching** --- Swap or change the selected clubs.
-   **Shareable comparisons** --- Share a comparison through a URL
    containing the selected club IDs.
-   **Responsive interface** --- Use the app on desktop and mobile
    devices.
-   **Data coverage notice** --- Understand the limits of the available
    dataset.
-   **Interactive API docs** --- Explore backend endpoints through
    Swagger UI.

## 🧰 Tech Stack

  Layer      Technologies
  ---------- -----------------------------------------------------------
  Frontend   Next.js 15, TypeScript, Tailwind CSS, Lucide
  Backend    Python, FastAPI, Pydantic
  Database   DuckDB
  Testing    pytest, synthetic fixtures, optional real-database checks

## 🏗️ Architecture

``` text
User
 │
 ▼
Next.js Frontend
 │  HTTP requests
 ▼
FastAPI Backend
 ├── API routes
 ├── Validation and services
 ├── Repository layer (parameterized SQL)
 └── DuckDB
     ├── Appearances
     ├── Players
     ├── Clubs
     ├── Games
     └── Transfers
```

The backend opens the DuckDB source file in read-only mode. At startup,
it builds in-memory aggregated statistics to support shared-player
queries.

## 🔎 How It Works

1.  Select two football clubs.
2.  The backend retrieves recorded appearance statistics for each club.
3.  Players are matched using their player IDs.
4.  A player qualifies only if they have at least one recorded match
    appearance for **both** clubs.
5.  Results are sorted and paginated before being displayed.

**Transfers do not qualify a player.** Transfer history is displayed
separately; a recorded match appearance at each club is required.

## 🗃️ Dataset

The project uses data from the [Transfermarkt datasets
project](https://github.com/dcaribou/transfermarkt-datasets).

  -----------------------------------------------------------------------
  Table                               Purpose
  ----------------------------------- -----------------------------------
  `appearances`                       Recorded player appearances and
                                      match dates

  `players`                           Player names, nationality,
                                      position, and other available
                                      details

  `clubs`                             Club information

  `games`                             Additional club names for
                                      appearance records

  `transfers`                         Player transfer history, displayed
                                      separately

  `competitions`                      Competition information
  -----------------------------------------------------------------------

### Data Coverage and Limitations

> **Important:** Results reflect the available dataset, not the complete
> history of world football.

-   Recorded appearances cover **3 July 2012 -- 28 June 2026**.
-   The dataset includes selected domestic top-flight leagues, domestic
    cups, and UEFA club competitions.
-   Appearances before the coverage period are not available.
-   Some leagues and clubs are missing from the dataset.
-   Recorded appearance totals may be lower than a player's actual
    career totals.
-   Player photos are disabled by default because permission to reuse
    the image URLs has not been established.

## 🚀 Getting Started

### Prerequisites

-   Python 3.11+
-   Node.js 20+
-   npm
-   The project's DuckDB database file

### 1. Clone the Repository

``` bash
git clone https://github.com/nailkocabay/TwoClubsOnePlayer.git
cd TwoClubsOnePlayer
```

### 2. Configure the Database

Place your DuckDB file in the project's `data/` directory:

``` text
TwoClubsOnePlayer/
├── backend/
├── frontend/
├── scripts/
├── data/
│   └── transfermarkt-datasets.duckdb
└── README.md
```

Create the backend environment file:

``` bash
cd backend
cp .env.example .env
```

Set `DUCKDB_PATH` in `backend/.env` to the database file location. For
the directory structure above, the value may be:

``` env
DUCKDB_PATH=../data/transfermarkt-datasets.duckdb
```

Make sure the path resolves correctly in your environment.

### 3. Install and Run the Backend

Create a virtual environment:

``` bash
python -m venv .venv
```

Activate it on Windows PowerShell:

``` powershell
.venv\Scripts\Activate.ps1
```

Or on Linux/macOS:

``` bash
source .venv/bin/activate
```

Install dependencies and start the API:

``` bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend URLs:

-   API: <http://localhost:8000>
-   Swagger docs: <http://localhost:8000/docs>
-   Health check: <http://localhost:8000/api/health>

### 4. Install and Run the Frontend

Open a second terminal:

``` bash
cd frontend
cp .env.example .env.local
```

Set the API URL in `frontend/.env.local`:

``` env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Install dependencies and start the frontend:

``` bash
npm install
npm run dev
```

Open <http://localhost:3000> in your browser.

> **Windows tip:** If `cp` is unavailable in PowerShell, use
> `Copy-Item .env.example .env` or `Copy-Item .env.example .env.local`,
> as appropriate.

## 🔌 API Endpoints

  -----------------------------------------------------------------------------------
  Method                  Endpoint                            Description
  ----------------------- ----------------------------------- -----------------------
  `GET`                   `/api/health`                       Check API health and
                                                              coverage dates

  `GET`                   `/api/coverage`                     Retrieve dataset
                                                              coverage information

  `GET`                   `/api/teams`                        Search and paginate
                                                              clubs

  `GET`                   `/api/teams/{team_id}`              Retrieve club details

  `GET`                   `/api/shared-players`               Find players shared by
                                                              two clubs

  `GET`                   `/api/players/{player_id}/career`   Retrieve appearance and
                                                              transfer histories
  -----------------------------------------------------------------------------------

### Example Request

``` http
GET /api/shared-players?team_a=418&team_b=506&sort=appearances&order=desc
```

The IDs illustrate the request format. Use valid club IDs returned by
the API.

Interactive API documentation is available at
<http://localhost:8000/docs> when the backend is running.

## 🧪 Testing

Run the backend test suite:

``` bash
cd backend
pytest -q
```

To enable the optional real-database cross-check, set `DUCKDB_PATH` and
run the tests again.

You can also run the independent verification script from the `backend/`
directory:

``` bash
python ../scripts/verify_real_pair.py
```

The suite covers club search, shared-player matching, invalid inputs,
duplicate prevention, career-history ordering, and other API behaviours.

## 🔐 Data and Security

-   The source DuckDB database is opened read-only.
-   SQL queries use parameterized inputs.
-   Sorting fields are restricted to an allowlist.
-   Do not commit the database file unless redistribution is permitted.
-   Do not commit `.env` or `.env.local` files.
-   Review the dataset licence and attribution requirements before
    public deployment.

## 🌍 Live Deployment

Visit the application:

**<https://2c1p.nailkocabay.com>**

For production deployments:

1.  Host the FastAPI backend using a suitable hosting provider or
    Docker.
2.  Deploy the Next.js frontend using a platform such as Vercel or
    Docker.
3.  Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.
4.  Configure `CORS_ORIGINS` to allow the frontend origin.
5.  Enable HTTPS and configure appropriate request limits and caching.
6.  Mount the database read-only and ensure the hosting environment has
    enough memory for startup aggregation.

## 🛣️ Possible Future Improvements

-   Expand historical and international league coverage.
-   Add filters for nationality, position, and active years.
-   Improve player career visualizations.
-   Add more club-comparison and player-discovery options.
-   Optimize caching and production performance.

## 📚 Attribution

Football data originates from Transfermarkt, as packaged by the
[Transfermarkt datasets
project](https://github.com/dcaribou/transfermarkt-datasets).

TwoClubsOnePlayer is an independent project and is not affiliated with
or endorsed by Transfermarkt. Review the applicable dataset licence
before redistributing data or deploying the application publicly.

------------------------------------------------------------------------

```{=html}
<p align="center">
```
`<strong>`{=html}Two Clubs. One Player. Countless Connections.
⚽`</strong>`{=html} `<br />`{=html} Developed by
`<a href="https://github.com/nailkocabay">`{=html}Nail
Kocabay`</a>`{=html}
```{=html}
</p>
```
