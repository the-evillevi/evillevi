export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chess_games: {
        Row: {
          black_id: string | null
          black_ms: number | null
          black_name: string
          black_ready: boolean
          color_preference: string
          created_at: string
          creator_color: string
          creator_id: string
          deadline: string | null
          draw_offer: string | null
          id: string
          position: Json
          result: Json | null
          rules_version: string
          ruleset: string
          started_at: string | null
          status: string
          time_control: Json
          turn: string
          turn_started_at: string | null
          updated_at: string
          version: number
          white_id: string | null
          white_ms: number | null
          white_name: string
          white_ready: boolean
        }
        Insert: {
          black_id?: string | null
          black_ms?: number | null
          black_name?: string
          black_ready?: boolean
          color_preference: string
          created_at?: string
          creator_color: string
          creator_id: string
          deadline?: string | null
          draw_offer?: string | null
          id: string
          position: Json
          result?: Json | null
          rules_version: string
          ruleset: string
          started_at?: string | null
          status?: string
          time_control?: Json
          turn?: string
          turn_started_at?: string | null
          updated_at?: string
          version?: number
          white_id?: string | null
          white_ms?: number | null
          white_name?: string
          white_ready?: boolean
        }
        Update: {
          black_id?: string | null
          black_ms?: number | null
          black_name?: string
          black_ready?: boolean
          color_preference?: string
          created_at?: string
          creator_color?: string
          creator_id?: string
          deadline?: string | null
          draw_offer?: string | null
          id?: string
          position?: Json
          result?: Json | null
          rules_version?: string
          ruleset?: string
          started_at?: string | null
          status?: string
          time_control?: Json
          turn?: string
          turn_started_at?: string | null
          updated_at?: string
          version?: number
          white_id?: string | null
          white_ms?: number | null
          white_name?: string
          white_ready?: boolean
        }
        Relationships: []
      }
      chess_moves: {
        Row: {
          actor: string
          created_at: string
          game_id: string
          game_version: number
          move: Json
          sequence: number
          state_hash: string
        }
        Insert: {
          actor: string
          created_at?: string
          game_id: string
          game_version: number
          move: Json
          sequence: number
          state_hash: string
        }
        Update: {
          actor?: string
          created_at?: string
          game_id?: string
          game_version?: number
          move?: Json
          sequence?: number
          state_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "chess_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "chess_games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      chess_commit: {
        Args: {
          p_action: string
          p_actor: string
          p_expected: number
          p_hash?: string
          p_id: string
          p_move?: Json
          p_position: Json
        }
        Returns: {
          black_id: string | null
          black_ms: number | null
          black_name: string
          black_ready: boolean
          color_preference: string
          created_at: string
          creator_color: string
          creator_id: string
          deadline: string | null
          draw_offer: string | null
          id: string
          position: Json
          result: Json | null
          rules_version: string
          ruleset: string
          started_at: string | null
          status: string
          time_control: Json
          turn: string
          turn_started_at: string | null
          updated_at: string
          version: number
          white_id: string | null
          white_ms: number | null
          white_name: string
          white_ready: boolean
        }
        SetofOptions: {
          from: "*"
          to: "chess_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chess_commit_position: {
        Args: {
          p_action: string
          p_actor: string
          p_expected: number
          p_hash?: string
          p_id: string
          p_move?: Json
          p_position: Json
        }
        Returns: {
          black_id: string | null
          black_ms: number | null
          black_name: string
          black_ready: boolean
          color_preference: string
          created_at: string
          creator_color: string
          creator_id: string
          deadline: string | null
          draw_offer: string | null
          id: string
          position: Json
          result: Json | null
          rules_version: string
          ruleset: string
          started_at: string | null
          status: string
          time_control: Json
          turn: string
          turn_started_at: string | null
          updated_at: string
          version: number
          white_id: string | null
          white_ms: number | null
          white_name: string
          white_ready: boolean
        }
        SetofOptions: {
          from: "*"
          to: "chess_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chess_create: {
        Args: {
          p_actor: string
          p_color: string
          p_id: string
          p_name: string
          p_position: Json
          p_preference: string
          p_ruleset: string
          p_time: Json
        }
        Returns: {
          black_id: string | null
          black_ms: number | null
          black_name: string
          black_ready: boolean
          color_preference: string
          created_at: string
          creator_color: string
          creator_id: string
          deadline: string | null
          draw_offer: string | null
          id: string
          position: Json
          result: Json | null
          rules_version: string
          ruleset: string
          started_at: string | null
          status: string
          time_control: Json
          turn: string
          turn_started_at: string | null
          updated_at: string
          version: number
          white_id: string | null
          white_ms: number | null
          white_name: string
          white_ready: boolean
        }
        SetofOptions: {
          from: "*"
          to: "chess_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chess_expire: {
        Args: { p_id: string }
        Returns: {
          black_id: string | null
          black_ms: number | null
          black_name: string
          black_ready: boolean
          color_preference: string
          created_at: string
          creator_color: string
          creator_id: string
          deadline: string | null
          draw_offer: string | null
          id: string
          position: Json
          result: Json | null
          rules_version: string
          ruleset: string
          started_at: string | null
          status: string
          time_control: Json
          turn: string
          turn_started_at: string | null
          updated_at: string
          version: number
          white_id: string | null
          white_ms: number | null
          white_name: string
          white_ready: boolean
        }
        SetofOptions: {
          from: "*"
          to: "chess_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chess_expiry_sweep: { Args: never; Returns: number }
      chess_invite: { Args: { p_game_id: string }; Returns: Json }
      chess_join: {
        Args: { p_actor: string; p_id: string; p_name: string }
        Returns: {
          black_id: string | null
          black_ms: number | null
          black_name: string
          black_ready: boolean
          color_preference: string
          created_at: string
          creator_color: string
          creator_id: string
          deadline: string | null
          draw_offer: string | null
          id: string
          position: Json
          result: Json | null
          rules_version: string
          ruleset: string
          started_at: string | null
          status: string
          time_control: Json
          turn: string
          turn_started_at: string | null
          updated_at: string
          version: number
          white_id: string | null
          white_ms: number | null
          white_name: string
          white_ready: boolean
        }
        SetofOptions: {
          from: "*"
          to: "chess_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      chess_lobby: { Args: never; Returns: Json }
      chess_snapshot: { Args: { p_game_id: string }; Returns: Json }
      chess_valid_time: { Args: { t: Json }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
