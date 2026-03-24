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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          preferred_language: string
          role: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          preferred_language?: string
          role?: string
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          preferred_language?: string
          avatar_url?: string | null
        }
      }
      warranties: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          product_name: string
          product_category: string | null
          brand: string | null
          model_number: string | null
          serial_number: string | null
          purchase_date: string
          warranty_start_date: string
          warranty_end_date: string
          warranty_type: string
          warranty_provider: string | null
          purchase_price: number | null
          currency: string
          retailer: string | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          product_name: string
          purchase_date: string
          warranty_start_date: string
          warranty_end_date: string
          warranty_type?: string
          product_category?: string | null
          brand?: string | null
          model_number?: string | null
          serial_number?: string | null
          warranty_provider?: string | null
          purchase_price?: number | null
          currency?: string
          retailer?: string | null
          notes?: string | null
          status?: string
          company_id?: string | null
        }
        Update: {
          product_name?: string
          product_category?: string | null
          brand?: string | null
          model_number?: string | null
          serial_number?: string | null
          warranty_end_date?: string
          warranty_provider?: string | null
          purchase_price?: number | null
          retailer?: string | null
          notes?: string | null
          status?: string
        }
      }
      warranty_claims: {
        Row: {
          id: string
          warranty_id: string
          user_id: string
          claim_type: string
          description: string
          status: string
          resolution: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          warranty_id: string
          user_id: string
          claim_type: string
          description: string
          status?: string
        }
        Update: {
          status?: string
          resolution?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          warranty_id: string | null
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          warranty_id?: string | null
          type: string
          title: string
          message: string
        }
        Update: {
          read?: boolean
        }
      }
    }
  }
}
