export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      queue_stages: {
        Row: {
          id: string
          name: string
          display_name: string
          order_number: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          order_number: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          order_number?: number
          is_active?: boolean
          created_at?: string
        }
      }
      emergency_flags: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          phone_number: string
          full_name: string
          age: number | null
          visit_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone_number: string
          full_name: string
          age?: number | null
          visit_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          full_name?: string
          age?: number | null
          visit_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      queue_entries: {
        Row: {
          id: string
          patient_id: string
          current_stage_id: string | null
          queue_number: string
          position_in_queue: number | null
          has_emergency_flag: boolean
          status: string
          checked_in_at: string
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          current_stage_id?: string | null
          queue_number?: string
          position_in_queue?: number | null
          has_emergency_flag?: boolean
          status?: string
          checked_in_at?: string
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          current_stage_id?: string | null
          queue_number?: string
          position_in_queue?: number | null
          has_emergency_flag?: boolean
          status?: string
          checked_in_at?: string
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      queue_history: {
        Row: {
          id: string
          queue_entry_id: string
          stage_id: string
          entered_at: string
          exited_at: string | null
          served_by_user_id: string | null
        }
        Insert: {
          id?: string
          queue_entry_id: string
          stage_id: string
          entered_at?: string
          exited_at?: string | null
          served_by_user_id?: string | null
        }
        Update: {
          id?: string
          queue_entry_id?: string
          stage_id?: string
          entered_at?: string
          exited_at?: string | null
          served_by_user_id?: string | null
        }
      }
      patient_emergency_flags: {
        Row: {
          id: string
          queue_entry_id: string
          emergency_flag_id: string
          noted_by_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          queue_entry_id: string
          emergency_flag_id: string
          noted_by_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          queue_entry_id?: string
          emergency_flag_id?: string
          noted_by_user_id?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          department: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          department?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          department?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      sms_logs: {
        Row: {
          id: string
          patient_id: string | null
          queue_entry_id: string | null
          phone_number: string
          message: string
          status: string
          twilio_sid: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          patient_id?: string | null
          queue_entry_id?: string | null
          phone_number: string
          message: string
          status?: string
          twilio_sid?: string | null
          sent_at?: string
        }
        Update: {
          id?: string
          patient_id?: string | null
          queue_entry_id?: string | null
          phone_number?: string
          message?: string
          status?: string
          twilio_sid?: string | null
          sent_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
