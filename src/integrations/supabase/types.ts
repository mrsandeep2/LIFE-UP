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
      application_events: {
        Row: {
          application_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          occurred_at: string
          to_status: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          to_status?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          to_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_on: string | null
          company: string
          created_at: string
          id: string
          image_url: string | null
          internship_type: string | null
          link: string | null
          location: string | null
          notes: string | null
          role: string
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_on?: string | null
          company: string
          created_at?: string
          id?: string
          image_url?: string | null
          internship_type?: string | null
          link?: string | null
          location?: string | null
          notes?: string | null
          role: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_on?: string | null
          company?: string
          created_at?: string
          id?: string
          image_url?: string | null
          internship_type?: string | null
          link?: string | null
          location?: string | null
          notes?: string | null
          role?: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          actual_minutes: number
          completed_naturally: boolean
          created_at: string
          ended_at: string | null
          id: string
          planned_minutes: number
          started_at: string
          task_id: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          actual_minutes?: number
          completed_naturally?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes: number
          started_at?: string
          task_id?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          actual_minutes?: number
          completed_naturally?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          started_at?: string
          task_id?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_on: string
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_on?: string
          created_at?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_on?: string
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_freezes: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          used_on: string
          user_id: string
          week_of: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          used_on?: string
          user_id: string
          week_of: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          used_on?: string
          user_id?: string
          week_of?: string
        }
        Relationships: []
      }
      habits: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_events: {
        Row: {
          application_id: string
          created_at: string
          duration_minutes: number
          id: string
          kind: string
          location: string | null
          notes: string | null
          outcome: string | null
          scheduled_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          career_enabled: boolean
          created_at: string
          email_enabled: boolean
          enabled: boolean
          habit_reminder_time: string
          habits_enabled: boolean
          interviews_enabled: boolean
          push_enabled: boolean
          push_subscription: Json | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          tasks_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          career_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          enabled?: boolean
          habit_reminder_time?: string
          habits_enabled?: boolean
          interviews_enabled?: boolean
          push_enabled?: boolean
          push_subscription?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tasks_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          career_enabled?: boolean
          created_at?: string
          email_enabled?: boolean
          enabled?: boolean
          habit_reminder_time?: string
          habits_enabled?: boolean
          interviews_enabled?: boolean
          push_enabled?: boolean
          push_subscription?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tasks_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          channels_sent: string[]
          created_at: string
          dedup_key: string
          delivered_at: string | null
          dismissed_at: string | null
          id: string
          meta: Json
          priority: string
          read_at: string | null
          related_id: string | null
          related_kind: string | null
          title: string
          trigger_at: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          channels_sent?: string[]
          created_at?: string
          dedup_key: string
          delivered_at?: string | null
          dismissed_at?: string | null
          id?: string
          meta?: Json
          priority?: string
          read_at?: string | null
          related_id?: string | null
          related_kind?: string | null
          title: string
          trigger_at?: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          channels_sent?: string[]
          created_at?: string
          dedup_key?: string
          delivered_at?: string | null
          dismissed_at?: string | null
          id?: string
          meta?: Json
          priority?: string
          read_at?: string | null
          related_id?: string | null
          related_kind?: string | null
          title?: string
          trigger_at?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_key: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          dob: string | null
          gender: string | null
          id: string
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          avatar_key?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          gender?: string | null
          id: string
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          avatar_key?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          gender?: string | null
          id?: string
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          id: string
          minutes: number
          notes: string | null
          studied_on: string
          subject_id: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minutes: number
          notes?: string | null
          studied_on?: string
          subject_id: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          notes?: string | null
          studied_on?: string
          subject_id?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          exam_date: string | null
          id: string
          name: string
          target_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          exam_date?: string | null
          id?: string
          name: string
          target_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          exam_date?: string | null
          id?: string
          name?: string
          target_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          est_minutes: number | null
          id: string
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          est_minutes?: number | null
          id?: string
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          est_minutes?: number | null
          id?: string
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          confidence: number
          created_at: string
          id: string
          position: number
          status: string
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          position?: number
          status?: string
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          position?: number
          status?: string
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          blockers: string | null
          change: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          week_of: string
          went_well: string | null
        }
        Insert: {
          blockers?: string | null
          change?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          week_of: string
          went_well?: string | null
        }
        Update: {
          blockers?: string | null
          change?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          week_of?: string
          went_well?: string | null
        }
        Relationships: []
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
