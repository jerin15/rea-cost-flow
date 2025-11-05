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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_sheet_items: {
        Row: {
          actual_quoted: number
          admin_chosen_actual_quoted: number | null
          admin_chosen_for_quotation: boolean | null
          admin_chosen_misc_cost: number | null
          admin_chosen_misc_supplier_id: string | null
          admin_chosen_rea_margin: number | null
          admin_chosen_supplier_cost: number | null
          admin_chosen_supplier_id: string | null
          admin_chosen_total_cost: number | null
          admin_quotation_notes: string | null
          admin_remarks: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_by_admin_a: boolean | null
          approved_by_admin_b: boolean | null
          cost_sheet_id: string
          created_at: string
          date: string
          id: string
          item: string
          item_number: number
          misc_cost: number | null
          misc_cost_type: string | null
          misc_description: string | null
          misc_qty: number | null
          misc_supplier_id: string | null
          misc_type: string | null
          qty: number
          rea_margin: number
          rea_margin_percentage: number | null
          supplier_cost: number
          supplier_id: string | null
          total_cost: number
          updated_at: string
        }
        Insert: {
          actual_quoted?: number
          admin_chosen_actual_quoted?: number | null
          admin_chosen_for_quotation?: boolean | null
          admin_chosen_misc_cost?: number | null
          admin_chosen_misc_supplier_id?: string | null
          admin_chosen_rea_margin?: number | null
          admin_chosen_supplier_cost?: number | null
          admin_chosen_supplier_id?: string | null
          admin_chosen_total_cost?: number | null
          admin_quotation_notes?: string | null
          admin_remarks?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by_admin_a?: boolean | null
          approved_by_admin_b?: boolean | null
          cost_sheet_id: string
          created_at?: string
          date: string
          id?: string
          item: string
          item_number: number
          misc_cost?: number | null
          misc_cost_type?: string | null
          misc_description?: string | null
          misc_qty?: number | null
          misc_supplier_id?: string | null
          misc_type?: string | null
          qty?: number
          rea_margin?: number
          rea_margin_percentage?: number | null
          supplier_cost?: number
          supplier_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Update: {
          actual_quoted?: number
          admin_chosen_actual_quoted?: number | null
          admin_chosen_for_quotation?: boolean | null
          admin_chosen_misc_cost?: number | null
          admin_chosen_misc_supplier_id?: string | null
          admin_chosen_rea_margin?: number | null
          admin_chosen_supplier_cost?: number | null
          admin_chosen_supplier_id?: string | null
          admin_chosen_total_cost?: number | null
          admin_quotation_notes?: string | null
          admin_remarks?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_by_admin_a?: boolean | null
          approved_by_admin_b?: boolean | null
          cost_sheet_id?: string
          created_at?: string
          date?: string
          id?: string
          item?: string
          item_number?: number
          misc_cost?: number | null
          misc_cost_type?: string | null
          misc_description?: string | null
          misc_qty?: number | null
          misc_supplier_id?: string | null
          misc_type?: string | null
          qty?: number
          rea_margin?: number
          rea_margin_percentage?: number | null
          supplier_cost?: number
          supplier_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_sheet_items_admin_chosen_misc_supplier_id_fkey"
            columns: ["admin_chosen_misc_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_sheet_items_admin_chosen_supplier_id_fkey"
            columns: ["admin_chosen_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_sheet_items_cost_sheet_id_fkey"
            columns: ["cost_sheet_id"]
            isOneToOne: false
            referencedRelation: "cost_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_sheet_items_misc_supplier_id_fkey"
            columns: ["misc_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_sheet_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_sheets: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_sheets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "estimator" | "admin"
      approval_status:
        | "pending"
        | "approved_admin_a"
        | "approved_admin_b"
        | "approved_both"
        | "rejected"
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
      app_role: ["estimator", "admin"],
      approval_status: [
        "pending",
        "approved_admin_a",
        "approved_admin_b",
        "approved_both",
        "rejected",
      ],
    },
  },
} as const
