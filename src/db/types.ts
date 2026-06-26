export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      glucose_entries: {
        Row: {
          created_at: string;
          date_time: string;
          food: string | null;
          glucose: number;
          id: string;
          notes: string | null;
          reading_type: Database["public"]["Enums"]["reading_type"];
          symptoms: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date_time?: string;
          food?: string | null;
          glucose: number;
          id?: string;
          notes?: string | null;
          reading_type: Database["public"]["Enums"]["reading_type"];
          symptoms?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date_time?: string;
          food?: string | null;
          glucose?: number;
          id?: string;
          notes?: string | null;
          reading_type?: Database["public"]["Enums"]["reading_type"];
          symptoms?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      insulin_entries: {
        Row: {
          created_at: string;
          entry_date: string;
          evening: number | null;
          id: string;
          lunch: number | null;
          morning: number | null;
          night: number | null;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entry_date: string;
          evening?: number | null;
          id?: string;
          lunch?: number | null;
          morning?: number | null;
          night?: number | null;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entry_date?: string;
          evening?: number | null;
          id?: string;
          lunch?: number | null;
          morning?: number | null;
          night?: number | null;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string | null;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          device_name: string | null;
          id: string;
          platform: string | null;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          platform?: string | null;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          platform?: string | null;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weight_entries: {
        Row: {
          created_at: string;
          entry_date: string;
          id: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          entry_date: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          entry_date?: string;
          id?: string;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
          weight_kg: number;
        };
        Relationships: [];
      };
      smart_scan_readings: {
        Row: {
          id: string;
          user_id: string;
          device_type: string;
          reading_date: string;
          reading_time: string;
          confidence: number;
          ocr_source: string;
          image_url: string | null;
          notes: string | null;
          sync_status: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_type: string;
          reading_date: string;
          reading_time: string;
          confidence: number;
          ocr_source: string;
          image_url?: string | null;
          notes?: string | null;
          sync_status?: string;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_type?: string;
          reading_date?: string;
          reading_time?: string;
          confidence?: number;
          ocr_source?: string;
          image_url?: string | null;
          notes?: string | null;
          sync_status?: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      smart_scan_training_samples: {
        Row: {
          id: string;
          user_id: string | null;
          device_type: string;
          brand: string;
          model: string;
          device_name: string | null;
          image_url: string;
          image_resolution: { width: number; height: number };
          display_bbox: { x: number; y: number; width: number; height: number };
          reading_bboxes: { [field: string]: { x: number; y: number; width: number; height: number } };
          actual_values: { [field: string]: number | string };
          units: { [field: string]: string } | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          device_type: string;
          brand: string;
          model: string;
          device_name?: string | null;
          image_url: string;
          image_resolution: { width: number; height: number };
          display_bbox: { x: number; y: number; width: number; height: number };
          reading_bboxes: { [field: string]: { x: number; y: number; width: number; height: number } };
          actual_values: { [field: string]: number | string };
          units?: { [field: string]: string } | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          device_type?: string;
          brand?: string;
          model?: string;
          device_name?: string | null;
          image_url?: string;
          image_resolution?: { width: number; height: number };
          display_bbox?: { x: number; y: number; width: number; height: number };
          reading_bboxes?: { [field: string]: { x: number; y: number; width: number; height: number } };
          actual_values?: { [field: string]: number | string };
          units?: { [field: string]: string } | null;
          created_at?: string;
        };
        Relationships: [];
      };
      smart_scan_feedback: {
        Row: {
          id: string;
          user_id: string | null;
          device_type: string;
          ocr_prediction: string;
          corrected_value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          device_type: string;
          ocr_prediction: string;
          corrected_value: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          device_type?: string;
          ocr_prediction?: string;
          corrected_value?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      reading_type: "BB" | "AB" | "BL" | "AL" | "BD" | "AD" | "BT" | "Fasting";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      reading_type: ["BB", "AB", "BL", "AL", "BD", "AD", "BT", "Fasting"],
    },
  },
} as const;
