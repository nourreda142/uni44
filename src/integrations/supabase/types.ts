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
      constraints: {
        Row: {
          constraint_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          weight: number | null
        }
        Insert: {
          constraint_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          weight?: number | null
        }
        Update: {
          constraint_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          weight?: number | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string | null
          department_id: string
          doctor_id: string | null
          id: string
          name: string
          ta_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          department_id: string
          doctor_id?: string | null
          id?: string
          name: string
          ta_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          department_id?: string
          doctor_id?: string | null
          id?: string
          name?: string
          ta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_ta_id_fkey"
            columns: ["ta_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          created_at: string | null
          department_id: string | null
          full_name: string
          id: string
          instructor_type: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          full_name: string
          id?: string
          instructor_type?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          full_name?: string
          id?: string
          instructor_type?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_code: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_code: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_code?: string
          user_id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string | null
          id: string
          name: string
          room_type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          id?: string
          name: string
          room_type?: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          capacity?: number
          created_at?: string | null
          id?: string
          name?: string
          room_type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          department_id: string | null
          group_id: string | null
          id: string
          section_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          group_id?: string | null
          id?: string
          section_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          group_id?: string | null
          id?: string
          section_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          created_at: string | null
          day: string
          end_time: string
          id: string
          slot_order: number
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day: string
          end_time: string
          id?: string
          slot_order: number
          start_time: string
        }
        Update: {
          created_at?: string | null
          day?: string
          end_time?: string
          id?: string
          slot_order?: number
          start_time?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          instructor_id: string | null
          room_id: string | null
          section_id: string
          time_slot_id: string | null
          timetable_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          room_id?: string | null
          section_id: string
          time_slot_id?: string | null
          timetable_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          instructor_id?: string | null
          room_id?: string | null
          section_id?: string
          time_slot_id?: string | null
          timetable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string
          fitness_score: number | null
          generation_count: number | null
          id: string
          is_approved: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id: string
          fitness_score?: number | null
          generation_count?: number | null
          id?: string
          is_approved?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string
          fitness_score?: number | null
          generation_count?: number | null
          id?: string
          is_approved?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetables_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      room_type: "lecture_hall" | "lab" | "seminar_room"
      user_role: "admin" | "staff" | "student"
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
      room_type: ["lecture_hall", "lab", "seminar_room"],
      user_role: ["admin", "staff", "student"],
    },
  },
} as const
