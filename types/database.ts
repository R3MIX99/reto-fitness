export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audits: {
        Row: {
          check_id: string
          created_at: string
          id: string
          reason: string | null
          reviewer_id: string
          vote: string
        }
        Insert: {
          check_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewer_id: string
          vote: string
        }
        Update: {
          check_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewer_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "daily_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checks: {
        Row: {
          check_date: string
          created_at: string
          evidence_path: string
          goal_id: string | null
          group_id: string
          id: string
          kind: string
          status: string
          user_id: string
        }
        Insert: {
          check_date?: string
          created_at?: string
          evidence_path: string
          goal_id?: string | null
          group_id: string
          id?: string
          kind: string
          status?: string
          user_id: string
        }
        Update: {
          check_date?: string
          created_at?: string
          evidence_path?: string
          goal_id?: string | null
          group_id?: string
          id?: string
          kind?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_scores: {
        Row: {
          base_points: number
          bonus_points: number
          group_id: string
          penalty_points: number
          score_date: string
          total_points: number | null
          user_id: string
        }
        Insert: {
          base_points?: number
          bonus_points?: number
          group_id: string
          penalty_points?: number
          score_date: string
          total_points?: number | null
          user_id: string
        }
        Update: {
          base_points?: number
          bonus_points?: number
          group_id?: string
          penalty_points?: number
          score_date?: string
          total_points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_scores_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          active: boolean
          created_at: string
          group_id: string | null
          icon: string | null
          id: string
          kind: string
          position: number
          reminder_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id?: string | null
          icon?: string | null
          id?: string
          kind: string
          position?: number
          reminder_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string | null
          icon?: string | null
          id?: string
          kind?: string
          position?: number
          reminder_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_settings: {
        Row: {
          audit_rule: string
          bad_streak_days: number
          bad_streak_extra: number
          bad_streak_penalty: number
          daily_goals_count: number
          good_streak_bonus: number
          good_streak_cap: number
          good_streak_days: number
          good_streak_extra: number
          grace_hour: number
          group_id: string
          gym_per_day: number
          meals_per_day: number
        }
        Insert: {
          audit_rule?: string
          bad_streak_days?: number
          bad_streak_extra?: number
          bad_streak_penalty?: number
          daily_goals_count?: number
          good_streak_bonus?: number
          good_streak_cap?: number
          good_streak_days?: number
          good_streak_extra?: number
          grace_hour?: number
          group_id: string
          gym_per_day?: number
          meals_per_day?: number
        }
        Update: {
          audit_rule?: string
          bad_streak_days?: number
          bad_streak_extra?: number
          bad_streak_penalty?: number
          daily_goals_count?: number
          good_streak_bonus?: number
          good_streak_cap?: number
          good_streak_days?: number
          good_streak_extra?: number
          grace_hour?: number
          group_id?: string
          gym_per_day?: number
          meals_per_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_settings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          audit_reminder: boolean
          goals_reminder: boolean
          gym_reminder: boolean
          meals_reminder: boolean
          quiet_from: string | null
          quiet_to: string | null
          streak_reminder: boolean
          user_id: string
        }
        Insert: {
          audit_reminder?: boolean
          goals_reminder?: boolean
          gym_reminder?: boolean
          meals_reminder?: boolean
          quiet_from?: string | null
          quiet_to?: string | null
          streak_reminder?: boolean
          user_id: string
        }
        Update: {
          audit_reminder?: boolean
          goals_reminder?: boolean
          gym_reminder?: boolean
          meals_reminder?: boolean
          quiet_from?: string | null
          quiet_to?: string | null
          streak_reminder?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          gender: string
          id: string
          locale: string
          onboarded: boolean
          theme: string
          tour_completed: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string
          id: string
          locale?: string
          onboarded?: boolean
          theme?: string
          tour_completed?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string
          id?: string
          locale?: string
          onboarded?: boolean
          theme?: string
          tour_completed?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          id: string
          locale: string
          text: string
        }
        Insert: {
          id?: string
          locale?: string
          text: string
        }
        Update: {
          id?: string
          locale?: string
          text?: string
        }
        Relationships: []
      }
      season_members: {
        Row: {
          joined_at: string | null
          season_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          season_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_members_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      season_standings: {
        Row: {
          rank: number
          season_id: string
          total_points: number
          user_id: string
        }
        Insert: {
          rank: number
          season_id: string
          total_points: number
          user_id: string
        }
        Update: {
          rank?: number
          season_id?: string
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_standings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          created_by: string
          duration_weeks: number
          end_date: string
          finished_at: string | null
          grace_days: number
          group_id: string
          id: string
          name: string
          season_number: number
          start_date: string
          status: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          created_by: string
          duration_weeks: number
          end_date: string
          finished_at?: string | null
          grace_days?: number
          group_id: string
          id?: string
          name: string
          season_number: number
          start_date: string
          status?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          created_by?: string
          duration_weeks?: number
          end_date?: string
          finished_at?: string | null
          grace_days?: number
          group_id?: string
          id?: string
          name?: string
          season_number?: number
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          current_bad: number
          current_good: number
          group_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_bad?: number
          current_good?: number
          group_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_bad?: number
          current_good?: number
          group_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          created_at: string
          end_date: string
          group_id: string
          id: string
          start_date: string
          status: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          end_date: string
          group_id: string
          id?: string
          start_date: string
          status?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string
          group_id?: string
          id?: string
          start_date?: string
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weeks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weeks_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_approve_old_checks: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      cancel_season: {
        Args: { p_reason: string; p_season_id: string }
        Returns: undefined
      }
      daily_max_points: { Args: { g_id: string }; Returns: number }
      group_is_auditing: { Args: { g_id: string }; Returns: boolean }
      is_group_member: { Args: { g_id: string }; Returns: boolean }
      join_group_by_code: { Args: { p_invite_code: string }; Returns: Json }
      preview_group_by_code: { Args: { p_invite_code: string }; Returns: Json }
      process_seasons: { Args: Record<PropertyKey, never>; Returns: undefined }
      recalc_day_score: {
        Args: { p_date: string; p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      start_season: {
        Args: {
          p_duration_weeks: number
          p_group_id: string
          p_name?: string
          p_start_date: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ── Alias de conveniencia ────────────────────────────────────────────────────
export type Profile = Tables<"profiles">
export type Group = Tables<"groups">
export type GroupMember = Tables<"group_members">
export type GroupSettings = Tables<"group_settings">
export type Goal = Tables<"goals">
export type DailyCheck = Tables<"daily_checks">
export type DailyScore = Tables<"daily_scores">
export type Streak = Tables<"streaks">
export type Week = Tables<"weeks">
export type Audit = Tables<"audits">
export type Quote = Tables<"quotes">
export type SeasonRow = Tables<"seasons">
export type SeasonMember = Tables<"season_members">
export type SeasonStanding = Tables<"season_standings">
