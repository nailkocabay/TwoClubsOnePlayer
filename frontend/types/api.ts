export interface Team {
  club_id: number;
  name: string;
  competition_id: string | null;
  country: string | null;
  stadium: string | null;
  last_season: string | null;
  appearances: number;
  players: number;
  first_appearance: string | null;
  last_appearance: string | null;
  has_appearance_data: boolean;
}
export interface TeamSearchResponse { query: string; total: number; limit: number; offset: number; items: Team[] }

export interface ClubStat { appearances: number; goals: number; assists: number; first_appearance: string; last_appearance: string }
export interface SharedPlayer {
  player_id: number; name: string; nationality: string | null; position: string | null; sub_position: string | null;
  date_of_birth: string | null; age: number | null; image_url: string | null;
  team_a: ClubStat; team_b: ClubStat; total_appearances: number;
}
export interface Coverage { first_date: string; last_date: string; total_appearances: number; players: number; competitions: number; message: string }
export type SortKey = "name" | "appearances";
export type SortOrder = "asc" | "desc";
export interface SharedPlayersResponse {
  team_a: Team; team_b: Team; total: number; limit: number; offset: number;
  sort: SortKey; order: SortOrder; items: SharedPlayer[]; coverage: Coverage;
}

export interface PlayerInfo {
  player_id: number; name: string; nationality: string | null; country_of_birth: string | null;
  position: string | null; sub_position: string | null; foot: string | null; height_cm: number | null;
  date_of_birth: string | null; age: number | null; image_url: string | null; source_url: string | null;
}
export interface AppearanceStint { club_id: number; club_name: string; appearances: number; goals: number; assists: number; first_appearance: string; last_appearance: string }
export interface TransferRecord {
  transfer_date: string | null; season: string | null; from_club_id: number | null; from_club_name: string | null;
  to_club_id: number | null; to_club_name: string | null; fee_eur: number | null; is_future: boolean;
}
export interface CareerResponse { player: PlayerInfo; appearance_history: AppearanceStint[]; transfer_history: TransferRecord[]; coverage: Coverage }

export interface PlayerClubStint {
  club_id: number;
  club_name: string;
  appearances: number;
  first_appearance: string;
  last_appearance: string;
}
export interface PlayerSearchResult {
  player_id: number;
  name: string;
  nationality: string | null;
  position: string | null;
  sub_position: string | null;
  date_of_birth: string | null;
  image_url: string | null;
  clubs: PlayerClubStint[];
}
export interface PlayerSearchResponse { query: string; total: number; limit: number; offset: number; items: PlayerSearchResult[] }
