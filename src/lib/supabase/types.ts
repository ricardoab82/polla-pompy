export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole     = 'participant' | 'co-admin' | 'admin';
export type AuthProvider = 'email' | 'google';
export type MatchStatus  = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type MatchPhase   =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'final';

// ── Row types (what comes back from SELECT) ────────────────
export interface UserRow {
  id:                      string;
  email:                   string;
  display_name:            string;
  avatar_url:              string | null;
  role:                    UserRole;
  auth_provider:           AuthProvider;
  special_picks_submitted: boolean;
  created_at:              string;
  is_active:               boolean;
}

export interface MatchRow {
  id:               string;
  api_match_id:     number;
  home_team:        string;
  away_team:        string;
  home_team_logo:   string | null;
  away_team_logo:   string | null;
  kickoff_utc:      string;
  phase:            MatchPhase;
  group_name:       string | null;
  status:           MatchStatus;
  home_score:       number | null;
  away_score:       number | null;
  is_colombia_match: boolean;
  updated_at:       string;
}

export interface PickRow {
  id:               string;
  user_id:          string;
  match_id:         string;
  home_pick:        number;
  away_pick:        number;
  is_auto_assigned: boolean;
  submitted_at:     string;
  locked_at:        string | null;
  points_earned:    number | null;
}

export interface SpecialPickRow {
  id:               string;
  user_id:          string;
  champion:         string;
  runner_up:        string;
  top_scorer:       string;
  golden_ball:      string;
  third_place:               string | null;
  fourth_place:              string | null;
  golden_glove:              string | null;
  colombia_eliminated_phase: string | null;
  colombia_top_scorer:       string | null;
  submitted_at:              string;
  champion_pts:              number | null;
  runner_up_pts:             number | null;
  top_scorer_pts:            number | null;
  golden_ball_pts:           number | null;
  third_place_pts:           number | null;
  fourth_place_pts:          number | null;
  golden_glove_pts:          number | null;
  colombia_eliminated_pts:   number | null;
  colombia_top_scorer_pts:   number | null;
  total_special_pts:         number;
}

export interface BonusQuestionRow {
  id:             string;
  match_id:       string;
  question_text:  string;
  correct_answer: string | null;
  points_value:   number;
  created_by:     string;
  created_at:     string;
  answered_at:    string | null;
  answer_type:    'text' | 'yes_no' | 'team' | 'number';
}

export interface BonusAnswerRow {
  id:            string;
  question_id:   string;
  user_id:       string;
  answer:        string;
  is_correct:    boolean | null;
  points_earned: number | null;
  submitted_at:  string;
}

export interface PositionHistoryRow {
  id:           string;
  user_id:      string;
  snapshot_at:  string;
  position:     number;
  total_points: number;
}

export interface DailyApiUsageRow {
  id:         string;
  date:       string;
  call_count: number;
  updated_at: string;
}

export interface ReminderSentRow {
  id:       string;
  match_id: string;
  user_id:  string;
  sent_at:  string;
}

export interface LeaderboardRow {
  user_id:              string;
  display_name:         string;
  avatar_url:           string | null;
  group_pts:            number;
  knockout_pts:         number;
  bonus_pts:            number;
  special_pts:          number;
  total_points:         number;
  exact_results_count:  number;
  rank:                 number;
}

// ── Database type for Supabase client ──────────────────────
export interface Database {
  public: {
    Tables: {
      users: {
        Row:    UserRow;
        Insert: Omit<UserRow, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<UserRow, 'created_at'> & { created_at?: string }>;
      };
      matches: {
        Row:    MatchRow;
        Insert: Omit<MatchRow, 'id' | 'updated_at'> & { id?: string; updated_at?: string };
        Update: Partial<Omit<MatchRow, 'id' | 'updated_at'> & { id?: string; updated_at?: string }>;
      };
      picks: {
        Row:    PickRow;
        Insert: Omit<PickRow, 'id' | 'submitted_at'> & { id?: string; submitted_at?: string };
        Update: Partial<Omit<PickRow, 'id' | 'submitted_at'> & { id?: string; submitted_at?: string }>;
      };
      special_picks: {
        Row:    SpecialPickRow;
        Insert: Omit<SpecialPickRow, 'id' | 'submitted_at' | 'champion_pts' | 'runner_up_pts' | 'top_scorer_pts' | 'golden_ball_pts' | 'third_place_pts' | 'fourth_place_pts' | 'golden_glove_pts' | 'colombia_eliminated_pts' | 'colombia_top_scorer_pts' | 'total_special_pts'>
                & { id?: string; submitted_at?: string };
        Update: Partial<Omit<SpecialPickRow, 'id' | 'submitted_at' | 'total_special_pts'> & { id?: string; submitted_at?: string }>;
      };
      bonus_questions: {
        Row:    BonusQuestionRow;
        Insert: Omit<BonusQuestionRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<BonusQuestionRow, 'id' | 'created_at'> & { id?: string; created_at?: string }>;
      };
      bonus_answers: {
        Row:    BonusAnswerRow;
        Insert: Omit<BonusAnswerRow, 'id' | 'submitted_at'> & { id?: string; submitted_at?: string };
        Update: Partial<Omit<BonusAnswerRow, 'id' | 'submitted_at'> & { id?: string; submitted_at?: string }>;
      };
      position_history: {
        Row:    PositionHistoryRow;
        Insert: Omit<PositionHistoryRow, 'id' | 'snapshot_at'> & { id?: string; snapshot_at?: string };
        Update: Partial<Omit<PositionHistoryRow, 'id' | 'snapshot_at'> & { id?: string; snapshot_at?: string }>;
      };
      daily_api_usage: {
        Row:    DailyApiUsageRow;
        Insert: Omit<DailyApiUsageRow, 'id' | 'updated_at'> & { id?: string; updated_at?: string };
        Update: Partial<Omit<DailyApiUsageRow, 'id' | 'updated_at'> & { id?: string; updated_at?: string }>;
      };
      reminders_sent: {
        Row:    ReminderSentRow;
        Insert: Omit<ReminderSentRow, 'id' | 'sent_at'> & { id?: string; sent_at?: string };
        Update: Partial<Omit<ReminderSentRow, 'id' | 'sent_at'> & { id?: string; sent_at?: string }>;
      };
    };
    Views: {
      leaderboard: {
        Row: LeaderboardRow;
      };
    };
    Functions: Record<string, never>;
    Enums:     Record<string, never>;
  };
}
