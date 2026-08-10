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
      question_mistakes: {
        Row: {
          chapter: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          last_answer: string | null
          last_wrong_at: string
          major_topic: string
          question_id: string
          resolved: boolean
          subject: Database["public"]["Enums"]["neet_subject"]
          times_correct: number
          times_wrong: number
          user_id: string
        }
        Insert: {
          chapter: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          last_answer?: string | null
          last_wrong_at?: string
          major_topic?: string
          question_id: string
          resolved?: boolean
          subject: Database["public"]["Enums"]["neet_subject"]
          times_correct?: number
          times_wrong?: number
          user_id: string
        }
        Update: {
          chapter?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          last_answer?: string | null
          last_wrong_at?: string
          major_topic?: string
          question_id?: string
          resolved?: boolean
          subject?: Database["public"]["Enums"]["neet_subject"]
          times_correct?: number
          times_wrong?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_mistakes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          chapter: string
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id: string
          image_url: string | null
          is_pyq: boolean
          major_topic: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          rand: number
          subject: Database["public"]["Enums"]["neet_subject"]
          updated_at: string
        }
        Insert: {
          chapter: string
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string
          id?: string
          image_url?: string | null
          is_pyq?: boolean
          major_topic?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          rand?: number
          subject: Database["public"]["Enums"]["neet_subject"]
          updated_at?: string
        }
        Update: {
          chapter?: string
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string
          id?: string
          image_url?: string | null
          is_pyq?: boolean
          major_topic?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          rand?: number
          subject?: Database["public"]["Enums"]["neet_subject"]
          updated_at?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          auto_submitted: boolean
          correct: number
          created_at: string
          id: string
          max_score: number
          percentage: number
          score: number
          subject_breakdown: Json
          submission: Json | null
          submitted_at: string
          timing: string
          title: string
          total_questions: number
          total_time_seconds: number
          unanswered: number
          user_id: string
          wrong: number
        }
        Insert: {
          auto_submitted?: boolean
          correct: number
          created_at?: string
          id?: string
          max_score: number
          percentage: number
          score: number
          subject_breakdown?: Json
          submission?: Json | null
          submitted_at?: string
          timing?: string
          title: string
          total_questions: number
          total_time_seconds: number
          unanswered: number
          user_id: string
          wrong: number
        }
        Update: {
          auto_submitted?: boolean
          correct?: number
          created_at?: string
          id?: string
          max_score?: number
          percentage?: number
          score?: number
          subject_breakdown?: Json
          submission?: Json | null
          submitted_at?: string
          timing?: string
          title?: string
          total_questions?: number
          total_time_seconds?: number
          unanswered?: number
          user_id?: string
          wrong?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_questions: {
        Args: {
          _chapter?: string
          _difficulty?: string
          _pyq_only?: boolean
          _search?: string
          _subject?: string
          _topic?: string
        }
        Returns: number
      }
      count_questions_capped: {
        Args: {
          _cap?: number
          _chapter?: string
          _difficulty?: string
          _pyq_only?: boolean
          _search?: string
          _subject?: string
          _topic?: string
        }
        Returns: {
          capped: boolean
          total: number
        }[]
      }
      estimate_questions: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_chapters: {
        Args: { _subject?: string }
        Returns: {
          chapter: string
          question_count: number
        }[]
      }
      list_topics: {
        Args: { _chapter?: string; _subject?: string }
        Returns: {
          major_topic: string
          question_count: number
        }[]
      }
      record_mistake_corrections: {
        Args: { _question_ids: string[] }
        Returns: undefined
      }
      record_mistakes: { Args: { _items: Json }; Returns: undefined }
      sample_questions: {
        Args: {
          _chapter?: string
          _difficulty?: string
          _limit?: number
          _pyq_only?: boolean
          _subject?: string
          _topic?: string
        }
        Returns: {
          chapter: string
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id: string
          image_url: string | null
          is_pyq: boolean
          major_topic: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          rand: number
          subject: Database["public"]["Enums"]["neet_subject"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      sample_questions_fast: {
        Args: {
          _chapter?: string
          _difficulty?: string
          _limit?: number
          _pyq_only?: boolean
          _subject?: string
          _topic?: string
        }
        Returns: {
          chapter: string
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id: string
          image_url: string | null
          is_pyq: boolean
          major_topic: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          rand: number
          subject: Database["public"]["Enums"]["neet_subject"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_questions: {
        Args: {
          _chapter?: string
          _difficulty?: string
          _limit?: number
          _offset?: number
          _pyq_only?: boolean
          _search?: string
          _subject?: string
          _topic?: string
        }
        Returns: {
          chapter: string
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id: string
          image_url: string | null
          is_pyq: boolean
          major_topic: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          rand: number
          subject: Database["public"]["Enums"]["neet_subject"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_questions_keyset: {
        Args: {
          _after_created_at?: string
          _after_id?: string
          _chapter?: string
          _difficulty?: string
          _limit?: number
          _pyq_only?: boolean
          _search?: string
          _subject?: string
          _topic?: string
        }
        Returns: {
          chapter: string
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id: string
          image_url: string | null
          is_pyq: boolean
          major_topic: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          rand: number
          subject: Database["public"]["Enums"]["neet_subject"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      weak_areas: {
        Args: { _limit?: number }
        Returns: {
          chapter: string
          major_topic: string
          mistakes: number
          questions: number
          subject: string
        }[]
      }
    }
    Enums: {
      app_role: "admin"
      difficulty_level: "Easy" | "Medium" | "Hard"
      neet_subject: "Physics" | "Chemistry" | "Botany" | "Zoology"
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
      app_role: ["admin"],
      difficulty_level: ["Easy", "Medium", "Hard"],
      neet_subject: ["Physics", "Chemistry", "Botany", "Zoology"],
    },
  },
} as const
