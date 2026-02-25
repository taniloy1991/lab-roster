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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          setting_key: string | null
          setting_value: string | null
        }
        Insert: {
          id?: string
          setting_key?: string | null
          setting_value?: string | null
        }
        Update: {
          id?: string
          setting_key?: string | null
          setting_value?: string | null
        }
        Relationships: []
      }
      casual_leave_ledger: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          leave_date: string
          staff_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          leave_date: string
          staff_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          leave_date?: string
          staff_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "casual_leave_ledger_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casual_leave_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "casual_leave_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "casual_leave_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "casual_leave_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      compensatory_off_ledger: {
        Row: {
          created_at: string
          duty_date: string
          entry_type: string
          id: string
          institution_id: string
          notes: string | null
          source_type: string | null
          staff_id: string
        }
        Insert: {
          created_at?: string
          duty_date: string
          entry_type: string
          id?: string
          institution_id: string
          notes?: string | null
          source_type?: string | null
          staff_id: string
        }
        Update: {
          created_at?: string
          duty_date?: string
          entry_type?: string
          id?: string
          institution_id?: string
          notes?: string | null
          source_type?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensatory_off_ledger_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensatory_off_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "compensatory_off_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "compensatory_off_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "compensatory_off_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      global_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["global_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["global_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["global_role"]
          user_id?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          institution_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          institution_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          institution_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          casual_leave_quota_yearly: number
          created_at: string
          institution_id: string
          updated_at: string
          weekly_off_quota: number
        }
        Insert: {
          casual_leave_quota_yearly?: number
          created_at?: string
          institution_id: string
          updated_at?: string
          weekly_off_quota?: number
        }
        Update: {
          casual_leave_quota_yearly?: number
          created_at?: string
          institution_id?: string
          updated_at?: string
          weekly_off_quota?: number
        }
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_users: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          decided_by: string | null
          decision_note: string | null
          end_date: string
          id: string
          institution_id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          decision_note?: string | null
          end_date: string
          id?: string
          institution_id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          decision_note?: string | null
          end_date?: string
          id?: string
          institution_id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_institution_id: string | null
          created_at: string
          full_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_institution_id?: string | null
          created_at?: string
          full_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_institution_id?: string | null
          created_at?: string
          full_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_institution_id_fkey"
            columns: ["active_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_days: {
        Row: {
          created_at: string
          duty_date: string
          id: string
          institution_id: string
          is_friday: boolean | null
          is_govt_holiday: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duty_date: string
          id?: string
          institution_id: string
          is_friday?: boolean | null
          is_govt_holiday?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duty_date?: string
          id?: string
          institution_id?: string
          is_friday?: boolean | null
          is_govt_holiday?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_days_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_shift_assignments: {
        Row: {
          created_at: string
          id: string
          is_extra: boolean
          roster_day_id: string
          shift: Database["public"]["Enums"]["roster_shift"]
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_extra?: boolean
          roster_day_id: string
          shift: Database["public"]["Enums"]["roster_shift"]
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_extra?: boolean
          roster_day_id?: string
          shift?: Database["public"]["Enums"]["roster_shift"]
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_shift_assignments_roster_day_id_fkey"
            columns: ["roster_day_id"]
            isOneToOne: false
            referencedRelation: "roster_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "roster_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "roster_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "roster_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          designation: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
          phone: string | null
          staff_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          designation?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          phone?: string | null
          staff_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          designation?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          staff_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          institution_user_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          institution_user_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          institution_user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institution_user_id_fkey"
            columns: ["institution_user_id"]
            isOneToOne: false
            referencedRelation: "institution_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cl_balance_view: {
        Row: {
          cl_remaining: number | null
          cl_used: number | null
          name: string | null
          staff_id: string | null
        }
        Relationships: []
      }
      monthly_leave_summary: {
        Row: {
          cl_remaining: number | null
          cl_used: number | null
          month: string | null
          name: string | null
          off_balance: number | null
          off_earned: number | null
          off_used: number | null
          staff_id: string | null
        }
        Relationships: []
      }
      off_balance_view: {
        Row: {
          earned_off: number | null
          name: string | null
          off_balance: number | null
          staff_id: string | null
          used_off: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_institution_id: { Args: never; Returns: string }
      has_global_role: {
        Args: {
          _role: Database["public"]["Enums"]["global_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_institution_role: {
        Args: {
          _institution_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_in_institution: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "lab_incharge" | "staff"
      global_role: "super_admin"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type: "casual" | "off"
      off_ledger_type: "earn" | "use"
      roster_shift: "morning" | "evening" | "night"
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
    Enums: {
      app_role: ["lab_incharge", "staff"],
      global_role: ["super_admin"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: ["casual", "off"],
      off_ledger_type: ["earn", "use"],
      roster_shift: ["morning", "evening", "night"],
    },
  },
} as const
