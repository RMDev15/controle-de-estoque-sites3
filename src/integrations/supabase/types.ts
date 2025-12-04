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
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantidade: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          alerta_cor: Database["public"]["Enums"]["alert_color"] | null
          codigo: string
          created_at: string | null
          created_by: string | null
          data_criacao: string | null
          data_prevista_entrega: string | null
          id: string
          prazo_entrega_dias: number | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string | null
        }
        Insert: {
          alerta_cor?: Database["public"]["Enums"]["alert_color"] | null
          codigo: string
          created_at?: string | null
          created_by?: string | null
          data_criacao?: string | null
          data_prevista_entrega?: string | null
          id?: string
          prazo_entrega_dias?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string | null
        }
        Update: {
          alerta_cor?: Database["public"]["Enums"]["alert_color"] | null
          codigo?: string
          created_at?: string | null
          created_by?: string | null
          data_criacao?: string | null
          data_prevista_entrega?: string | null
          id?: string
          prazo_entrega_dias?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      products: {
        Row: {
          codigo: string
          codigo_barras: string | null
          cor: string | null
          created_at: string | null
          estoque_atual: number
          estoque_baixo: boolean | null
          fornecedor: string | null
          foto_url: string | null
          id: string
          markup: number | null
          nome: string
          updated_at: string | null
          valor_unitario: number
          valor_venda: number
        }
        Insert: {
          codigo: string
          codigo_barras?: string | null
          cor?: string | null
          created_at?: string | null
          estoque_atual?: number
          estoque_baixo?: boolean | null
          fornecedor?: string | null
          foto_url?: string | null
          id?: string
          markup?: number | null
          nome: string
          updated_at?: string | null
          valor_unitario: number
          valor_venda: number
        }
        Update: {
          codigo?: string
          codigo_barras?: string | null
          cor?: string | null
          created_at?: string | null
          estoque_atual?: number
          estoque_baixo?: boolean | null
          fornecedor?: string | null
          foto_url?: string | null
          id?: string
          markup?: number | null
          nome?: string
          updated_at?: string | null
          valor_unitario?: number
          valor_venda?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome: string
          permissoes: Json | null
          senha_temporaria: boolean | null
          tipo_acesso: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nome: string
          permissoes?: Json | null
          senha_temporaria?: boolean | null
          tipo_acesso?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          permissoes?: Json | null
          senha_temporaria?: boolean | null
          tipo_acesso?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantidade: number
          sale_id: string
          subtotal: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantidade: number
          sale_id: string
          subtotal: number
          valor_unitario: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantidade?: number
          sale_id?: string
          subtotal?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          codigo: string
          created_at: string | null
          created_by: string | null
          data_venda: string | null
          id: string
          total: number
        }
        Insert: {
          codigo: string
          created_at?: string | null
          created_by?: string | null
          data_venda?: string | null
          id?: string
          total: number
        }
        Update: {
          codigo?: string
          created_at?: string | null
          created_by?: string | null
          data_venda?: string | null
          id?: string
          total?: number
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          created_at: string | null
          id: string
          nivel_amarelo_max: number
          nivel_amarelo_min: number
          nivel_verde_max: number
          nivel_verde_min: number
          nivel_vermelho_max: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nivel_amarelo_max?: number
          nivel_amarelo_min?: number
          nivel_verde_max?: number
          nivel_verde_min?: number
          nivel_vermelho_max?: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nivel_amarelo_max?: number
          nivel_amarelo_min?: number
          nivel_verde_max?: number
          nivel_verde_min?: number
          nivel_vermelho_max?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          product_id: string
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id: string
          quantidade: number
          tipo: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id?: string
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_admin_role: { Args: { user_id: string }; Returns: boolean }
      has_permission: {
        Args: { permission_name: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_color: "verde" | "amarelo" | "vermelho" | "sem_cor"
      app_role: "admin" | "common"
      order_status:
        | "emitido"
        | "em_transito"
        | "devolvido"
        | "cancelado"
        | "recebido"
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
      alert_color: ["verde", "amarelo", "vermelho", "sem_cor"],
      app_role: ["admin", "common"],
      order_status: [
        "emitido",
        "em_transito",
        "devolvido",
        "cancelado",
        "recebido",
      ],
    },
  },
} as const
