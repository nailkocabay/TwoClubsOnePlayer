"""Verify shared-player results against the real database with an INDEPENDENT raw-SQL query,
and report query latency. Usage:  DUCKDB_PATH=... python scripts/verify_real_pair.py [club_a_id club_b_id]
"""
import itertools, os, statistics, sys, time
import duckdb

path = os.environ.get("DUCKDB_PATH") or sys.exit("Set DUCKDB_PATH")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.database import Database  # noqa: E402
from app.repositories import players as repo  # noqa: E402

db = Database(path); db.connect(); cur = db.con.cursor()
raw = duckdb.connect(path, read_only=True)

def check(a: int, b: int) -> int:
    got = {r["player_id"]: (r["a_apps"], r["b_apps"]) for r in repo.shared_players(cur, a, b, "name", "asc", 10000, 0)}
    want = {pid: (x, y) for pid, x, y in raw.execute(
        """select player_id, count(*) filter (where player_club_id = ?), count(*) filter (where player_club_id = ?)
           from appearances where player_club_id in (?, ?) group by 1
           having count(*) filter (where player_club_id = ?) > 0 and count(*) filter (where player_club_id = ?) > 0""",
        [a, b, a, b, a, b]).fetchall()}
    assert got == want, f"MISMATCH for {a} vs {b}"
    return len(got)

pairs = [(int(sys.argv[1]), int(sys.argv[2]))] if len(sys.argv) == 3 else [(418, 506), (11, 631), (16, 27), (131, 583), (46, 5)]
for a, b in pairs:
    print(f"clubs {a} x {b}: {check(a, b)} shared players - matches raw SQL")

# Latency over the 40 clubs with the most appearances (780 pairs)
top = [r[0] for r in cur.execute("select club_id from club_directory order by appearances desc limit 40").fetchall()]
times = []
for a, b in itertools.combinations(top, 2):
    t = time.perf_counter(); repo.shared_players(cur, a, b, "appearances", "desc", 24, 0); times.append((time.perf_counter() - t) * 1000)
times.sort()
print(f"latency over {len(times)} big-club pairs: median {statistics.median(times):.1f} ms, p95 {times[int(len(times)*.95)]:.1f} ms, max {times[-1]:.1f} ms")
