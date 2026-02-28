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
            referencedRelation: "general_off_balance_dynamic"
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
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casual_leave_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casual_leave_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      cl_transactions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          institution_id: string
          staff_id: string
          start_date: string
          total_days: number
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          institution_id: string
          staff_id: string
          start_date: string
          total_days: number
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          institution_id?: string
          staff_id?: string
          start_date?: string
          total_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cl_transactions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "general_off_balance_dynamic"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      compensatory_off_ledger: {
        Row: {
          created_at: string
          direction: string | null
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
          direction?: string | null
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
          direction?: string | null
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
            referencedRelation: "general_off_balance_dynamic"
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
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensatory_off_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensatory_off_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      general_off_deduct: {
        Row: {
          created_at: string
          days_deducted: number
          end_date: string
          id: string
          institution_id: string
          staff_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          days_deducted: number
          end_date: string
          id?: string
          institution_id: string
          staff_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          days_deducted?: number
          end_date?: string
          id?: string
          institution_id?: string
          staff_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_off_deduct_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_off_deduct_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_deduct_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "general_off_balance_dynamic"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_deduct_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_deduct_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_deduct_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_off_deduct_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_off_deduct_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      general_off_earn: {
        Row: {
          created_at: string
          days_earned: number
          end_date: string
          id: string
          institution_id: string
          staff_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          days_earned: number
          end_date: string
          id?: string
          institution_id: string
          staff_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          days_earned?: number
          end_date?: string
          id?: string
          institution_id?: string
          staff_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_off_earn_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_off_earn_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_earn_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "general_off_balance_dynamic"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_earn_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_earn_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "general_off_earn_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_off_earn_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_off_earn_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
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
          holiday_type: string | null
          id: string
          institution_id: string
          name: string
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          holiday_type?: string | null
          id?: string
          institution_id: string
          name: string
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          holiday_type?: string | null
          id?: string
          institution_id?: string
          name?: string
          staff_id?: string | null
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
          {
            foreignKeyName: "holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "general_off_balance_dynamic"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
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
            referencedRelation: "general_off_balance_dynamic"
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
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
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
          leave_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duty_date: string
          id?: string
          institution_id: string
          is_friday?: boolean | null
          is_govt_holiday?: boolean | null
          leave_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duty_date?: string
          id?: string
          institution_id?: string
          is_friday?: boolean | null
          is_govt_holiday?: boolean | null
          leave_type?: string | null
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
          duty_note: string | null
          id: string
          is_extra: boolean
          roster_day_id: string
          shift: Database["public"]["Enums"]["roster_shift"]
          staff_id: string
        }
        Insert: {
          created_at?: string
          duty_note?: string | null
          id?: string
          is_extra?: boolean
          roster_day_id: string
          shift: Database["public"]["Enums"]["roster_shift"]
          staff_id: string
        }
        Update: {
          created_at?: string
          duty_note?: string | null
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
            referencedRelation: "general_off_balance_dynamic"
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
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      roster_visual_entries: {
        Row: {
          created_at: string
          created_by: string | null
          duty_date: string
          id: string
          institution_id: string
          leave_type:
            | Database["public"]["Enums"]["roster_visual_leave_type"]
            | null
          responsibility_note: string | null
          shift: Database["public"]["Enums"]["roster_shift"] | null
          staff_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duty_date: string
          id?: string
          institution_id: string
          leave_type?:
            | Database["public"]["Enums"]["roster_visual_leave_type"]
            | null
          responsibility_note?: string | null
          shift?: Database["public"]["Enums"]["roster_shift"] | null
          staff_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duty_date?: string
          id?: string
          institution_id?: string
          leave_type?:
            | Database["public"]["Enums"]["roster_visual_leave_type"]
            | null
          responsibility_note?: string | null
          shift?: Database["public"]["Enums"]["roster_shift"] | null
          staff_id?: string | null
        }
        Relationships: []
      }
      selected_roster_dates: {
        Row: {
          duty_date: string
        }
        Insert: {
          duty_date: string
        }
        Update: {
          duty_date?: string
        }
        Relationships: []
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
      staff_leaves: {
        Row: {
          created_at: string
          duty_date: string
          id: string
          institution_id: string
          leave_type: Database["public"]["Enums"]["staff_leave_type"]
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duty_date: string
          id?: string
          institution_id: string
          leave_type: Database["public"]["Enums"]["staff_leave_type"]
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duty_date?: string
          id?: string
          institution_id?: string
          leave_type?: Database["public"]["Enums"]["staff_leave_type"]
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leaves_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "general_off_balance_dynamic"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leaves_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
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
      cl_balance_dynamic: {
        Row: {
          institution_id: string | null
          remaining_days: number | null
          staff_id: string | null
          used_days: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cl_transactions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "cl_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "general_off_balance_dynamic"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "monthly_leave_summary"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "off_balance_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "smart_shift_priority"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cl_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_monthly_duty_summary"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      cl_balance_view: {
        Row: {
          name: string | null
          remaining_days: number | null
          staff_id: string | null
          used_days: number | null
          yearly_quota: number | null
        }
        Relationships: []
      }
      general_off_balance_dynamic: {
        Row: {
          institution_id: string | null
          remaining_balance: number | null
          staff_id: string | null
          total_earned: number | null
          total_used: number | null
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
      monthly_clean_pdf: {
        Row: {
          cl_remaining: number | null
          name: string | null
          off_balance: number | null
        }
        Relationships: []
      }
      monthly_leave_pdf: {
        Row: {
          cl_remaining: number | null
          name: string | null
          off_balance: number | null
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
      monthly_report_print: {
        Row: {
          cl_remaining: number | null
          cl_used: number | null
          header_line_1: string | null
          header_line_2: string | null
          month: string | null
          name: string | null
          off_balance: number | null
          off_earned: number | null
          off_used: number | null
        }
        Relationships: []
      }
      monthly_roster_grid: {
        Row: {
          duty_date: string | null
          evening_staff: string | null
          leave_staff: string | null
          morning_staff: string | null
          night_staff: string | null
        }
        Relationships: []
      }
      off_balance_view: {
        Row: {
          name: string | null
          off_balance: number | null
          staff_id: string | null
        }
        Relationships: []
      }
      printable_leave_statement: {
        Row: {
          cl_remaining: number | null
          header: string | null
          holiday_date: string | null
          holiday_type: string | null
          name: string | null
          off_balance: number | null
        }
        Relationships: []
      }
      roster_pdf_view: {
        Row: {
          duty_date: string | null
          duty_note: string | null
          is_extra: boolean | null
          name: string | null
          shift: Database["public"]["Enums"]["roster_shift"] | null
        }
        Relationships: []
      }
      roster_selected_pdf: {
        Row: {
          duty_date: string | null
          evening_staff: string | null
          leave_staff: string | null
          morning_staff: string | null
          night_staff: string | null
        }
        Relationships: []
      }
      smart_shift_priority: {
        Row: {
          duty_count: number | null
          id: string | null
          name: string | null
        }
        Relationships: []
      }
      staff_detailed_pdf: {
        Row: {
          holiday_date: string | null
          holiday_type: string | null
          leave_label: string | null
          name: string | null
        }
        Relationships: []
      }
      staff_holiday_view: {
        Row: {
          holiday_date: string | null
          holiday_type: string | null
          name: string | null
        }
        Relationships: []
      }
      staff_leave_history: {
        Row: {
          date: string | null
          name: string | null
          staff_id: string | null
          type: string | null
        }
        Relationships: []
      }
      staff_leave_statement: {
        Row: {
          cl_remaining: number | null
          holiday_date: string | null
          holiday_type: string | null
          name: string | null
          off_balance: number | null
        }
        Relationships: []
      }
      staff_monthly_duty_summary: {
        Row: {
          evening_count: number | null
          month: string | null
          morning_count: number | null
          name: string | null
          night_count: number | null
          staff_id: string | null
          total_duties: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _date_range_days_inclusive: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      get_my_institution_id: { Args: never; Returns: string }
      get_single_staff_summary: {
        Args: { p_staff_id: string }
        Returns: {
          cl_remaining: number
          name: string
          off_balance: number
        }[]
      }
      get_staff_leave_between: {
        Args: { end_date: string; start_date: string }
        Returns: {
          holiday_date: string
          holiday_type: string
          name: string
        }[]
      }
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
      roster_visual_leave_type:
        | "others"
        | "earned_leave"
        | "casual_leave"
        | "week_off"
        | "govt_holiday"
        | "none"
      staff_leave_type: "casual" | "off_use" | "general_off" | "government"
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
      roster_visual_leave_type: [
        "others",
        "earned_leave",
        "casual_leave",
        "week_off",
        "govt_holiday",
        "none",
      ],
      staff_leave_type: ["casual", "off_use", "general_off", "government"],
    },
  },
} as const
