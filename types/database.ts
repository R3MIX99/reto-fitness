// Tipos generados desde el esquema de Supabase (02_ESQUEMA_SUPABASE.sql)
// Ejecutar: npx supabase gen types typescript --project-id <id> > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          theme: "light" | "dark" | "system";
          locale: "es" | "en";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          timezone: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["groups"]["Row"], "id" | "invite_code" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["groups"]["Insert"]>;
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["group_members"]["Row"], "joined_at">;
        Update: Partial<Database["public"]["Tables"]["group_members"]["Insert"]>;
      };
      daily_checks: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          goal_id: string | null;
          kind: "meal" | "daily" | "gym";
          check_date: string;
          evidence_path: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_checks"]["Row"], "id" | "created_at" | "status">;
        Update: Partial<Database["public"]["Tables"]["daily_checks"]["Insert"]>;
      };
      daily_scores: {
        Row: {
          user_id: string;
          group_id: string;
          score_date: string;
          base_points: number;
          bonus_points: number;
          penalty_points: number;
          total_points: number;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_scores"]["Row"], "total_points">;
        Update: Partial<Database["public"]["Tables"]["daily_scores"]["Insert"]>;
      };
    };
    Functions: {
      daily_max_points: { Args: { g_id: string }; Returns: number };
      is_group_member: { Args: { g_id: string }; Returns: boolean };
      group_is_auditing: { Args: { g_id: string }; Returns: boolean };
    };
  };
}
