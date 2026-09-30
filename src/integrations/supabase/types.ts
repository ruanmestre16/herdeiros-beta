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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      campaign_members: {
        Row: {
          campaign_id: string
          character_id: string | null
          joined_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          character_id?: string | null
          joined_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          character_id?: string | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_secrets: {
        Row: {
          campaign_id: string
          password_hash: string
        }
        Insert: {
          campaign_id: string
          password_hash: string
        }
        Update: {
          campaign_id?: string
          password_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_secrets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          code: string
          combat_active: boolean
          created_at: string
          id: string
          invite_token: string
          log: Json
          master_id: string
          name: string
          round: number
          scene: string
          turn_index: number
        }
        Insert: {
          code?: string
          combat_active?: boolean
          created_at?: string
          id?: string
          invite_token?: string
          log?: Json
          master_id?: string
          name?: string
          round?: number
          scene?: string
          turn_index?: number
        }
        Update: {
          code?: string
          combat_active?: boolean
          created_at?: string
          id?: string
          invite_token?: string
          log?: Json
          master_id?: string
          name?: string
          round?: number
          scene?: string
          turn_index?: number
        }
        Relationships: []
      }
      npcs: {
        Row: {
          bloqueio: number
          campaign_id: string
          corpo: number
          created_at: string
          espirito: number
          esquiva: number
          hidden: boolean
          id: string
          initiative: number | null
          kind: string
          mente: number
          name: string
          notes: string
          pf_current: number
          pf_max: number
          pv_current: number
          pv_max: number
        }
        Insert: {
          bloqueio?: number
          campaign_id: string
          corpo?: number
          created_at?: string
          espirito?: number
          esquiva?: number
          hidden?: boolean
          id?: string
          initiative?: number | null
          kind?: string
          mente?: number
          name?: string
          notes?: string
          pf_current?: number
          pf_max?: number
          pv_current?: number
          pv_max?: number
        }
        Update: {
          bloqueio?: number
          campaign_id?: string
          corpo?: number
          created_at?: string
          espirito?: number
          esquiva?: number
          hidden?: boolean
          id?: string
          initiative?: number | null
          kind?: string
          mente?: number
          name?: string
          notes?: string
          pf_current?: number
          pf_max?: number
          pv_current?: number
          pv_max?: number
        }
        Relationships: [
          {
            foreignKeyName: "npcs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      sheets: {
        Row: {
          abilities: Json
          concept: string
          corpo: number
          created_at: string
          espirito: number
          exhaustion: number
          gs: number
          id: string
          initiative: number | null
          inventory: Json
          karma: number
          lineage: string
          mente: number
          name: string
          nomenclatures: Json
          pf_current: number
          pf_max: number
          pv_current: number
          pv_max: number
          stage: string
          story: string
          sync: Json
          user_id: string
          weapon: string
          weapon_dice: string
          weapon_type: string
        }
        Insert: {
          abilities?: Json
          concept?: string
          corpo?: number
          created_at?: string
          espirito?: number
          exhaustion?: number
          gs?: number
          id?: string
          initiative?: number | null
          inventory?: Json
          karma?: number
          lineage?: string
          mente?: number
          name?: string
          nomenclatures?: Json
          pf_current?: number
          pf_max?: number
          pv_current?: number
          pv_max?: number
          stage?: string
          story?: string
          sync?: Json
          user_id?: string
          weapon?: string
          weapon_dice?: string
          weapon_type?: string
        }
        Update: {
          abilities?: Json
          concept?: string
          corpo?: number
          created_at?: string
          espirito?: number
          exhaustion?: number
          gs?: number
          id?: string
          initiative?: number | null
          inventory?: Json
          karma?: number
          lineage?: string
          mente?: number
          name?: string
          nomenclatures?: Json
          pf_current?: number
          pf_max?: number
          pv_current?: number
          pv_max?: number
          stage?: string
          story?: string
          sync?: Json
          user_id?: string
          weapon?: string
          weapon_dice?: string
          weapon_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_campaign_master: { Args: { p_campaign: string }; Returns: boolean }
      is_campaign_member: { Args: { p_campaign: string }; Returns: boolean }
      is_master_of_sheet: { Args: { p_sheet: string }; Returns: boolean }
      join_campaign: {
        Args: { p_code: string; p_password: string }
        Returns: string
      }
      join_campaign_invite: { Args: { p_token: string }; Returns: string }
      master_update_sheet: {
        Args: {
          p_clear_initiative?: boolean
          p_pf: number
          p_pv: number
          p_sheet: string
        }
        Returns: undefined
      }
      set_campaign_password: {
        Args: { p_campaign: string; p_password: string }
        Returns: undefined
      }
      shares_campaign_sheet: { Args: { p_sheet: string }; Returns: boolean }
      shares_campaign_user: { Args: { p_user: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
