⚽ TwoClubsOnePlayer

Two Clubs. One Player. Shared Football History.

TwoClubsOnePlayer is a web application that helps football fans discover players who have made recorded match appearances for two different football clubs throughout their careers.

Choose two clubs, compare their histories, and discover the players who have played for both.

🌐 Live Demo: "2c1p.nailkocabay.com" (https://2c1p.nailkocabay.com)
💻 GitHub Repository: "nailkocabay/TwoClubsOnePlayer" (https://github.com/nailkocabay/TwoClubsOnePlayer)

«Data coverage notice: Results are based on recorded appearances in the available dataset, covering 3 July 2012 to 28 June 2026. The dataset does not represent the complete history of world football.»

---

✨ Features

- Club Search: Search for football clubs and select two teams.
- Shared Player Discovery: Find players with at least one recorded match appearance for both selected clubs.
- Career Statistics: View separate appearance counts, goals, assists, and first/last recorded appearance dates for each club.
- Player Career Timeline: Explore recorded club appearances and transfer history separately.
- Sorting & Pagination: Sort results by player name or combined appearances and load additional results.
- Club Switching: Swap or change the selected teams.
- Shareable Comparisons: Share club comparisons through URLs containing the selected club IDs.
- Responsive Design: Access the application on desktop and mobile devices.
- Data Coverage Information: Understand the limitations of the available football data.
- Interactive API Documentation: Explore backend endpoints through Swagger UI.

🛠️ Tech Stack

Frontend

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Lucide Icons

Backend

- Python
- FastAPI
- Pydantic
- DuckDB

Testing

- pytest
- Synthetic database fixtures
- Optional real-database cross-checks

🏗️ Architecture

TwoClubsOnePlayer uses a frontend-backend architecture.

User
 │
 ▼
Next.js Frontend
 │
 │ HTTP Requests
 ▼
FastAPI Backend
 │
 ├── API Routes
 ├── Validation & Services
 ├── Repository Layer (SQL)
 └── DuckDB
      ├── Appearances
      ├── Players
      ├── Clubs
      ├── Games
      └── Transfers

The backend opens the supplied DuckDB database in read-only mode. At startup, it builds in-memory aggregated statistics to support efficient shared-player queries.

🔍 How It Works

1. Select two football clubs.
2. The backend retrieves recorded appearance statistics for both clubs.
3. Players are matched using their player IDs.
4. Only players with at least one recorded match appearance for each selected club qualify.
5. Results are sorted and paginated before being returned to the frontend.

Transfer records are displayed separately and are not used to determine whether a player qualifies as a shared player.

For each matching player, the application displays the available statistics independently for both clubs.

🗄️ Dataset

The project uses data from the "Transfermarkt datasets project" (https://github.com/dcaribou/transfermarkt-datasets).

Table| Purpose
"appearances"| Recorded player appearances and match dates
"players"| Player names, nationality, position, and other available details
"clubs"| Club information
"games"| Additional club names for appearance records
"transfers"| Separate player transfer history
"competitions"| Competition information

Data Limitations

- Recorded appearances cover 3 July 2012 – 28 June 2026.
- The dataset includes selected domestic top-flight leagues, domestic cups, and UEFA club competitions.
- Historical appearances before the coverage period are unavailable.
- Some leagues and clubs are missing from the dataset.
- Recorded appearance totals may be lower than a player's actual career totals.
- Player photos are disabled by default because permission to reuse the image URLs has not been established.

Results should therefore be interpreted as shared players within the available dataset, not as a complete historical record of all football clubs.

🚀 Getting Started

Prerequisites

- Python 3.11+
- Node.js 20+
- npm
- The project's DuckDB database file

1. Clone the Repository

git clone https://github.com/nailkocabay/TwoClubsOnePlayer.git
cd TwoClubsOnePlayer

2. Configure the Database

Place your DuckDB file in the project's "data/" directory:

TwoClubsOnePlayer/
├── backend/
├── frontend/
├── scripts/
├── data/
│   └── transfermarkt-datasets.duckdb
└── README.md

Create the backend environment file:

cd backend
cp .env.example .env

Set "DUCKDB_PATH" in "backend/.env" to the location of your database file.

Example:

DUCKDB_PATH=../data/transfermarkt-datasets.duckdb

Make sure the path resolves correctly in your local environment.

3. Install and Run the Backend

Create a virtual environment:

python -m venv .venv

On Windows PowerShell:

.venv\Scripts\Activate.ps1

On Linux or macOS:

source .venv/bin/activate

Install dependencies and start the API:

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

The backend should be available at:

- API: "http://localhost:8000"
- Swagger documentation: "http://localhost:8000/docs"
- Health check: "http://localhost:8000/api/health"

4. Install and Run the Frontend

Open a second terminal:

cd frontend

Create the frontend environment file:

cp .env.example .env.local

Configure the API URL in "frontend/.env.local":

NEXT_PUBLIC_API_URL=http://localhost:8000

Install dependencies and start the development server:

npm install
npm run dev

Open "http://localhost:3000" (http://localhost:3000) in your browser.

«On Windows, use PowerShell's "Copy-Item" command instead of "cp" if needed.»

🔌 API Endpoints

Method| Endpoint| Description
"GET"| "/api/health"| Check API health and coverage dates
"GET"| "/api/coverage"| Retrieve dataset coverage information
"GET"| "/api/teams"| Search and paginate clubs
"GET"| "/api/teams/{team_id}"| Retrieve club details
"GET"| "/api/shared-players"| Find players shared by two clubs
"GET"| "/api/players/{player_id}/career"| Retrieve recorded appearance and transfer histories

Example: Find Shared Players

GET /api/shared-players?team_a=418&team_b=506&sort=appearances&order=desc

The IDs above illustrate the request format. Use valid club IDs returned by the API.

Interactive API documentation is available at "/docs" while the backend is running.

🧪 Testing

Run the backend test suite:

cd backend
pytest -q

To enable the optional real-database cross-check, configure "DUCKDB_PATH" and run the tests again.

You can also run the independent verification script:

python ../scripts/verify_real_pair.py

The test suite covers club search, shared-player matching, invalid inputs, duplicate prevention, career history ordering, and other important API behaviours.

🔒 Data & Security

- The original DuckDB database is opened read-only.
- SQL queries use parameterized inputs.
- Sorting fields are restricted to an allowlist.
- The database file should not be committed unless redistribution is permitted.
- Environment files containing local configuration should not be committed.
- Review the dataset's licence and attribution requirements before public deployment.

🌐 Deployment

The live application is available at:

"https://2c1p.nailkocabay.com" (https://2c1p.nailkocabay.com)

For production deployments:

1. Host the FastAPI backend using a suitable hosting provider or Docker.
2. Deploy the Next.js frontend to a platform such as Vercel or use Docker.
3. Configure "NEXT_PUBLIC_API_URL" with the deployed backend URL.
4. Set "CORS_ORIGINS" to the permitted frontend origin.
5. Enable HTTPS and configure appropriate request limits and caching.
6. Mount the database read-only and ensure the hosting environment has sufficient memory for startup aggregation.

📌 Future Improvements

Potential improvements include:

- Expanding historical and international league coverage.
- Adding filters by nationality, position, and active years.
- Improving player career visualizations.
- Adding more club comparison and player discovery options.
- Optimizing caching and production performance.

📄 Attribution

Football data originates from Transfermarkt, as packaged by the "Transfermarkt datasets project" (https://github.com/dcaribou/transfermarkt-datasets).

TwoClubsOnePlayer is an independent project and is not affiliated with or endorsed by Transfermarkt. Review the applicable dataset licence before redistributing data or deploying the application publicly.

---

Two Clubs. One Player. Countless Connections. ⚽

Developed by "Nail Kocabay" (https://github.com/nailkocabay).
