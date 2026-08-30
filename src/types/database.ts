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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_state: Json | null
          performed_by: string | null
          previous_state: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_state?: Json | null
          performed_by?: string | null
          previous_state?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_state?: Json | null
          performed_by?: string | null
          previous_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_state: Json | null
          previous_state: Json | null
          risk_level: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_state?: Json | null
          previous_state?: Json | null
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_state?: Json | null
          previous_state?: Json | null
          risk_level?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          permissions: Json | null
          revoked_at: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          permissions?: Json | null
          revoked_at?: string | null
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          permissions?: Json | null
          revoked_at?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          admin_id: string
          device_fingerprint: string | null
          end_reason: string | null
          ended_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_active_at: string
          session_token: string
          started_at: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          device_fingerprint?: string | null
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active_at?: string
          session_token?: string
          started_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          device_fingerprint?: string | null
          end_reason?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_active_at?: string
          session_token?: string
          started_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_concierge_questions: {
        Row: {
          answer_status: string
          citations: Json
          client_class: string
          created_at: string
          fit: boolean
          id: string
          improvement_tags: string[]
          intent: string
          locale: string
          question_hash: string
          question_redacted: string
          redaction_applied: boolean
          source_protocol: string
        }
        Insert: {
          answer_status: string
          citations?: Json
          client_class?: string
          created_at?: string
          fit: boolean
          id?: string
          improvement_tags?: string[]
          intent: string
          locale: string
          question_hash: string
          question_redacted: string
          redaction_applied?: boolean
          source_protocol: string
        }
        Update: {
          answer_status?: string
          citations?: Json
          client_class?: string
          created_at?: string
          fit?: boolean
          id?: string
          improvement_tags?: string[]
          intent?: string
          locale?: string
          question_hash?: string
          question_redacted?: string
          redaction_applied?: boolean
          source_protocol?: string
        }
        Relationships: []
      }
      analytics_daily_rollups: {
        Row: {
          api_requests: number
          claims_created: number
          company_id: string | null
          company_scope_key: string | null
          created_at: string
          day: string
          extension_requests: number
          id: number
          owner_user_id: string
          passport_views: number
          updated_at: string
          warranties_created: number
        }
        Insert: {
          api_requests?: number
          claims_created?: number
          company_id?: string | null
          company_scope_key?: string | null
          created_at?: string
          day: string
          extension_requests?: number
          id?: never
          owner_user_id: string
          passport_views?: number
          updated_at?: string
          warranties_created?: number
        }
        Update: {
          api_requests?: number
          claims_created?: number
          company_id?: string | null
          company_scope_key?: string | null
          created_at?: string
          day?: string
          extension_requests?: number
          id?: never
          owner_user_id?: string
          passport_views?: number
          updated_at?: string
          warranties_created?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_rollups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_clients: {
        Row: {
          company_id: string | null
          created_at: string
          environment: string
          id: string
          name: string
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          environment?: string
          id?: string
          name: string
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          environment?: string
          id?: string
          name?: string
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_idempotency_records: {
        Row: {
          client_id: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          method: string
          path: string
          request_hash: string
          resource_id: string | null
          resource_type: string | null
          response_status: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          method: string
          path: string
          request_hash: string
          resource_id?: string | null
          resource_type?: string | null
          response_status?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          method?: string
          path?: string
          request_hash?: string
          resource_id?: string | null
          resource_type?: string | null
          response_status?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_idempotency_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integration_tokens: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          expires_at: string
          id: string
          last_used_at: string | null
          name: string
          rate_limit_per_minute: number
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          token_prefix: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_integration_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_integration_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_events: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          credential_kind: string
          id: string
          ip_hash: string | null
          metadata: Json
          method: string
          path: string
          scope: string | null
          status_code: number
          token_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          credential_kind: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          method: string
          path: string
          scope?: string | null
          status_code: number
          token_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          credential_kind?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          method?: string
          path?: string
          scope?: string | null
          status_code?: number
          token_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_events_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "api_integration_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_lifecycle_events: {
        Row: {
          actor_id: string | null
          claim_id: string | null
          company_id: string | null
          confidence: number | null
          created_at: string
          event_type: string
          evidence_type: string
          id: string
          metadata: Json
          occurred_at: string
          provenance: string
          warranty_id: string
        }
        Insert: {
          actor_id?: string | null
          claim_id?: string | null
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          event_type: string
          evidence_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          provenance?: string
          warranty_id: string
        }
        Update: {
          actor_id?: string | null
          claim_id?: string | null
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          event_type?: string
          evidence_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          provenance?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_lifecycle_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_lifecycle_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_lifecycle_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_lifecycle_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_lifecycle_events_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      async_jobs: {
        Row: {
          attempts: number
          available_at: string
          company_id: string | null
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          idempotency_key: string | null
          job_type: string
          last_error_at: string | null
          last_error_code: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          owner_user_id: string | null
          payload: Json
          priority: number
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          idempotency_key?: string | null
          job_type: string
          last_error_at?: string | null
          last_error_code?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          owner_user_id?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          idempotency_key?: string | null
          job_type?: string
          last_error_at?: string | null
          last_error_code?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          owner_user_id?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "async_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_attachments: {
        Row: {
          claim_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_attachments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_attachments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_events: {
        Row: {
          claim_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          archived_at: string | null
          city: string | null
          company_role: Database["public"]["Enums"]["company_role"]
          country: string
          cr_number: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_archived: boolean | null
          is_verified: boolean
          logo_url: string | null
          name: string
          name_ar: string | null
          phone: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          company_role?: Database["public"]["Enums"]["company_role"]
          country?: string
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          is_verified?: boolean
          logo_url?: string | null
          name: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          company_role?: Database["public"]["Enums"]["company_role"]
          country?: string
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branches: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_main: boolean
          name: string
          name_ar: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          name: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          name?: string
          name_ar?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_primary: boolean
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["user_role"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          mobile: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          mobile?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          mobile?: string | null
          name?: string
        }
        Relationships: []
      }
      customer_feedback_events: {
        Row: {
          actor_id: string | null
          comment: string | null
          created_at: string
          id: string
          locale: string
          metadata: Json
          reason_code: string
          stage: string
          traffic_class: string
        }
        Insert: {
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          locale?: string
          metadata?: Json
          reason_code: string
          stage: string
          traffic_class?: string
        }
        Update: {
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          locale?: string
          metadata?: Json
          reason_code?: string
          stage?: string
          traffic_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ingestion: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          from_email: string
          id: string
          invitation_claimed_at: string | null
          invitation_sent_at: string | null
          is_seller_forwarded: boolean | null
          processed_at: string | null
          raw_email_url: string | null
          status: string
          subject: string | null
          user_id: string | null
          warranty_id: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          from_email: string
          id?: string
          invitation_claimed_at?: string | null
          invitation_sent_at?: string | null
          is_seller_forwarded?: boolean | null
          processed_at?: string | null
          raw_email_url?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
          warranty_id?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          from_email?: string
          id?: string
          invitation_claimed_at?: string | null
          invitation_sent_at?: string | null
          is_seller_forwarded?: boolean | null
          processed_at?: string | null
          raw_email_url?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_ingestion_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ingestion_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_signals: {
        Row: {
          assigned_to: string | null
          attachment_id: string | null
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          evidence: Json | null
          id: string
          ingestion_job_id: string | null
          related_entities: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          signal_type: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachment_id?: string | null
          created_at?: string
          description: string
          entity_id: string
          entity_type: string
          evidence?: Json | null
          id?: string
          ingestion_job_id?: string | null
          related_entities?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachment_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          evidence?: Json | null
          id?: string
          ingestion_job_id?: string | null
          related_entities?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          signal_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "ingestion_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_ingestion_job_id_fkey"
            columns: ["ingestion_job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_attachments: {
        Row: {
          aggregate_confidence: number | null
          content_type: string
          created_at: string | null
          extracted_fields: Json | null
          file_hash: string
          file_size: number
          filename: string
          id: string
          ingestion_job_id: string
          ocr_language_detected: string | null
          ocr_raw_text: string | null
          ocr_status: string | null
          ocr_word_confidence: number | null
          processed_at: string | null
          sensitive_ocr_redacted_at: string | null
          sim_hash: string | null
          sim_hash_bucket_1: string | null
          sim_hash_bucket_2: string | null
          sim_hash_bucket_3: string | null
          sim_hash_bucket_4: string | null
          storage_path: string
          warranty_id: string | null
        }
        Insert: {
          aggregate_confidence?: number | null
          content_type: string
          created_at?: string | null
          extracted_fields?: Json | null
          file_hash: string
          file_size: number
          filename: string
          id?: string
          ingestion_job_id: string
          ocr_language_detected?: string | null
          ocr_raw_text?: string | null
          ocr_status?: string | null
          ocr_word_confidence?: number | null
          processed_at?: string | null
          sensitive_ocr_redacted_at?: string | null
          sim_hash?: string | null
          sim_hash_bucket_1?: string | null
          sim_hash_bucket_2?: string | null
          sim_hash_bucket_3?: string | null
          sim_hash_bucket_4?: string | null
          storage_path: string
          warranty_id?: string | null
        }
        Update: {
          aggregate_confidence?: number | null
          content_type?: string
          created_at?: string | null
          extracted_fields?: Json | null
          file_hash?: string
          file_size?: number
          filename?: string
          id?: string
          ingestion_job_id?: string
          ocr_language_detected?: string | null
          ocr_raw_text?: string | null
          ocr_status?: string | null
          ocr_word_confidence?: number | null
          processed_at?: string | null
          sensitive_ocr_redacted_at?: string | null
          sim_hash?: string | null
          sim_hash_bucket_1?: string | null
          sim_hash_bucket_2?: string | null
          sim_hash_bucket_3?: string | null
          sim_hash_bucket_4?: string | null
          storage_path?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_attachments_ingestion_job_id_fkey"
            columns: ["ingestion_job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_attachments_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_audit_log: {
        Row: {
          action: string
          actor: string
          attachment_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ingestion_job_id: string | null
        }
        Insert: {
          action: string
          actor: string
          attachment_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ingestion_job_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          attachment_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ingestion_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_audit_log_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "ingestion_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_audit_log_ingestion_job_id_fkey"
            columns: ["ingestion_job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          attachment_count: number | null
          cc_emails: string[] | null
          created_at: string | null
          error_message: string | null
          from_email: string
          from_name: string | null
          html_body: string | null
          id: string
          ip_address: unknown
          matched_user_id: string | null
          message_id: string | null
          processed_at: string | null
          raw_payload: Json | null
          retry_count: number | null
          sensitive_payload_redacted_at: string | null
          status: string
          subject: string | null
          text_body: string | null
          to_email: string
          trust_level: string | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          attachment_count?: number | null
          cc_emails?: string[] | null
          created_at?: string | null
          error_message?: string | null
          from_email: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          ip_address?: unknown
          matched_user_id?: string | null
          message_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          retry_count?: number | null
          sensitive_payload_redacted_at?: string | null
          status?: string
          subject?: string | null
          text_body?: string | null
          to_email: string
          trust_level?: string | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          attachment_count?: number | null
          cc_emails?: string[] | null
          created_at?: string | null
          error_message?: string | null
          from_email?: string
          from_name?: string | null
          html_body?: string | null
          id?: string
          ip_address?: unknown
          matched_user_id?: string | null
          message_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          retry_count?: number | null
          sensitive_payload_redacted_at?: string | null
          status?: string
          subject?: string | null
          text_body?: string | null
          to_email?: string
          trust_level?: string | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ingestion_rate_limits: {
        Row: {
          id: string
          identifier: string
          identifier_type: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          id?: string
          identifier: string
          identifier_type: string
          request_count?: number | null
          window_start: string
        }
        Update: {
          id?: string
          identifier?: string
          identifier_type?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          body_ar: string | null
          claim_id: string | null
          created_at: string
          id: string
          is_email_sent: boolean
          is_read: boolean
          title: string
          title_ar: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          warranty_id: string | null
        }
        Insert: {
          action_url?: string | null
          body: string
          body_ar?: string | null
          claim_id?: string | null
          created_at?: string
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          title: string
          title_ar?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          warranty_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string
          body_ar?: string | null
          claim_id?: string | null
          created_at?: string
          id?: string
          is_email_sent?: boolean
          is_read?: boolean
          title?: string
          title_ar?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation_findings: {
        Row: {
          evidence: Json
          extension_id: string | null
          finding_type: string
          first_detected_at: string
          id: string
          last_detected_at: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          evidence?: Json
          extension_id?: string | null
          finding_type: string
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          evidence?: Json
          extension_id?: string | null
          finding_type?: string
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliation_findings_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "warranty_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string | null
          id: number
          occurred_at: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id?: string | null
          id?: never
          occurred_at?: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string | null
          id?: never
          occurred_at?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string
          email_notifications: boolean
          full_name: string
          id: string
          notify_claims: boolean
          notify_expiry: boolean
          notify_newsletter: boolean
          onboarding_completed: boolean | null
          phone: string | null
          preferred_language: string
          preferred_locale: string
          push_notifications: boolean
          role: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string
          email_notifications?: boolean
          full_name: string
          id: string
          notify_claims?: boolean
          notify_expiry?: boolean
          notify_newsletter?: boolean
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_language?: string
          preferred_locale?: string
          push_notifications?: boolean
          role?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string
          email_notifications?: boolean
          full_name?: string
          id?: string
          notify_claims?: boolean
          notify_expiry?: boolean
          notify_newsletter?: boolean
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_language?: string
          preferred_locale?: string
          push_notifications?: boolean
          role?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      provisional_warranties: {
        Row: {
          attachment_id: string | null
          brand: string | null
          confidence_score: number | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          expires_at: string | null
          expiry_date: string | null
          id: string
          ingestion_job_id: string | null
          model_number: string | null
          needs_input_fields: string[] | null
          product_name: string | null
          purchase_date: string | null
          seller_name: string | null
          serial_number: string | null
          status: string
          updated_at: string | null
          user_id: string | null
          warranty_duration_months: number | null
        }
        Insert: {
          attachment_id?: string | null
          brand?: string | null
          confidence_score?: number | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          expiry_date?: string | null
          id?: string
          ingestion_job_id?: string | null
          model_number?: string | null
          needs_input_fields?: string[] | null
          product_name?: string | null
          purchase_date?: string | null
          seller_name?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
          warranty_duration_months?: number | null
        }
        Update: {
          attachment_id?: string | null
          brand?: string | null
          confidence_score?: number | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          expiry_date?: string | null
          id?: string
          ingestion_job_id?: string | null
          model_number?: string | null
          needs_input_fields?: string[] | null
          product_name?: string | null
          purchase_date?: string | null
          seller_name?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
          warranty_duration_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provisional_warranties_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "ingestion_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisional_warranties_ingestion_job_id_fkey"
            columns: ["ingestion_job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recall_matches: {
        Row: {
          confidence: number
          created_at: string
          id: string
          match_basis: string
          recall_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          warranty_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          match_basis: string
          recall_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          warranty_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          match_basis?: string
          recall_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_matches_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "recall_notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_matches_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_matches_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_notices: {
        Row: {
          affected_countries: string[]
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          manufacturer: string
          model_number: string | null
          published_at: string | null
          recommended_action: string
          recommended_action_ar: string | null
          serial_prefix: string | null
          severity: string
          source_reference: string
          source_url: string | null
          source_verified_at: string | null
          status: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          affected_countries?: string[]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          manufacturer: string
          model_number?: string | null
          published_at?: string | null
          recommended_action: string
          recommended_action_ar?: string | null
          serial_prefix?: string | null
          severity: string
          source_reference: string
          source_url?: string | null
          source_verified_at?: string | null
          status?: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          affected_countries?: string[]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          manufacturer?: string
          model_number?: string | null
          published_at?: string | null
          recommended_action?: string
          recommended_action_ar?: string | null
          serial_prefix?: string | null
          severity?: string
          source_reference?: string
          source_url?: string | null
          source_verified_at?: string | null
          status?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_notices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_events: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          currency: string
          event_type: string
          id: string
          metadata: Json | null
          stripe_event_id: string | null
          subscription_id: string | null
          user_id: string | null
          warranty_extension_id: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          currency?: string
          event_type: string
          id?: string
          metadata?: Json | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
          warranty_extension_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
          warranty_extension_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_warranty_extension_id_fkey"
            columns: ["warranty_extension_id"]
            isOneToOne: false
            referencedRelation: "warranty_extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_invitations: {
        Row: {
          accepted_at: string | null
          address: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_person: string | null
          contact_phone: string | null
          cr_number: string | null
          created_at: string
          delivery_attempts: number
          delivery_error: string | null
          delivery_locale: string
          expires_at: string
          id: string
          industry: string | null
          invitation_sent: boolean
          invitation_sent_at: string | null
          invited_by: string | null
          inviter_id: string | null
          last_delivery_attempt_at: string | null
          resend_email_id: string | null
          seller_company_id: string | null
          seller_email: string | null
          seller_joined: boolean
          seller_name: string
          seller_phone: string | null
          sent_at: string | null
          status: string | null
          token: string | null
          total_product_value: number | null
          updated_at: string
          user_id: string | null
          warranty_count: number
          warranty_id: string | null
          warranty_policy: string | null
          website: string | null
        }
        Insert: {
          accepted_at?: string | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cr_number?: string | null
          created_at?: string
          delivery_attempts?: number
          delivery_error?: string | null
          delivery_locale?: string
          expires_at?: string
          id?: string
          industry?: string | null
          invitation_sent?: boolean
          invitation_sent_at?: string | null
          invited_by?: string | null
          inviter_id?: string | null
          last_delivery_attempt_at?: string | null
          resend_email_id?: string | null
          seller_company_id?: string | null
          seller_email?: string | null
          seller_joined?: boolean
          seller_name: string
          seller_phone?: string | null
          sent_at?: string | null
          status?: string | null
          token?: string | null
          total_product_value?: number | null
          updated_at?: string
          user_id?: string | null
          warranty_count?: number
          warranty_id?: string | null
          warranty_policy?: string | null
          website?: string | null
        }
        Update: {
          accepted_at?: string | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cr_number?: string | null
          created_at?: string
          delivery_attempts?: number
          delivery_error?: string | null
          delivery_locale?: string
          expires_at?: string
          id?: string
          industry?: string | null
          invitation_sent?: boolean
          invitation_sent_at?: string | null
          invited_by?: string | null
          inviter_id?: string | null
          last_delivery_attempt_at?: string | null
          resend_email_id?: string | null
          seller_company_id?: string | null
          seller_email?: string | null
          seller_joined?: boolean
          seller_name?: string
          seller_phone?: string | null
          sent_at?: string | null
          status?: string | null
          token?: string | null
          total_product_value?: number | null
          updated_at?: string
          user_id?: string | null
          warranty_count?: number
          warranty_id?: string | null
          warranty_policy?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_invitations_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_limit: number | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
          warranty_limit: number | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_limit?: number | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
          warranty_limit?: number | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_limit?: number | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
          warranty_limit?: number | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_admin_reply: boolean | null
          message: string
          sender_id: string | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message: string
          sender_id?: string | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          sender_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          company: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          priority: string
          related_claim_id: string | null
          related_warranty_id: string | null
          requester_email: string | null
          requester_name: string | null
          resolved_at: string | null
          source: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          company?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          priority?: string
          related_claim_id?: string | null
          related_warranty_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          company?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          related_claim_id?: string | null
          related_warranty_id?: string | null
          requester_email?: string | null
          requester_name?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_related_claim_id_fkey"
            columns: ["related_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_related_claim_id_fkey"
            columns: ["related_claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_related_warranty_id_fkey"
            columns: ["related_warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          asset_category_code: string | null
          buyer_id: string | null
          category: string | null
          certificate_hash: string | null
          certificate_url: string | null
          chain_visibility:
            | Database["public"]["Enums"]["chain_visibility"]
            | null
          contract_reference: string | null
          coverage_type: string | null
          created_at: string
          created_by: string | null
          custom_clauses: Json | null
          deleted_at: string | null
          description: string | null
          end_date: string
          id: string
          ingestion_job_id: string | null
          invoice_reference: string | null
          is_archived: boolean | null
          is_self_registered: boolean
          is_seller_verified: boolean
          issuer_company_id: string | null
          issuer_user_id: string | null
          language: string
          legal_hold: boolean | null
          legal_hold_reason: string | null
          manufacturer: string | null
          model_number: string | null
          parent_warranty_id: string | null
          po_reference: string | null
          product_name: string
          product_name_ar: string | null
          purchase_price: number | null
          quantity: number
          recipient_company_id: string | null
          recipient_user_id: string | null
          reference_number: string
          seller_email: string | null
          seller_id: string | null
          seller_name: string | null
          serial_number: string | null
          sku: string | null
          source: string | null
          start_date: string
          status: Database["public"]["Enums"]["warranty_status"]
          supplier: string | null
          taxonomy_version: string
          terms_and_conditions: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          asset_category_code?: string | null
          buyer_id?: string | null
          category?: string | null
          certificate_hash?: string | null
          certificate_url?: string | null
          chain_visibility?:
            | Database["public"]["Enums"]["chain_visibility"]
            | null
          contract_reference?: string | null
          coverage_type?: string | null
          created_at?: string
          created_by?: string | null
          custom_clauses?: Json | null
          deleted_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          ingestion_job_id?: string | null
          invoice_reference?: string | null
          is_archived?: boolean | null
          is_self_registered?: boolean
          is_seller_verified?: boolean
          issuer_company_id?: string | null
          issuer_user_id?: string | null
          language?: string
          legal_hold?: boolean | null
          legal_hold_reason?: string | null
          manufacturer?: string | null
          model_number?: string | null
          parent_warranty_id?: string | null
          po_reference?: string | null
          product_name: string
          product_name_ar?: string | null
          purchase_price?: number | null
          quantity?: number
          recipient_company_id?: string | null
          recipient_user_id?: string | null
          reference_number?: string
          seller_email?: string | null
          seller_id?: string | null
          seller_name?: string | null
          serial_number?: string | null
          sku?: string | null
          source?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["warranty_status"]
          supplier?: string | null
          taxonomy_version?: string
          terms_and_conditions?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          asset_category_code?: string | null
          buyer_id?: string | null
          category?: string | null
          certificate_hash?: string | null
          certificate_url?: string | null
          chain_visibility?:
            | Database["public"]["Enums"]["chain_visibility"]
            | null
          contract_reference?: string | null
          coverage_type?: string | null
          created_at?: string
          created_by?: string | null
          custom_clauses?: Json | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          ingestion_job_id?: string | null
          invoice_reference?: string | null
          is_archived?: boolean | null
          is_self_registered?: boolean
          is_seller_verified?: boolean
          issuer_company_id?: string | null
          issuer_user_id?: string | null
          language?: string
          legal_hold?: boolean | null
          legal_hold_reason?: string | null
          manufacturer?: string | null
          model_number?: string | null
          parent_warranty_id?: string | null
          po_reference?: string | null
          product_name?: string
          product_name_ar?: string | null
          purchase_price?: number | null
          quantity?: number
          recipient_company_id?: string | null
          recipient_user_id?: string | null
          reference_number?: string
          seller_email?: string | null
          seller_id?: string | null
          seller_name?: string | null
          serial_number?: string | null
          sku?: string | null
          source?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["warranty_status"]
          supplier?: string | null
          taxonomy_version?: string
          terms_and_conditions?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_ingestion_job_id_fkey"
            columns: ["ingestion_job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_issuer_company_id_fkey"
            columns: ["issuer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_issuer_user_id_fkey"
            columns: ["issuer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_parent_warranty_id_fkey"
            columns: ["parent_warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_recipient_company_id_fkey"
            columns: ["recipient_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_chain_assignments: {
        Row: {
          all_consented: boolean | null
          assignment_type: string | null
          created_at: string
          downstream_end_date: string | null
          from_company_id: string
          from_consent: boolean | null
          gap_days: number | null
          id: string
          initiated_by: string | null
          manufacturer_company_id: string | null
          manufacturer_consent: boolean | null
          original_warranty_id: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          servicing_company_id: string | null
          status: string
          to_company_id: string
          to_consent: boolean | null
          updated_at: string
          upstream_end_date: string | null
          visibility: Database["public"]["Enums"]["chain_visibility"] | null
        }
        Insert: {
          all_consented?: boolean | null
          assignment_type?: string | null
          created_at?: string
          downstream_end_date?: string | null
          from_company_id: string
          from_consent?: boolean | null
          gap_days?: number | null
          id?: string
          initiated_by?: string | null
          manufacturer_company_id?: string | null
          manufacturer_consent?: boolean | null
          original_warranty_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          servicing_company_id?: string | null
          status?: string
          to_company_id: string
          to_consent?: boolean | null
          updated_at?: string
          upstream_end_date?: string | null
          visibility?: Database["public"]["Enums"]["chain_visibility"] | null
        }
        Update: {
          all_consented?: boolean | null
          assignment_type?: string | null
          created_at?: string
          downstream_end_date?: string | null
          from_company_id?: string
          from_consent?: boolean | null
          gap_days?: number | null
          id?: string
          initiated_by?: string | null
          manufacturer_company_id?: string | null
          manufacturer_consent?: boolean | null
          original_warranty_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          servicing_company_id?: string | null
          status?: string
          to_company_id?: string
          to_consent?: boolean | null
          updated_at?: string
          upstream_end_date?: string | null
          visibility?: Database["public"]["Enums"]["chain_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_chain_assignments_from_company_id_fkey"
            columns: ["from_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_chain_assignments_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_chain_assignments_manufacturer_company_id_fkey"
            columns: ["manufacturer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_chain_assignments_original_warranty_id_fkey"
            columns: ["original_warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_chain_assignments_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_chain_assignments_servicing_company_id_fkey"
            columns: ["servicing_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_chain_assignments_to_company_id_fkey"
            columns: ["to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          category: string | null
          claim_amount: number | null
          claim_number: string
          contact_method: string | null
          created_at: string
          currency: string | null
          decision_reason_code: string | null
          deleted_at: string | null
          description: string
          evidence_requirements: Json
          failure_mode_code: string | null
          filed_at: string
          filed_by: string
          id: string
          is_archived: boolean | null
          legal_hold: boolean | null
          resolution_notes: string | null
          resolved_at: string | null
          responded_at: string | null
          severity: string | null
          status: Database["public"]["Enums"]["claim_status"]
          target_resolution_at: string | null
          target_response_at: string | null
          title: string
          updated_at: string
          warranty_id: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          category?: string | null
          claim_amount?: number | null
          claim_number?: string
          contact_method?: string | null
          created_at?: string
          currency?: string | null
          decision_reason_code?: string | null
          deleted_at?: string | null
          description: string
          evidence_requirements?: Json
          failure_mode_code?: string | null
          filed_at?: string
          filed_by: string
          id?: string
          is_archived?: boolean | null
          legal_hold?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          target_resolution_at?: string | null
          target_response_at?: string | null
          title: string
          updated_at?: string
          warranty_id: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          category?: string | null
          claim_amount?: number | null
          claim_number?: string
          contact_method?: string | null
          created_at?: string
          currency?: string | null
          decision_reason_code?: string | null
          deleted_at?: string | null
          description?: string
          evidence_requirements?: Json
          failure_mode_code?: string | null
          filed_at?: string
          filed_by?: string
          id?: string
          is_archived?: boolean | null
          legal_hold?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          target_resolution_at?: string | null
          target_response_at?: string | null
          title?: string
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_coverage_items: {
        Row: {
          component_name: string
          component_name_ar: string | null
          coverage_type: string
          created_at: string | null
          end_date: string | null
          end_value: number | null
          exclusions: string | null
          exclusions_ar: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          start_date: string | null
          start_value: number | null
          unit: string | null
          updated_at: string | null
          warranty_id: string
        }
        Insert: {
          component_name: string
          component_name_ar?: string | null
          coverage_type: string
          created_at?: string | null
          end_date?: string | null
          end_value?: number | null
          exclusions?: string | null
          exclusions_ar?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          start_date?: string | null
          start_value?: number | null
          unit?: string | null
          updated_at?: string | null
          warranty_id: string
        }
        Update: {
          component_name?: string
          component_name_ar?: string | null
          coverage_type?: string
          created_at?: string | null
          end_date?: string | null
          end_value?: number | null
          exclusions?: string | null
          exclusions_ar?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          start_date?: string | null
          start_value?: number | null
          unit?: string | null
          updated_at?: string | null
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_coverage_items_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          document_kind: string
          evidence_metadata: Json
          file_hash: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_watermarked: boolean
          provenance_status: string
          security_checked_at: string | null
          security_metadata: Json
          security_status: string
          storage_path: string | null
          uploaded_at: string
          uploaded_by: string | null
          version: number
          warranty_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document_kind?: string
          evidence_metadata?: Json
          file_hash?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          is_watermarked?: boolean
          provenance_status?: string
          security_checked_at?: string | null
          security_metadata?: Json
          security_status?: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          warranty_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document_kind?: string
          evidence_metadata?: Json
          file_hash?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_watermarked?: boolean
          provenance_status?: string
          security_checked_at?: string | null
          security_metadata?: Json
          security_status?: string
          storage_path?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_documents_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_extension_requests: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          proposed_end_date: string | null
          quote_expires_at: string | null
          quote_terms: string | null
          quoted_price: number | null
          requested_months: number | null
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          proposed_end_date?: string | null
          quote_expires_at?: string | null
          quote_terms?: string | null
          quoted_price?: number | null
          requested_months?: number | null
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          proposed_end_date?: string | null
          quote_expires_at?: string | null
          quote_terms?: string | null
          quoted_price?: number | null
          requested_months?: number | null
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_extension_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_extension_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_extension_requests_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_extensions: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          currency: string | null
          disputed_at: string | null
          id: string
          is_purchased: boolean
          new_end_date: string
          new_warranty_id: string | null
          offered_by: string | null
          payment_exception_event_id: string | null
          payment_status: string
          price: number | null
          purchased_at: string | null
          purchased_by: string | null
          refunded_at: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          terms: string | null
          warranty_id: string
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          disputed_at?: string | null
          id?: string
          is_purchased?: boolean
          new_end_date: string
          new_warranty_id?: string | null
          offered_by?: string | null
          payment_exception_event_id?: string | null
          payment_status?: string
          price?: number | null
          purchased_at?: string | null
          purchased_by?: string | null
          refunded_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          terms?: string | null
          warranty_id: string
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          disputed_at?: string | null
          id?: string
          is_purchased?: boolean
          new_end_date?: string
          new_warranty_id?: string | null
          offered_by?: string | null
          payment_exception_event_id?: string | null
          payment_status?: string
          price?: number | null
          purchased_at?: string | null
          purchased_by?: string | null
          refunded_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          terms?: string | null
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_extensions_new_warranty_id_fkey"
            columns: ["new_warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_extensions_offered_by_fkey"
            columns: ["offered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_extensions_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_extensions_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_passport_events: {
        Row: {
          created_at: string
          event_day: string
          event_type: string
          id: string
          locale: string
          source: string | null
          traffic_class: string
          warranty_id: string
        }
        Insert: {
          created_at?: string
          event_day?: string
          event_type: string
          id?: string
          locale?: string
          source?: string | null
          traffic_class?: string
          warranty_id: string
        }
        Update: {
          created_at?: string
          event_day?: string
          event_type?: string
          id?: string
          locale?: string
          source?: string | null
          traffic_class?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_passport_events_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_policy_templates: {
        Row: {
          category: string | null
          company_id: string | null
          coverage_type: string | null
          created_at: string
          duration_months: number
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          owner_user_id: string
          suggested_fields: Json
          terms: string | null
          terms_ar: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          coverage_type?: string | null
          created_at?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          owner_user_id: string
          suggested_fields?: Json
          terms?: string | null
          terms_ar?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          coverage_type?: string | null
          created_at?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          owner_user_id?: string
          suggested_fields?: Json
          terms?: string | null
          terms_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_policy_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_policy_templates_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempt_count: number
          created_at: string
          event_id: string
          id: string
          last_error: string | null
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          event_id: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          event_id?: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      claims: {
        Row: {
          assigned_to: string | null
          claim_amount: number | null
          claim_number: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          filed_at: string | null
          filed_by: string | null
          id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string | null
          status: Database["public"]["Enums"]["claim_status"] | null
          title: string | null
          updated_at: string | null
          warranty_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          claim_amount?: number | null
          claim_number?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          filed_at?: string | null
          filed_by?: string | null
          id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
          title?: string | null
          updated_at?: string | null
          warranty_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          claim_amount?: number | null
          claim_number?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          filed_at?: string | null
          filed_by?: string | null
          id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
          title?: string | null
          updated_at?: string | null
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      v_claim_stats: {
        Row: {
          avg_amount: number | null
          avg_resolution_days: number | null
          avg_response_hours: number | null
          closed_claims: number | null
          contested: number | null
          in_progress: number | null
          legal_hold: number | null
          open_claims: number | null
          resolved: number | null
          total: number | null
          total_amount: number | null
        }
        Relationships: []
      }
      v_company_stats: {
        Row: {
          api_enabled: number | null
          archived_companies: number | null
          both_roles: number | null
          clients: number | null
          saudi: number | null
          total: number | null
          unverified: number | null
          vendors: number | null
          verified: number | null
        }
        Relationships: []
      }
      v_ingestion_stats: {
        Row: {
          avg_confidence: number | null
          confirmed: number | null
          extracted: number | null
          failed: number | null
          high_confidence: number | null
          invitations_claimed: number | null
          low_confidence: number | null
          medium_confidence: number | null
          processing: number | null
          received: number | null
          seller_forwarded: number | null
          total: number | null
        }
        Relationships: []
      }
      v_revenue_stats: {
        Row: {
          api_revenue: number | null
          extension_revenue: number | null
          gross_revenue: number | null
          last_30d_revenue: number | null
          mtd_revenue: number | null
          refunds: number | null
          subscription_revenue: number | null
          total_events: number | null
        }
        Relationships: []
      }
      v_subscription_stats: {
        Row: {
          active: number | null
          canceled: number | null
          free_plan: number | null
          paid_active: number | null
          past_due: number | null
          pending_cancel: number | null
          total: number | null
          trialing: number | null
        }
        Relationships: []
      }
      v_user_stats: {
        Row: {
          admins: number | null
          businesses: number | null
          consumers: number | null
          new_30d: number | null
          new_7d: number | null
          sellers: number | null
          super_admins: number | null
          support_staff: number | null
          total: number | null
        }
        Relationships: []
      }
      v_warranty_stats: {
        Row: {
          active: number | null
          archived: number | null
          cancelled: number | null
          claimed: number | null
          expired: number | null
          expiring_30d: number | null
          expiring_90d: number | null
          legal_hold: number | null
          pending_approval: number | null
          self_registered: number | null
          seller_verified: number | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests: number
          p_type: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      check_warranty_expiry: { Args: never; Returns: undefined }
      claim_async_jobs: {
        Args: { p_limit?: number; p_worker: string }
        Returns: {
          attempts: number
          available_at: string
          company_id: string | null
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          idempotency_key: string | null
          job_type: string
          last_error_at: string | null
          last_error_code: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          owner_user_id: string | null
          payload: Json
          priority: number
          result: Json | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "async_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_stripe_webhook_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      company_has_members: { Args: { p_company_id: string }; Returns: boolean }
      complete_business_onboarding: {
        Args: { p_company_name: string; p_user_id: string }
        Returns: string
      }
      complete_stripe_webhook_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      fail_stripe_webhook_event: {
        Args: { p_error: string; p_event_id: string }
        Returns: boolean
      }
      fulfill_warranty_extension_payment: {
        Args: {
          p_amount_paid_minor: number
          p_checkout_session_id: string
          p_currency: string
          p_extension_id: string
          p_payment_intent_id: string
          p_source: string
          p_user_id: string
        }
        Returns: Json
      }
      get_admin_platform_stats: { Args: never; Returns: Json }
      get_admin_subscription_stats: { Args: never; Returns: Json }
      get_admin_user_growth: { Args: never; Returns: Json }
      get_admin_users_list: { Args: never; Returns: Json }
      get_claims_summary: { Args: { user_uuid: string }; Returns: Json }
      get_dashboard_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_count: number
          expiring_soon_count: number
          pending_count: number
          total_claims: number
        }[]
      }
      get_expiring_warranties: {
        Args: { days_ahead?: number }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          asset_category_code: string | null
          buyer_id: string | null
          category: string | null
          certificate_hash: string | null
          certificate_url: string | null
          chain_visibility:
            | Database["public"]["Enums"]["chain_visibility"]
            | null
          contract_reference: string | null
          coverage_type: string | null
          created_at: string
          created_by: string | null
          custom_clauses: Json | null
          deleted_at: string | null
          description: string | null
          end_date: string
          id: string
          ingestion_job_id: string | null
          invoice_reference: string | null
          is_archived: boolean | null
          is_self_registered: boolean
          is_seller_verified: boolean
          issuer_company_id: string | null
          issuer_user_id: string | null
          language: string
          legal_hold: boolean | null
          legal_hold_reason: string | null
          manufacturer: string | null
          model_number: string | null
          parent_warranty_id: string | null
          po_reference: string | null
          product_name: string
          product_name_ar: string | null
          purchase_price: number | null
          quantity: number
          recipient_company_id: string | null
          recipient_user_id: string | null
          reference_number: string
          seller_email: string | null
          seller_id: string | null
          seller_name: string | null
          serial_number: string | null
          sku: string | null
          source: string | null
          start_date: string
          status: Database["public"]["Enums"]["warranty_status"]
          supplier: string | null
          taxonomy_version: string
          terms_and_conditions: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "warranties"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_ingestion_stats: { Args: never; Returns: Json }
      get_seller_dashboard_stats: {
        Args: { company_uuid: string }
        Returns: Json
      }
      get_user_company_ids: { Args: never; Returns: string[] }
      get_user_dashboard_stats: { Args: { user_uuid: string }; Returns: Json }
      get_user_subscription: { Args: { user_uuid: string }; Returns: Json }
      get_warranty_by_category: { Args: { user_uuid: string }; Returns: Json }
      get_warranty_status_distribution: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_warranty_trends: { Args: { user_uuid: string }; Returns: Json }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      match_verified_recall: { Args: { p_recall_id: string }; Returns: number }
      match_warranty_import_duplicate_keys: {
        Args: { p_rows: Json }
        Returns: {
          duplicate_key: string
        }[]
      }
      reconcile_internal_payment_ledger: { Args: never; Returns: number }
      record_warranty_extension_payment_exception: {
        Args: { p_event_id: string; p_extension_id: string; p_status: string }
        Returns: boolean
      }
      recover_stale_async_jobs: { Args: never; Returns: number }
      refresh_analytics_daily_rollups: {
        Args: { p_day?: string }
        Returns: number
      }
      transition_warranty_claim: {
        Args: {
          p_actor_id: string
          p_claim_id: string
          p_new_status: Database["public"]["Enums"]["claim_status"]
          p_note: string
        }
        Returns: {
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          category: string | null
          claim_amount: number | null
          claim_number: string
          contact_method: string | null
          created_at: string
          currency: string | null
          decision_reason_code: string | null
          deleted_at: string | null
          description: string
          evidence_requirements: Json
          failure_mode_code: string | null
          filed_at: string
          filed_by: string
          id: string
          is_archived: boolean | null
          legal_hold: boolean | null
          resolution_notes: string | null
          resolved_at: string | null
          responded_at: string | null
          severity: string | null
          status: Database["public"]["Enums"]["claim_status"]
          target_resolution_at: string | null
          target_response_at: string | null
          title: string
          updated_at: string
          warranty_id: string
        }
        SetofOptions: {
          from: "*"
          to: "warranty_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_subscription: {
        Args: {
          p_cancel_at_period_end?: boolean
          p_current_period_end?: string
          p_current_period_start?: string
          p_plan_id: string
          p_status: string
          p_stripe_customer_id?: string
          p_stripe_subscription_id?: string
          p_trial_end?: string
          p_trial_start?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      account_type: "consumer" | "business"
      chain_visibility: "full" | "notification_only" | "none"
      claim_status:
        | "open"
        | "in_progress"
        | "resolved"
        | "contested"
        | "closed"
        | "draft"
        | "submitted"
        | "under_review"
        | "awaiting_info"
        | "approved"
        | "rejected"
      company_role: "vendor" | "client" | "both"
      notification_type:
        | "warranty_created"
        | "warranty_submitted"
        | "warranty_approved"
        | "warranty_rejected"
        | "expiry_reminder"
        | "claim_opened"
        | "claim_resolved"
        | "extension_offered"
        | "extension_purchased"
        | "document_uploaded"
        | "bulk_import_complete"
        | "seller_invitation"
        | "warranty_verified"
        | "general"
        | "whatsapp"
        | "claim_status_changed"
        | "info_requested"
        | "system"
      user_role:
        | "viewer"
        | "creator"
        | "approver"
        | "company_admin"
        | "platform_admin"
      warranty_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "claimed"
        | "expired"
        | "cancelled"
        | "renewed"
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
      account_type: ["consumer", "business"],
      chain_visibility: ["full", "notification_only", "none"],
      claim_status: [
        "open",
        "in_progress",
        "resolved",
        "contested",
        "closed",
        "draft",
        "submitted",
        "under_review",
        "awaiting_info",
        "approved",
        "rejected",
      ],
      company_role: ["vendor", "client", "both"],
      notification_type: [
        "warranty_created",
        "warranty_submitted",
        "warranty_approved",
        "warranty_rejected",
        "expiry_reminder",
        "claim_opened",
        "claim_resolved",
        "extension_offered",
        "extension_purchased",
        "document_uploaded",
        "bulk_import_complete",
        "seller_invitation",
        "warranty_verified",
        "general",
        "whatsapp",
        "claim_status_changed",
        "info_requested",
        "system",
      ],
      user_role: [
        "viewer",
        "creator",
        "approver",
        "company_admin",
        "platform_admin",
      ],
      warranty_status: [
        "draft",
        "pending_approval",
        "active",
        "claimed",
        "expired",
        "cancelled",
        "renewed",
      ],
    },
  },
} as const
