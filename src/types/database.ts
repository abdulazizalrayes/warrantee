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
      activity_log: {
        Row: {
          id: string
          actor_id: string | null
          entity_type: string
          entity_id: string
          action: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          entity_type: string
          entity_id: string
          action: string
          metadata?: Json | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      api_integration_tokens: {
        Row: {
          id: string
          user_id: string
          name: string
          token_prefix: string
          token_hash: string
          scopes: string[]
          rate_limit_per_minute: number
          last_used_at: string | null
          expires_at: string
          revoked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          token_prefix: string
          token_hash: string
          scopes?: string[]
          rate_limit_per_minute?: number
          last_used_at?: string | null
          expires_at?: string
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          scopes?: string[]
          rate_limit_per_minute?: number
          last_used_at?: string | null
          expires_at?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      api_usage_events: {
        Row: {
          id: string
          user_id: string
          token_id: string | null
          credential_kind: string
          method: string
          path: string
          status_code: number
          scope: string | null
          ip_hash: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token_id?: string | null
          credential_kind: string
          method: string
          path: string
          status_code: number
          scope?: string | null
          ip_hash?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          company_id: string | null
          company_name: string | null
          company_domain: string | null
          account_type: string | null
          onboarding_completed: boolean | null
          preferred_locale: string | null
          preferred_language: string
          email_notifications: boolean | null
          push_notifications: boolean | null
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
          company_id?: string | null
          company_name?: string | null
          company_domain?: string | null
          account_type?: string | null
          onboarding_completed?: boolean | null
          preferred_locale?: string | null
          preferred_language?: string
          email_notifications?: boolean | null
          push_notifications?: boolean | null
          role?: string
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          company_id?: string | null
          company_name?: string | null
          company_domain?: string | null
          account_type?: string | null
          onboarding_completed?: boolean | null
          preferred_locale?: string | null
          preferred_language?: string
          email_notifications?: boolean | null
          push_notifications?: boolean | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          trial_start: string | null
          trial_end: string | null
          cancel_at_period_end: boolean
          warranty_limit: number
          team_limit: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          warranty_limit?: number
          team_limit?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          warranty_limit?: number
          team_limit?: number
          metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      warranties: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          product_name: string
          product_name_ar: string | null
          product_category: string | null
          brand: string | null
          model_number: string | null
          sku: string | null
          serial_number: string | null
          purchase_date: string
          start_date: string | null
          end_date: string | null
          warranty_start_date: string
          warranty_end_date: string
          warranty_type: string
          warranty_provider: string | null
          reference_number: string | null
          seller_name: string | null
          created_by: string | null
          recipient_user_id: string | null
          purchase_price: number | null
          currency: string
          retailer: string | null
          notes: string | null
          is_self_registered: boolean | null
          source: string | null
          ingestion_job_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: string
          product_name: string
          product_name_ar?: string | null
          purchase_date?: string
          start_date?: string | null
          end_date?: string | null
          warranty_start_date?: string
          warranty_end_date?: string
          warranty_type?: string
          product_category?: string | null
          brand?: string | null
          model_number?: string | null
          sku?: string | null
          serial_number?: string | null
          warranty_provider?: string | null
          reference_number?: string | null
          seller_name?: string | null
          created_by?: string | null
          recipient_user_id?: string | null
          purchase_price?: number | null
          currency?: string
          retailer?: string | null
          notes?: string | null
          is_self_registered?: boolean | null
          source?: string | null
          ingestion_job_id?: string | null
          status?: string
          company_id?: string | null
        }
        Update: {
          product_name?: string
          product_name_ar?: string | null
          product_category?: string | null
          brand?: string | null
          model_number?: string | null
          sku?: string | null
          serial_number?: string | null
          start_date?: string | null
          end_date?: string | null
          warranty_end_date?: string
          warranty_provider?: string | null
          reference_number?: string | null
          seller_name?: string | null
          created_by?: string | null
          recipient_user_id?: string | null
          purchase_price?: number | null
          retailer?: string | null
          notes?: string | null
          is_self_registered?: boolean | null
          source?: string | null
          ingestion_job_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingestion_jobs: {
        Row: {
          id: string
          message_id: string
          from_email: string
          from_name: string | null
          to_email: string
          cc_emails: string[] | null
          subject: string
          text_body: string | null
          html_body: string | null
          status: string
          attachment_count: number
          raw_payload: Json | null
          ip_address: string | null
          matched_user_id: string | null
          trust_level: string | null
          trust_score: number | null
          error_message: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          message_id: string
          from_email: string
          from_name?: string | null
          to_email: string
          cc_emails?: string[] | null
          subject?: string
          text_body?: string | null
          html_body?: string | null
          status?: string
          attachment_count?: number
          raw_payload?: Json | null
          ip_address?: string | null
          matched_user_id?: string | null
          trust_level?: string | null
          trust_score?: number | null
          error_message?: string | null
          processed_at?: string | null
        }
        Update: {
          matched_user_id?: string | null
          trust_level?: string | null
          trust_score?: number | null
          status?: string
          error_message?: string | null
          processed_at?: string | null
        }
        Relationships: []
      }
      ingestion_attachments: {
        Row: {
          id: string
          ingestion_job_id: string
          filename: string
          content_type: string
          file_size: number
          file_hash: string
          storage_path: string
          ocr_status: string
          ocr_raw_text: string | null
          ocr_language_detected: string | null
          ocr_word_confidence: number | null
          extracted_fields: Json | null
          aggregate_confidence: number | null
          sim_hash: string | null
          warranty_id: string | null
          processed_at: string | null
        }
        Insert: {
          ingestion_job_id: string
          filename: string
          content_type: string
          file_size: number
          file_hash: string
          storage_path: string
          ocr_status?: string
        }
        Update: {
          ocr_status?: string
          ocr_raw_text?: string | null
          ocr_language_detected?: string | null
          ocr_word_confidence?: number | null
          extracted_fields?: Json | null
          aggregate_confidence?: number | null
          sim_hash?: string | null
          warranty_id?: string | null
          processed_at?: string | null
        }
        Relationships: []
      }
      provisional_warranties: {
        Row: {
          id: string
          ingestion_job_id: string | null
          attachment_id: string | null
          user_id: string
          product_name: string | null
          brand: string | null
          model_number: string | null
          serial_number: string | null
          warranty_duration_months: number | null
          purchase_date: string | null
          expiry_date: string | null
          seller_name: string | null
          confidence_score: number | null
          needs_input_fields: string[] | null
          status: string | null
        }
        Insert: {
          ingestion_job_id?: string | null
          attachment_id?: string | null
          user_id: string
          product_name?: string | null
          brand?: string | null
          model_number?: string | null
          serial_number?: string | null
          warranty_duration_months?: number | null
          purchase_date?: string | null
          expiry_date?: string | null
          seller_name?: string | null
          confidence_score?: number | null
          needs_input_fields?: string[] | null
          status?: string | null
        }
        Update: {
          status?: string | null
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          id: string
          ingestion_job_id: string
          attachment_id: string | null
          signal_type: string
          severity: string
          details: Json | null
        }
        Insert: {
          ingestion_job_id: string
          attachment_id?: string | null
          signal_type: string
          severity: string
          details?: Json | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      webhook_events: {
        Row: {
          id: string
          event_id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          processed_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      warranty_extensions: {
        Row: {
          id: string
          warranty_id: string
          new_end_date: string
          is_purchased: boolean | null
          purchased_by: string | null
          purchased_at: string | null
        }
        Insert: {
          warranty_id: string
          new_end_date: string
          is_purchased?: boolean | null
          purchased_by?: string | null
          purchased_at?: string | null
        }
        Update: {
          is_purchased?: boolean | null
          purchased_by?: string | null
          purchased_at?: string | null
        }
        Relationships: []
      }
      warranty_coverage_items: {
        Row: {
          id: string
          warranty_id: string
          component_name: string
          component_name_ar: string | null
          coverage_type: string
          start_date: string | null
          end_date: string | null
          start_value: number | null
          end_value: number | null
          unit: string | null
          exclusions: string | null
          exclusions_ar: string | null
          is_active: boolean
          sort_order: number
        }
        Insert: {
          warranty_id: string
          component_name: string
          component_name_ar?: string | null
          coverage_type: string
          start_date?: string | null
          end_date?: string | null
          start_value?: number | null
          end_value?: number | null
          unit?: string | null
          exclusions?: string | null
          exclusions_ar?: string | null
          sort_order?: number
        }
        Update: Record<string, never>
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_type: string
          p_max_requests: number
          p_window_minutes: number
        }
        Returns: boolean
      }
      get_user_dashboard_stats: {
        Args: {
          user_uuid: string
        }
        Returns: Json
      }
      get_expiring_warranties: {
        Args: {
          days_ahead?: number
        }
        Returns: Database["public"]["Tables"]["warranties"]["Row"][]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
