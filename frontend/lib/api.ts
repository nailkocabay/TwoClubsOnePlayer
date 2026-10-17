import type { CareerResponse, PlayerSearchResponse, SharedPlayersResponse, SortKey, SortOrder, Team, TeamSearchResponse } from "@/types/api";

export const PRODUCTION_API_URL = "https://twoclubsoneplayer-9vh6.onrender.com";
export const LOCAL_API_URL = "http://localhost:8000";

function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const rawUrl = configuredUrl || (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : LOCAL_API_URL);
  // Strip trailing slashes and avoid duplicated /api suffix
  return rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${normalizedPath}${qs.size ? `?${qs}` : ""}`, { signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Can't reach the server. Check that the backend is running and try again.", 0);
  }
  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (res.status === 422) detail = "That request wasn't valid. Please reselect your clubs.";
    } catch { /* keep default */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export const searchTeams = (search: string, signal?: AbortSignal) => get<TeamSearchResponse>("/api/teams", { search, limit: 8 }, signal);
export const getTeam = (id: number) => get<Team>(`/api/teams/${id}`);
export const getSharedPlayers = (a: number, b: number, sort: SortKey, order: SortOrder, offset: number, limit = 24) =>
  get<SharedPlayersResponse>("/api/shared-players", { team_a: a, team_b: b, sort, order, offset, limit });
export const getCareer = (id: number, signal?: AbortSignal) => get<CareerResponse>(`/api/players/${id}/career`, {}, signal);
export const searchPlayers = (search: string, signal?: AbortSignal) => get<PlayerSearchResponse>("/api/players/search", { search, limit: 8 }, signal);
