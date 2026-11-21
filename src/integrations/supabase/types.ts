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
      analytics_events: {
        Row: {
          content_id: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_data: Json
          event_type: string
          id: string
          ip_address: string | null
          stream_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_data?: Json
          event_type: string
          id?: string
          ip_address?: string | null
          stream_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: string | null
          stream_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_verifications: {
        Row: {
          bank_account_name: string | null
          bank_account_secret_ref: string | null
          bank_country: string | null
          bank_name: string | null
          business_address: string
          business_city: string
          business_postal_code: string | null
          business_region: string | null
          created_at: string
          id: string
          identity_verification_id: string | null
          legal_business_name: string
          provider_result: Json
          registration_country: string
          registration_document_path: string
          registration_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          tax_identifier_ref: string | null
          updated_at: string
          user_id: string
          verification_mode: string
          verification_provider: string | null
          verification_reference: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_secret_ref?: string | null
          bank_country?: string | null
          bank_name?: string | null
          business_address: string
          business_city: string
          business_postal_code?: string | null
          business_region?: string | null
          created_at?: string
          id?: string
          identity_verification_id?: string | null
          legal_business_name: string
          provider_result?: Json
          registration_country: string
          registration_document_path: string
          registration_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          tax_identifier_ref?: string | null
          updated_at?: string
          user_id: string
          verification_mode?: string
          verification_provider?: string | null
          verification_reference?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_secret_ref?: string | null
          bank_country?: string | null
          bank_name?: string | null
          business_address?: string
          business_city?: string
          business_postal_code?: string | null
          business_region?: string | null
          created_at?: string
          id?: string
          identity_verification_id?: string | null
          legal_business_name?: string
          provider_result?: Json
          registration_country?: string
          registration_document_path?: string
          registration_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          tax_identifier_ref?: string | null
          updated_at?: string
          user_id?: string
          verification_mode?: string
          verification_provider?: string | null
          verification_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_verifications_identity_verification_id_fkey"
            columns: ["identity_verification_id"]
            isOneToOne: false
            referencedRelation: "identity_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          banner_url: string | null
          category: string | null
          created_at: string
          description: string | null
          epg_url: string | null
          id: string
          is_active: boolean | null
          is_live: boolean | null
          logo_url: string | null
          metadata: Json | null
          monetization: Database["public"]["Enums"]["monetization_type"]
          name: string
          slug: string
          sort_order: number | null
          stream_url: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          epg_url?: string | null
          id?: string
          is_active?: boolean | null
          is_live?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          name: string
          slug: string
          sort_order?: number | null
          stream_url?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          epg_url?: string | null
          id?: string
          is_active?: boolean | null
          is_live?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          name?: string
          slug?: string
          sort_order?: number | null
          stream_url?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          availability_end: string | null
          availability_start: string | null
          banner_url: string | null
          captions: Json
          cast_crew: Json | null
          content_format: string | null
          created_at: string
          creator_base_currency: string | null
          creator_id: string | null
          currency: string | null
          dash_manifest_url: string | null
          description: string | null
          duration: number | null
          dynamic_metadata: Json
          episode_number: number | null
          genres: string[] | null
          hls_manifest_url: string | null
          id: string
          is_drm_protected: boolean | null
          is_featured: boolean | null
          lifecycle_state: Database["public"]["Enums"]["creator_content_lifecycle"]
          lifecycle_updated_at: string
          like_count: number | null
          metadata: Json | null
          monetization: Database["public"]["Enums"]["monetization_type"]
          parent_id: string | null
          poster_url: string | null
          preset_type: Database["public"]["Enums"]["content_preset_type"] | null
          preview_url: string | null
          price: number | null
          rating: number | null
          release_date: string | null
          rights_reviewed_at: string | null
          rights_status: string
          season_number: number | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["content_status"]
          tags: string[] | null
          tenant_id: string
          territory_rights: Json
          thumbnail_url: string | null
          title: string
          trailer_url: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          availability_end?: string | null
          availability_start?: string | null
          banner_url?: string | null
          captions?: Json
          cast_crew?: Json | null
          content_format?: string | null
          created_at?: string
          creator_base_currency?: string | null
          creator_id?: string | null
          currency?: string | null
          dash_manifest_url?: string | null
          description?: string | null
          duration?: number | null
          dynamic_metadata?: Json
          episode_number?: number | null
          genres?: string[] | null
          hls_manifest_url?: string | null
          id?: string
          is_drm_protected?: boolean | null
          is_featured?: boolean | null
          lifecycle_state?: Database["public"]["Enums"]["creator_content_lifecycle"]
          lifecycle_updated_at?: string
          like_count?: number | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          parent_id?: string | null
          poster_url?: string | null
          preset_type?:
            | Database["public"]["Enums"]["content_preset_type"]
            | null
          preview_url?: string | null
          price?: number | null
          rating?: number | null
          release_date?: string | null
          rights_reviewed_at?: string | null
          rights_status?: string
          season_number?: number | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          tenant_id: string
          territory_rights?: Json
          thumbnail_url?: string | null
          title: string
          trailer_url?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          availability_end?: string | null
          availability_start?: string | null
          banner_url?: string | null
          captions?: Json
          cast_crew?: Json | null
          content_format?: string | null
          created_at?: string
          creator_base_currency?: string | null
          creator_id?: string | null
          currency?: string | null
          dash_manifest_url?: string | null
          description?: string | null
          duration?: number | null
          dynamic_metadata?: Json
          episode_number?: number | null
          genres?: string[] | null
          hls_manifest_url?: string | null
          id?: string
          is_drm_protected?: boolean | null
          is_featured?: boolean | null
          lifecycle_state?: Database["public"]["Enums"]["creator_content_lifecycle"]
          lifecycle_updated_at?: string
          like_count?: number | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          parent_id?: string | null
          poster_url?: string | null
          preset_type?:
            | Database["public"]["Enums"]["content_preset_type"]
            | null
          preview_url?: string | null
          price?: number | null
          rating?: number | null
          release_date?: string | null
          rights_reviewed_at?: string | null
          rights_status?: string
          season_number?: number | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          tenant_id?: string
          territory_rights?: Json
          thumbnail_url?: string | null
          title?: string
          trailer_url?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_rights_declarations: {
        Row: {
          content_id: string
          creator_id: string
          declaration: Json
          declaration_hash: string
          declared_at: string
          id: string
          supersedes_id: string | null
        }
        Insert: {
          content_id: string
          creator_id: string
          declaration: Json
          declaration_hash: string
          declared_at?: string
          id?: string
          supersedes_id?: string | null
        }
        Update: {
          content_id?: string
          creator_id?: string
          declaration?: Json
          declaration_hash?: string
          declared_at?: string
          id?: string
          supersedes_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_rights_declarations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_rights_declarations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_rights_declarations_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "content_rights_declarations"
            referencedColumns: ["id"]
          },
        ]
      }
      country_currency_rules: {
        Row: {
          country_code: string
          currency_code: string
          currency_symbol: string | null
          enabled: boolean
          locale_code: string
          metadata: Json
          source: string
          timezone_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          country_code: string
          currency_code: string
          currency_symbol?: string | null
          enabled?: boolean
          locale_code?: string
          metadata?: Json
          source?: string
          timezone_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          country_code?: string
          currency_code?: string
          currency_symbol?: string | null
          enabled?: boolean
          locale_code?: string
          metadata?: Json
          source?: string
          timezone_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      creator_content_lifecycle_audit: {
        Row: {
          actor_id: string | null
          content_id: string
          created_at: string
          from_state:
            | Database["public"]["Enums"]["creator_content_lifecycle"]
            | null
          id: number
          reason: string | null
          to_state: Database["public"]["Enums"]["creator_content_lifecycle"]
        }
        Insert: {
          actor_id?: string | null
          content_id: string
          created_at?: string
          from_state?:
            | Database["public"]["Enums"]["creator_content_lifecycle"]
            | null
          id?: never
          reason?: string | null
          to_state: Database["public"]["Enums"]["creator_content_lifecycle"]
        }
        Update: {
          actor_id?: string | null
          content_id?: string
          created_at?: string
          from_state?:
            | Database["public"]["Enums"]["creator_content_lifecycle"]
            | null
          id?: never
          reason?: string | null
          to_state?: Database["public"]["Enums"]["creator_content_lifecycle"]
        }
        Relationships: [
          {
            foreignKeyName: "creator_content_lifecycle_audit_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_content_lifecycle_audit_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_gift_catalog: {
        Row: {
          amount_minor: number
          animation_duration_ms: number
          animation_url: string | null
          asset_url: string | null
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          emoji: string | null
          gift_key: string
          id: string
          is_enabled: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount_minor: number
          animation_duration_ms?: number
          animation_url?: string | null
          asset_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency: string
          description?: string | null
          emoji?: string | null
          gift_key: string
          id?: string
          is_enabled?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          animation_duration_ms?: number
          animation_url?: string | null
          asset_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          emoji?: string | null
          gift_key?: string
          id?: string
          is_enabled?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      creator_verification_audit: {
        Row: {
          action: string
          actor_id: string | null
          case_id: string
          created_at: string
          details: Json
          from_status:
            | Database["public"]["Enums"]["creator_verification_status"]
            | null
          id: number
          to_status:
            | Database["public"]["Enums"]["creator_verification_status"]
            | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          case_id: string
          created_at?: string
          details?: Json
          from_status?:
            | Database["public"]["Enums"]["creator_verification_status"]
            | null
          id?: never
          to_status?:
            | Database["public"]["Enums"]["creator_verification_status"]
            | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          case_id?: string
          created_at?: string
          details?: Json
          from_status?:
            | Database["public"]["Enums"]["creator_verification_status"]
            | null
          id?: never
          to_status?:
            | Database["public"]["Enums"]["creator_verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_verification_audit_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "creator_verification_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_verification_cases: {
        Row: {
          additional_information: Json
          appeal_reason: string | null
          business_verification_id: string | null
          country_code: string
          created_at: string
          entity_type: Database["public"]["Enums"]["creator_entity_type"]
          id: string
          identity_verification_id: string | null
          provider_key: string | null
          provider_reference: string | null
          provider_status: string | null
          requirements_snapshot: Json
          reviewed_at: string | null
          reviewed_by: string | null
          rights_declaration: Json
          status: Database["public"]["Enums"]["creator_verification_status"]
          studio_account_id: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_information?: Json
          appeal_reason?: string | null
          business_verification_id?: string | null
          country_code: string
          created_at?: string
          entity_type: Database["public"]["Enums"]["creator_entity_type"]
          id?: string
          identity_verification_id?: string | null
          provider_key?: string | null
          provider_reference?: string | null
          provider_status?: string | null
          requirements_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_declaration?: Json
          status?: Database["public"]["Enums"]["creator_verification_status"]
          studio_account_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_information?: Json
          appeal_reason?: string | null
          business_verification_id?: string | null
          country_code?: string
          created_at?: string
          entity_type?: Database["public"]["Enums"]["creator_entity_type"]
          id?: string
          identity_verification_id?: string | null
          provider_key?: string | null
          provider_reference?: string | null
          provider_status?: string | null
          requirements_snapshot?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_declaration?: Json
          status?: Database["public"]["Enums"]["creator_verification_status"]
          studio_account_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_verification_cases_business_verification_id_fkey"
            columns: ["business_verification_id"]
            isOneToOne: false
            referencedRelation: "business_verifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_verification_cases_identity_verification_id_fkey"
            columns: ["identity_verification_id"]
            isOneToOne: false
            referencedRelation: "identity_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      email_provider_configs: {
        Row: {
          from_email: string
          from_name: string
          is_enabled: boolean
          is_live: boolean
          live_secret_ref: string | null
          provider: string
          reply_to: string | null
          test_secret_ref: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          from_email: string
          from_name: string
          is_enabled?: boolean
          is_live?: boolean
          live_secret_ref?: string | null
          provider: string
          reply_to?: string | null
          test_secret_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          from_email?: string
          from_name?: string
          is_enabled?: boolean
          is_live?: boolean
          live_secret_ref?: string | null
          provider?: string
          reply_to?: string | null
          test_secret_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      event_access_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          invite_role: string
          invited_by: string
          invited_email: string
          invited_user_id: string | null
          live_stream_id: string | null
          screening_id: string | null
          status: string
          tenant_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_role?: string
          invited_by: string
          invited_email: string
          invited_user_id?: string | null
          live_stream_id?: string | null
          screening_id?: string | null
          status?: string
          tenant_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_role?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string | null
          live_stream_id?: string | null
          screening_id?: string | null
          status?: string
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_access_invites_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_access_invites_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_access_invites_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_contributions: {
        Row: {
          amount_major: number | null
          amount_minor: number
          checkout_url: string | null
          content_id: string | null
          contribution_type: string
          contributor_email: string | null
          contributor_name: string | null
          contributor_user_id: string | null
          created_at: string
          creator_base_currency: string | null
          creator_id: string
          currency: string
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          gift_catalog_key: string | null
          id: string
          idempotency_key: string | null
          is_anonymous: boolean
          live_stream_id: string | null
          message: string | null
          original_currency: string | null
          paid_at: string | null
          payout_currency: string | null
          platform_base_currency: string | null
          platform_fee_major: number
          provider_checkout_id: string | null
          provider_key: string | null
          provider_mode: string
          provider_reference: string | null
          provider_transaction_id: string | null
          screening_id: string | null
          settlement_currency: string | null
          status: string
          target_kind: string
          tenant_id: string
        }
        Insert: {
          amount_major?: number | null
          amount_minor: number
          checkout_url?: string | null
          content_id?: string | null
          contribution_type: string
          contributor_email?: string | null
          contributor_name?: string | null
          contributor_user_id?: string | null
          created_at?: string
          creator_base_currency?: string | null
          creator_id: string
          currency: string
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          gift_catalog_key?: string | null
          id?: string
          idempotency_key?: string | null
          is_anonymous?: boolean
          live_stream_id?: string | null
          message?: string | null
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          platform_fee_major?: number
          provider_checkout_id?: string | null
          provider_key?: string | null
          provider_mode?: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          screening_id?: string | null
          settlement_currency?: string | null
          status?: string
          target_kind?: string
          tenant_id: string
        }
        Update: {
          amount_major?: number | null
          amount_minor?: number
          checkout_url?: string | null
          content_id?: string | null
          contribution_type?: string
          contributor_email?: string | null
          contributor_name?: string | null
          contributor_user_id?: string | null
          created_at?: string
          creator_base_currency?: string | null
          creator_id?: string
          currency?: string
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          gift_catalog_key?: string | null
          id?: string
          idempotency_key?: string | null
          is_anonymous?: boolean
          live_stream_id?: string | null
          message?: string | null
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          platform_fee_major?: number
          provider_checkout_id?: string | null
          provider_key?: string | null
          provider_mode?: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          screening_id?: string | null
          settlement_currency?: string | null
          status?: string
          target_kind?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_contributions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contributions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contributions_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contributions_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_contributions_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_early_bird_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          paid_at: string | null
          provider_reference: string
          released_at: string | null
          reservation_status: string
          screening_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          paid_at?: string | null
          provider_reference: string
          released_at?: string | null
          reservation_status?: string
          screening_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          paid_at?: string | null
          provider_reference?: string
          released_at?: string | null
          reservation_status?: string
          screening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_early_bird_reservations_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_early_bird_reservations_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notification_outbox: {
        Row: {
          attempts: number
          content_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          live_stream_id: string | null
          notification_type: string
          payload: Json
          recipient_email: string
          recipient_user_id: string | null
          scheduled_for: string
          screening_id: string | null
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          content_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          live_stream_id?: string | null
          notification_type: string
          payload?: Json
          recipient_email: string
          recipient_user_id?: string | null
          scheduled_for?: string
          screening_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          content_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          live_stream_id?: string | null
          notification_type?: string
          payload?: Json
          recipient_email?: string
          recipient_user_id?: string | null
          scheduled_for?: string
          screening_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notification_outbox_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notification_outbox_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notification_outbox_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notification_outbox_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_notification_outbox_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_settlement_holds: {
        Row: {
          content_id: string | null
          created_at: string
          creator_id: string
          currency: string
          delivery_confirmed_at: string | null
          delivery_evidence: Json
          event_ended_at: string | null
          gross_amount_minor: number
          hold_hours: number
          hold_status: string
          id: string
          live_stream_id: string | null
          net_amount_minor: number
          release_at: string | null
          released_at: string | null
          screening_id: string | null
          source_id: string
          source_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          creator_id: string
          currency: string
          delivery_confirmed_at?: string | null
          delivery_evidence?: Json
          event_ended_at?: string | null
          gross_amount_minor: number
          hold_hours?: number
          hold_status?: string
          id?: string
          live_stream_id?: string | null
          net_amount_minor: number
          release_at?: string | null
          released_at?: string | null
          screening_id?: string | null
          source_id: string
          source_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          delivery_confirmed_at?: string | null
          delivery_evidence?: Json
          event_ended_at?: string | null
          gross_amount_minor?: number
          hold_hours?: number
          hold_status?: string
          id?: string
          live_stream_id?: string | null
          net_amount_minor?: number
          release_at?: string | null
          released_at?: string | null
          screening_id?: string | null
          source_id?: string
          source_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_settlement_holds_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_settlement_holds_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_settlement_holds_live_stream_id_fkey"
            columns: ["live_stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_settlement_holds_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_settlement_holds_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          screening_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          screening_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          screening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_waitlist_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_waitlist_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_blasts: {
        Row: {
          audience: string
          body: string | null
          created_at: string
          error: string | null
          id: string
          recipients_count: number
          screening_id: string
          status: string
          subject: string
          template: string
          user_id: string
        }
        Insert: {
          audience?: string
          body?: string | null
          created_at?: string
          error?: string | null
          id?: string
          recipients_count?: number
          screening_id: string
          status?: string
          subject: string
          template: string
          user_id: string
        }
        Update: {
          audience?: string
          body?: string | null
          created_at?: string
          error?: string | null
          id?: string
          recipients_count?: number
          screening_id?: string
          status?: string
          subject?: string
          template?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          conditions: Json | null
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean | null
          rollout_percentage: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          rollout_percentage?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      filmmaker_submissions: {
        Row: {
          admin_notes: string | null
          budget_range: string | null
          cast_crew: Json
          company_name: string | null
          content_id: string | null
          created_at: string
          description: string | null
          distribution_rights: string | null
          duration_minutes: number | null
          genres: string[] | null
          id: string
          poster_url: string | null
          premiere_date: string | null
          prior_screenings: string | null
          project_title: string
          project_type: string
          release_year: number | null
          rights_territories: string[]
          screener_url: string | null
          status: string
          submitter_email: string
          submitter_name: string
          tenant_id: string | null
          trailer_url: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          budget_range?: string | null
          cast_crew?: Json
          company_name?: string | null
          content_id?: string | null
          created_at?: string
          description?: string | null
          distribution_rights?: string | null
          duration_minutes?: number | null
          genres?: string[] | null
          id?: string
          poster_url?: string | null
          premiere_date?: string | null
          prior_screenings?: string | null
          project_title: string
          project_type?: string
          release_year?: number | null
          rights_territories?: string[]
          screener_url?: string | null
          status?: string
          submitter_email: string
          submitter_name: string
          tenant_id?: string | null
          trailer_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          budget_range?: string | null
          cast_crew?: Json
          company_name?: string | null
          content_id?: string | null
          created_at?: string
          description?: string | null
          distribution_rights?: string | null
          duration_minutes?: number | null
          genres?: string[] | null
          id?: string
          poster_url?: string | null
          premiere_date?: string | null
          prior_screenings?: string | null
          project_title?: string
          project_type?: string
          release_year?: number | null
          rights_territories?: string[]
          screener_url?: string | null
          status?: string
          submitter_email?: string
          submitter_name?: string
          tenant_id?: string | null
          trailer_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filmmaker_submissions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filmmaker_submissions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filmmaker_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_payment_orders: {
        Row: {
          amount_minor: number
          app_origin: string | null
          checkout_url: string | null
          created_at: string
          creator_base_currency: string | null
          currency: string
          email: string
          email_sent_at: string | null
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          id: string
          original_currency: string | null
          paid_at: string | null
          payout_currency: string | null
          platform_base_currency: string | null
          platform_fee_major: number
          provider: string
          provider_checkout_id: string | null
          provider_mode: string
          provider_reference: string
          provider_transaction_id: string | null
          settlement_currency: string | null
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          app_origin?: string | null
          checkout_url?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency: string
          email: string
          email_sent_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          platform_fee_major?: number
          provider: string
          provider_checkout_id?: string | null
          provider_mode?: string
          provider_reference: string
          provider_transaction_id?: string | null
          settlement_currency?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          app_origin?: string | null
          checkout_url?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency?: string
          email?: string
          email_sent_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          platform_fee_major?: number
          provider?: string
          provider_checkout_id?: string | null
          provider_mode?: string
          provider_reference?: string
          provider_transaction_id?: string | null
          settlement_currency?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_payment_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "screening_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          address_city: string | null
          address_line: string | null
          address_postal_code: string | null
          address_region: string | null
          country_code: string
          created_at: string
          date_of_birth: string | null
          document_object_path: string
          document_type: string
          id: string
          identity_provider: string | null
          identity_reference: string | null
          legal_name: string
          liveness_provider: string | null
          liveness_reference: string | null
          provider_result: Json
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_video_object_path: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          verification_mode: string
        }
        Insert: {
          address_city?: string | null
          address_line?: string | null
          address_postal_code?: string | null
          address_region?: string | null
          country_code: string
          created_at?: string
          date_of_birth?: string | null
          document_object_path: string
          document_type: string
          id?: string
          identity_provider?: string | null
          identity_reference?: string | null
          legal_name: string
          liveness_provider?: string | null
          liveness_reference?: string | null
          provider_result?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_video_object_path: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          verification_mode?: string
        }
        Update: {
          address_city?: string | null
          address_line?: string | null
          address_postal_code?: string | null
          address_region?: string | null
          country_code?: string
          created_at?: string
          date_of_birth?: string | null
          document_object_path?: string
          document_type?: string
          id?: string
          identity_provider?: string | null
          identity_reference?: string | null
          legal_name?: string
          liveness_provider?: string | null
          liveness_reference?: string | null
          provider_result?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_video_object_path?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          verification_mode?: string
        }
        Relationships: []
      }
      knowledgebase_articles: {
        Row: {
          audience: string
          body_markdown: string
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          published_at: string | null
          search_vector: unknown
          slug: string
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: string
          body_markdown: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          search_vector?: unknown
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: string
          body_markdown?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          search_vector?: unknown
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledgebase_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledgebase_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledgebase_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_payment_orders: {
        Row: {
          amount_major: number | null
          amount_minor: number
          checkout_url: string | null
          created_at: string
          creator_base_currency: string | null
          currency: string
          email: string
          email_delivery_claimed_at: string | null
          email_sent_at: string | null
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          guest_checkout: boolean
          id: string
          metadata: Json
          original_currency: string | null
          paid_at: string | null
          payout_currency: string | null
          platform_base_currency: string | null
          platform_fee_major: number
          provider: string
          provider_checkout_id: string | null
          provider_mode: string
          provider_reference: string
          provider_transaction_id: string | null
          screening_id: string
          settlement_currency: string | null
          status: string
          stream_id: string
          tenant_id: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_major?: number | null
          amount_minor: number
          checkout_url?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency: string
          email: string
          email_delivery_claimed_at?: string | null
          email_sent_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          guest_checkout?: boolean
          id?: string
          metadata?: Json
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          platform_fee_major?: number
          provider: string
          provider_checkout_id?: string | null
          provider_mode?: string
          provider_reference: string
          provider_transaction_id?: string | null
          screening_id: string
          settlement_currency?: string | null
          status?: string
          stream_id: string
          tenant_id: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_major?: number | null
          amount_minor?: number
          checkout_url?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency?: string
          email?: string
          email_delivery_claimed_at?: string | null
          email_sent_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          guest_checkout?: boolean
          id?: string
          metadata?: Json
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          platform_fee_major?: number
          provider?: string
          provider_checkout_id?: string | null
          provider_mode?: string
          provider_reference?: string
          provider_transaction_id?: string | null
          screening_id?: string
          settlement_currency?: string | null
          status?: string
          stream_id?: string
          tenant_id?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_payment_orders_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_payment_orders_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_payment_orders_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          position_seconds: number | null
          screening_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          position_seconds?: number | null
          screening_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          position_seconds?: number | null
          screening_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_reactions_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          actual_end: string | null
          actual_ended_at: string | null
          actual_start: string | null
          actual_started_at: string | null
          banner_url: string | null
          chat_enabled: boolean | null
          created_at: string
          creator_id: string
          currency: string | null
          description: string | null
          early_bird_capacity: number | null
          early_bird_currency: string | null
          early_bird_ends_at: string | null
          early_bird_price: number | null
          encoder_connected_at: string | null
          event_timezone: string
          event_visibility: string
          id: string
          invite_only: boolean
          is_ticketed: boolean | null
          lifecycle_status: Database["public"]["Enums"]["broadcast_lifecycle_status"]
          metadata: Json | null
          monetization: Database["public"]["Enums"]["monetization_type"]
          peak_viewers: number | null
          playback_url: string | null
          presale_enabled: boolean
          provider_stream_id: string | null
          reconnect_grace_expires_at: string | null
          recording_enabled: boolean | null
          recording_url: string | null
          rtmp_url: string | null
          sales_close_at: string | null
          sales_open_at: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          settlement_delivery_required: boolean
          settlement_hold_hours: number
          status: Database["public"]["Enums"]["stream_status"]
          stream_key: string | null
          tenant_id: string
          thumbnail_url: string | null
          ticket_price: number | null
          title: string
          updated_at: string
          viewer_count: number | null
          vod_replay_asset_url: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_ended_at?: string | null
          actual_start?: string | null
          actual_started_at?: string | null
          banner_url?: string | null
          chat_enabled?: boolean | null
          created_at?: string
          creator_id: string
          currency?: string | null
          description?: string | null
          early_bird_capacity?: number | null
          early_bird_currency?: string | null
          early_bird_ends_at?: string | null
          early_bird_price?: number | null
          encoder_connected_at?: string | null
          event_timezone?: string
          event_visibility?: string
          id?: string
          invite_only?: boolean
          is_ticketed?: boolean | null
          lifecycle_status?: Database["public"]["Enums"]["broadcast_lifecycle_status"]
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          peak_viewers?: number | null
          playback_url?: string | null
          presale_enabled?: boolean
          provider_stream_id?: string | null
          reconnect_grace_expires_at?: string | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          rtmp_url?: string | null
          sales_close_at?: string | null
          sales_open_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          settlement_delivery_required?: boolean
          settlement_hold_hours?: number
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key?: string | null
          tenant_id: string
          thumbnail_url?: string | null
          ticket_price?: number | null
          title: string
          updated_at?: string
          viewer_count?: number | null
          vod_replay_asset_url?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_ended_at?: string | null
          actual_start?: string | null
          actual_started_at?: string | null
          banner_url?: string | null
          chat_enabled?: boolean | null
          created_at?: string
          creator_id?: string
          currency?: string | null
          description?: string | null
          early_bird_capacity?: number | null
          early_bird_currency?: string | null
          early_bird_ends_at?: string | null
          early_bird_price?: number | null
          encoder_connected_at?: string | null
          event_timezone?: string
          event_visibility?: string
          id?: string
          invite_only?: boolean
          is_ticketed?: boolean | null
          lifecycle_status?: Database["public"]["Enums"]["broadcast_lifecycle_status"]
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          peak_viewers?: number | null
          playback_url?: string | null
          presale_enabled?: boolean
          provider_stream_id?: string | null
          reconnect_grace_expires_at?: string | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          rtmp_url?: string | null
          sales_close_at?: string | null
          sales_open_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          settlement_delivery_required?: boolean
          settlement_hold_hours?: number
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key?: string | null
          tenant_id?: string
          thumbnail_url?: string | null
          ticket_price?: number | null
          title?: string
          updated_at?: string
          viewer_count?: number | null
          vod_replay_asset_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "screening_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_processing_jobs: {
        Row: {
          attempts: number
          available_at: string
          clean_master_path: string | null
          content_id: string | null
          created_at: string
          dead_lettered_at: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          provenance: Json
          quarantine_path: string
          renditions: Json
          sha256: string | null
          stage: string
          status: Database["public"]["Enums"]["media_processing_status"]
          subtitles: Json
          updated_at: string
          upload_session_id: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          clean_master_path?: string | null
          content_id?: string | null
          created_at?: string
          dead_lettered_at?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          provenance?: Json
          quarantine_path: string
          renditions?: Json
          sha256?: string | null
          stage?: string
          status?: Database["public"]["Enums"]["media_processing_status"]
          subtitles?: Json
          updated_at?: string
          upload_session_id: string
        }
        Update: {
          attempts?: number
          available_at?: string
          clean_master_path?: string | null
          content_id?: string | null
          created_at?: string
          dead_lettered_at?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          provenance?: Json
          quarantine_path?: string
          renditions?: Json
          sha256?: string | null
          stage?: string
          status?: Database["public"]["Enums"]["media_processing_status"]
          subtitles?: Json
          updated_at?: string
          upload_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_processing_jobs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_processing_jobs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_processing_jobs_upload_session_id_fkey"
            columns: ["upload_session_id"]
            isOneToOne: false
            referencedRelation: "media_upload_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      media_upload_sessions: {
        Row: {
          cancelled_at: string | null
          chunk_manifest: Json
          chunk_size_bytes: number
          completed_at: string | null
          content_id: string | null
          created_at: string
          expected_sha256: string | null
          expected_size_bytes: number
          expires_at: string
          id: string
          mime_type: string
          object_path: string
          original_filename: string
          owner_id: string
          received_size_bytes: number
          status: Database["public"]["Enums"]["media_processing_status"]
          storage_upload_id: string | null
          studio_account_id: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          chunk_manifest?: Json
          chunk_size_bytes?: number
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          expected_sha256?: string | null
          expected_size_bytes: number
          expires_at: string
          id?: string
          mime_type: string
          object_path: string
          original_filename: string
          owner_id: string
          received_size_bytes?: number
          status?: Database["public"]["Enums"]["media_processing_status"]
          storage_upload_id?: string | null
          studio_account_id?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          chunk_manifest?: Json
          chunk_size_bytes?: number
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          expected_sha256?: string | null
          expected_size_bytes?: number
          expires_at?: string
          id?: string
          mime_type?: string
          object_path?: string
          original_filename?: string
          owner_id?: string
          received_size_bytes?: number
          status?: Database["public"]["Enums"]["media_processing_status"]
          storage_upload_id?: string | null
          studio_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_upload_sessions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_upload_sessions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_upload_sessions_studio_account_id_fkey"
            columns: ["studio_account_id"]
            isOneToOne: false
            referencedRelation: "studio_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          created_at: string
          gateway_name: string
          id: string
          is_enabled: boolean | null
          is_live: boolean | null
          live_public_key: string | null
          live_secret_key: string | null
          settings: Json | null
          tenant_id: string
          test_public_key: string | null
          test_secret_key: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          gateway_name: string
          id?: string
          is_enabled?: boolean | null
          is_live?: boolean | null
          live_public_key?: string | null
          live_secret_key?: string | null
          settings?: Json | null
          tenant_id: string
          test_public_key?: string | null
          test_secret_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          gateway_name?: string
          id?: string
          is_enabled?: boolean | null
          is_live?: boolean | null
          live_public_key?: string | null
          live_secret_key?: string | null
          settings?: Json | null
          tenant_id?: string
          test_public_key?: string | null
          test_secret_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      payment_provider_configs: {
        Row: {
          is_enabled: boolean
          is_live: boolean
          live_public_key: string | null
          live_secret_ref: string | null
          provider: string
          test_public_key: string | null
          test_secret_ref: string | null
          updated_at: string
          updated_by: string | null
          webhook_secret_ref: string | null
        }
        Insert: {
          is_enabled?: boolean
          is_live?: boolean
          live_public_key?: string | null
          live_secret_ref?: string | null
          provider: string
          test_public_key?: string | null
          test_secret_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret_ref?: string | null
        }
        Update: {
          is_enabled?: boolean
          is_live?: boolean
          live_public_key?: string | null
          live_secret_ref?: string | null
          provider?: string
          test_public_key?: string | null
          test_secret_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret_ref?: string | null
        }
        Relationships: []
      }
      payment_refunds: {
        Row: {
          amount_minor: number
          contribution_id: string | null
          created_at: string
          creator_base_currency: string | null
          currency: string
          error_code: string | null
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          id: string
          live_ticket_id: string | null
          original_currency: string | null
          payment_reference: string
          payout_currency: string | null
          platform_base_currency: string | null
          provider: string
          provider_mode: string
          provider_refund_id: string | null
          reason: string
          requested_by: string
          settlement_currency: string | null
          status: string
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          contribution_id?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency: string
          error_code?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          live_ticket_id?: string | null
          original_currency?: string | null
          payment_reference: string
          payout_currency?: string | null
          platform_base_currency?: string | null
          provider: string
          provider_mode: string
          provider_refund_id?: string | null
          reason: string
          requested_by: string
          settlement_currency?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          contribution_id?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency?: string
          error_code?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          live_ticket_id?: string | null
          original_currency?: string | null
          payment_reference?: string
          payout_currency?: string | null
          platform_base_currency?: string | null
          provider?: string
          provider_mode?: string
          provider_refund_id?: string | null
          reason?: string
          requested_by?: string
          settlement_currency?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "event_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_live_ticket_id_fkey"
            columns: ["live_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "screening_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          creator_base_currency: string | null
          currency: string | null
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          id: string
          metadata: Json | null
          original_currency: string | null
          payment_type: string
          payout_currency: string | null
          platform_base_currency: string | null
          provider: string | null
          reference_id: string | null
          settlement_currency: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_base_currency?: string | null
          currency?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          metadata?: Json | null
          original_currency?: string | null
          payment_type: string
          payout_currency?: string | null
          platform_base_currency?: string | null
          provider?: string | null
          reference_id?: string | null
          settlement_currency?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_base_currency?: string | null
          currency?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          metadata?: Json | null
          original_currency?: string | null
          payment_type?: string
          payout_currency?: string | null
          platform_base_currency?: string | null
          provider?: string | null
          reference_id?: string | null
          settlement_currency?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_wallet_accounts: {
        Row: {
          balance_minor: number
          created_at: string
          currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_minor?: number
          created_at?: string
          currency: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_minor?: number
          created_at?: string
          currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_wallet_ledger: {
        Row: {
          amount_minor: number
          balance_after_minor: number
          created_at: string
          currency: string
          entry_type: string
          id: string
          idempotency_key: string
          metadata: Json
          reference: string | null
          related_contribution_id: string | null
          user_id: string
        }
        Insert: {
          amount_minor: number
          balance_after_minor: number
          created_at?: string
          currency: string
          entry_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          reference?: string | null
          related_contribution_id?: string | null
          user_id: string
        }
        Update: {
          amount_minor?: number
          balance_after_minor?: number
          created_at?: string
          currency?: string
          entry_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          reference?: string | null
          related_contribution_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_wallet_ledger_related_contribution_id_fkey"
            columns: ["related_contribution_id"]
            isOneToOne: false
            referencedRelation: "event_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ai_policies: {
        Row: {
          allow_financial_decisions: boolean
          allow_identity_decisions: boolean
          allowed_data_classes: string[]
          capability: string
          enabled: boolean
          max_input_chars: number
          max_output_tokens: number
          model_key: string | null
          provider_allowlist: string[]
          requires_human_review: boolean
          system_policy: string
          updated_at: string
          updated_by: string | null
          workflow_key: string
        }
        Insert: {
          allow_financial_decisions?: boolean
          allow_identity_decisions?: boolean
          allowed_data_classes?: string[]
          capability?: string
          enabled?: boolean
          max_input_chars?: number
          max_output_tokens?: number
          model_key?: string | null
          provider_allowlist?: string[]
          requires_human_review?: boolean
          system_policy: string
          updated_at?: string
          updated_by?: string | null
          workflow_key: string
        }
        Update: {
          allow_financial_decisions?: boolean
          allow_identity_decisions?: boolean
          allowed_data_classes?: string[]
          capability?: string
          enabled?: boolean
          max_input_chars?: number
          max_output_tokens?: number
          model_key?: string | null
          provider_allowlist?: string[]
          requires_human_review?: boolean
          system_policy?: string
          updated_at?: string
          updated_by?: string | null
          workflow_key?: string
        }
        Relationships: []
      }
      platform_branding_registry: {
        Row: {
          brand_config: Json
          brand_key: string
          is_public: boolean
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          brand_config: Json
          brand_key: string
          is_public?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          brand_config?: Json
          brand_key?: string
          is_public?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      platform_feature_controls: {
        Row: {
          change_reason: string
          config: Json
          enabled: boolean
          feature_key: string
          release_state: string
          rollout_percentage: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          change_reason: string
          config?: Json
          enabled?: boolean
          feature_key: string
          release_state?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          change_reason?: string
          config?: Json
          enabled?: boolean
          feature_key?: string
          release_state?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      platform_fx_rate_cache: {
        Row: {
          base_currency: string
          created_at: string
          expires_at: string
          provider_key: string
          provider_payload_hash: string | null
          quote_currency: string
          rate: number
          retrieved_at: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          expires_at: string
          provider_key: string
          provider_payload_hash?: string | null
          quote_currency: string
          rate: number
          retrieved_at: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          expires_at?: string
          provider_key?: string
          provider_payload_hash?: string | null
          quote_currency?: string
          rate?: number
          retrieved_at?: string
        }
        Relationships: []
      }
      platform_release_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          rollout_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          rollout_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          rollout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_release_audit_rollout_id_fkey"
            columns: ["rollout_id"]
            isOneToOne: false
            referencedRelation: "platform_release_rollouts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_release_observations: {
        Row: {
          error_code: string | null
          id: string
          latency_ms: number | null
          observed_at: string
          release_key: string
          rollout_id: string | null
          subject_bucket: number | null
          success: boolean
        }
        Insert: {
          error_code?: string | null
          id?: string
          latency_ms?: number | null
          observed_at?: string
          release_key: string
          rollout_id?: string | null
          subject_bucket?: number | null
          success: boolean
        }
        Update: {
          error_code?: string | null
          id?: string
          latency_ms?: number | null
          observed_at?: string
          release_key?: string
          rollout_id?: string | null
          subject_bucket?: number | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "platform_release_observations_rollout_id_fkey"
            columns: ["rollout_id"]
            isOneToOne: false
            referencedRelation: "platform_release_rollouts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_release_rollouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          config: Json
          created_at: string
          created_by: string | null
          error_rate_threshold: number
          health_window_seconds: number
          id: string
          latency_p95_threshold_ms: number
          minimum_samples: number
          release_key: string
          release_version: string
          rolled_back_at: string | null
          rolled_back_by: string | null
          state: string
          traffic_percentage: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          error_rate_threshold?: number
          health_window_seconds?: number
          id?: string
          latency_p95_threshold_ms?: number
          minimum_samples?: number
          release_key: string
          release_version: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          state?: string
          traffic_percentage?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          error_rate_threshold?: number
          health_window_seconds?: number
          id?: string
          latency_p95_threshold_ms?: number
          minimum_samples?: number
          release_key?: string
          release_version?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          state?: string
          traffic_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_security_alerts: {
        Row: {
          actor_id: string | null
          created_at: string
          dedupe_key: string | null
          details: Json
          entity_id: string | null
          entity_type: string | null
          event_key: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_audit_id: string | null
          summary: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_key: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source_audit_id?: string | null
          summary: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_audit_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_security_alerts_source_audit_id_fkey"
            columns: ["source_audit_id"]
            isOneToOne: true
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          kyc_full_name: string | null
          kyc_id_type: string | null
          kyc_id_url: string | null
          kyc_selfie_url: string | null
          kyc_status: string
          kyc_submitted_at: string | null
          kyc_verified_at: string | null
          language: string | null
          locale_code: string | null
          preferred_country: string | null
          preferred_currency: string | null
          preferred_locale: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_full_name?: string | null
          kyc_id_type?: string | null
          kyc_id_url?: string | null
          kyc_selfie_url?: string | null
          kyc_status?: string
          kyc_submitted_at?: string | null
          kyc_verified_at?: string | null
          language?: string | null
          locale_code?: string | null
          preferred_country?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_full_name?: string | null
          kyc_id_type?: string | null
          kyc_id_url?: string | null
          kyc_selfie_url?: string | null
          kyc_status?: string
          kyc_submitted_at?: string | null
          kyc_verified_at?: string | null
          language?: string | null
          locale_code?: string | null
          preferred_country?: string | null
          preferred_currency?: string | null
          preferred_locale?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          owner_id: string | null
          placement: string
          screening_id: string | null
          sort_order: number
          starts_at: string | null
          status: string
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          owner_id?: string | null
          placement?: string
          screening_id?: string | null
          sort_order?: number
          starts_at?: string | null
          status?: string
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          owner_id?: string | null
          placement?: string
          screening_id?: string | null
          sort_order?: number
          starts_at?: string | null
          status?: string
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          screening_id: string | null
          tenant_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          screening_id?: string | null
          tenant_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          screening_id?: string | null
          tenant_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      release_domains: {
        Row: {
          branding: Json
          branding_version: number | null
          content_id: string
          created_at: string
          dns_target: string | null
          dns_verified_at: string | null
          domain_kind: string
          hostname: string
          id: string
          last_verification_at: string | null
          seo_metadata: Json
          ssl_certificate_expires_at: string | null
          ssl_provider_key: string | null
          ssl_status: string
          status: string
          subdomain: string
          tenant_id: string | null
          updated_at: string
          verification_error: string | null
          verification_status:
            | Database["public"]["Enums"]["production_domain_status"]
            | null
          verification_token_hash: string | null
          verified_at: string | null
        }
        Insert: {
          branding?: Json
          branding_version?: number | null
          content_id: string
          created_at?: string
          dns_target?: string | null
          dns_verified_at?: string | null
          domain_kind?: string
          hostname: string
          id?: string
          last_verification_at?: string | null
          seo_metadata?: Json
          ssl_certificate_expires_at?: string | null
          ssl_provider_key?: string | null
          ssl_status?: string
          status?: string
          subdomain: string
          tenant_id?: string | null
          updated_at?: string
          verification_error?: string | null
          verification_status?:
            | Database["public"]["Enums"]["production_domain_status"]
            | null
          verification_token_hash?: string | null
          verified_at?: string | null
        }
        Update: {
          branding?: Json
          branding_version?: number | null
          content_id?: string
          created_at?: string
          dns_target?: string | null
          dns_verified_at?: string | null
          domain_kind?: string
          hostname?: string
          id?: string
          last_verification_at?: string | null
          seo_metadata?: Json
          ssl_certificate_expires_at?: string | null
          ssl_provider_key?: string | null
          ssl_status?: string
          status?: string
          subdomain?: string
          tenant_id?: string | null
          updated_at?: string
          verification_error?: string | null
          verification_status?:
            | Database["public"]["Enums"]["production_domain_status"]
            | null
          verification_token_hash?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_domains_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_domains_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_splits: {
        Row: {
          content_id: string | null
          created_at: string
          creator_share: number
          id: string
          is_default: boolean | null
          licensee_share: number
          platform_share: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          creator_share?: number
          id?: string
          is_default?: boolean | null
          licensee_share?: number
          platform_share?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          creator_share?: number
          id?: string
          is_default?: boolean | null
          licensee_share?: number
          platform_share?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_comments: {
        Row: {
          comment: string
          created_at: string
          email: string | null
          id: string
          nickname: string
          screening_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          email?: string | null
          id?: string
          nickname: string
          screening_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          email?: string | null
          id?: string
          nickname?: string
          screening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_comments_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_comments_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_notifications: {
        Row: {
          created_at: string
          email: string
          id: string
          screening_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          screening_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          screening_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_notifications_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_notifications_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_playback_sessions: {
        Row: {
          country_code: string | null
          expires_at: string
          id: string
          last_seen_at: string
          revoked_at: string | null
          screening_id: string
          session_token_hash: string
          started_at: string
          tenant_id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          country_code?: string | null
          expires_at: string
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          screening_id: string
          session_token_hash: string
          started_at?: string
          tenant_id: string
          ticket_id: string
          user_id: string
        }
        Update: {
          country_code?: string | null
          expires_at?: string
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          screening_id?: string
          session_token_hash?: string
          started_at?: string
          tenant_id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_playback_sessions_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_playback_sessions_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_playback_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_tickets: {
        Row: {
          access_hours: number | null
          active_session_expires_at: string | null
          active_session_started_at: string | null
          active_session_token: string | null
          addons: Json | null
          created_at: string
          creator_base_currency: string | null
          currency: string | null
          display_amount: number | null
          display_currency: string | null
          email: string
          expires_at: string
          first_played_at: string | null
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          gift_from: string | null
          gift_message: string | null
          id: string
          is_used: boolean | null
          last_country: string | null
          last_ip: string | null
          location: string
          original_currency: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          payout_currency: string | null
          platform_base_currency: string | null
          price: number
          refund_reason: string | null
          refunded_at: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          screening_id: string
          settlement_currency: string | null
          stream_count: number
          tenant_id: string
          ticket_code: string
          ticket_kind: string
          used_at: string | null
          user_id: string | null
          watch_code: string
          watch_url: string | null
        }
        Insert: {
          access_hours?: number | null
          active_session_expires_at?: string | null
          active_session_started_at?: string | null
          active_session_token?: string | null
          addons?: Json | null
          created_at?: string
          creator_base_currency?: string | null
          currency?: string | null
          display_amount?: number | null
          display_currency?: string | null
          email: string
          expires_at?: string
          first_played_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          gift_from?: string | null
          gift_message?: string | null
          id?: string
          is_used?: boolean | null
          last_country?: string | null
          last_ip?: string | null
          location: string
          original_currency?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_currency?: string | null
          platform_base_currency?: string | null
          price: number
          refund_reason?: string | null
          refunded_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          screening_id: string
          settlement_currency?: string | null
          stream_count?: number
          tenant_id: string
          ticket_code: string
          ticket_kind?: string
          used_at?: string | null
          user_id?: string | null
          watch_code: string
          watch_url?: string | null
        }
        Update: {
          access_hours?: number | null
          active_session_expires_at?: string | null
          active_session_started_at?: string | null
          active_session_token?: string | null
          addons?: Json | null
          created_at?: string
          creator_base_currency?: string | null
          currency?: string | null
          display_amount?: number | null
          display_currency?: string | null
          email?: string
          expires_at?: string
          first_played_at?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          gift_from?: string | null
          gift_message?: string | null
          id?: string
          is_used?: boolean | null
          last_country?: string | null
          last_ip?: string | null
          location?: string
          original_currency?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_currency?: string | null
          platform_base_currency?: string | null
          price?: number
          refund_reason?: string | null
          refunded_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          screening_id?: string
          settlement_currency?: string | null
          stream_count?: number
          tenant_id?: string
          ticket_code?: string
          ticket_kind?: string
          used_at?: string | null
          user_id?: string | null
          watch_code?: string
          watch_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_tickets_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_tickets_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      screenings: {
        Row: {
          access_model: string
          age_rating: string | null
          allowed_countries: string[] | null
          auto_convert_to_vod: boolean
          banner_url: string | null
          base_currency: string | null
          base_price: number | null
          blocked_countries: string[] | null
          cancelled_at: string | null
          cast_crew: Json | null
          content_id: string
          created_at: string
          description: string | null
          duration: number | null
          early_bird_capacity: number | null
          early_bird_currency: string | null
          early_bird_ends_at: string | null
          early_bird_price: number | null
          event_timezone: string
          event_type: string
          event_visibility: string
          gallery_images: string[] | null
          id: string
          invite_only: boolean
          lifecycle: string
          live_ended_at: string | null
          live_price_ngn: number | null
          live_price_usd: number | null
          live_provider_asset_id: string | null
          live_recording_status: string
          live_replay_ready_at: string | null
          live_started_at: string | null
          location_pricing: Json
          max_concurrent_streams: number
          max_streams_per_ticket: number
          metadata: Json | null
          poster_url: string | null
          presale_enabled: boolean
          price_amount: number | null
          price_currency: string | null
          refund_policy: string | null
          release_access_at: string | null
          release_date: string | null
          replay_access_hours: number
          replay_access_model: string
          replay_base_price: number | null
          replay_price_amount: number | null
          replay_price_currency: string | null
          replay_price_ngn: number | null
          replay_price_usd: number | null
          review_count: number | null
          sales_close_at: string | null
          sales_open_at: string | null
          screening_date: string | null
          settlement_delivery_required: boolean
          settlement_hold_hours: number
          slug: string
          star_rating: number | null
          status: string
          tenant_id: string
          territory_allowlist: string[]
          territory_blocklist: string[]
          title: string
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          access_model?: string
          age_rating?: string | null
          allowed_countries?: string[] | null
          auto_convert_to_vod?: boolean
          banner_url?: string | null
          base_currency?: string | null
          base_price?: number | null
          blocked_countries?: string[] | null
          cancelled_at?: string | null
          cast_crew?: Json | null
          content_id: string
          created_at?: string
          description?: string | null
          duration?: number | null
          early_bird_capacity?: number | null
          early_bird_currency?: string | null
          early_bird_ends_at?: string | null
          early_bird_price?: number | null
          event_timezone?: string
          event_type?: string
          event_visibility?: string
          gallery_images?: string[] | null
          id?: string
          invite_only?: boolean
          lifecycle?: string
          live_ended_at?: string | null
          live_price_ngn?: number | null
          live_price_usd?: number | null
          live_provider_asset_id?: string | null
          live_recording_status?: string
          live_replay_ready_at?: string | null
          live_started_at?: string | null
          location_pricing?: Json
          max_concurrent_streams?: number
          max_streams_per_ticket?: number
          metadata?: Json | null
          poster_url?: string | null
          presale_enabled?: boolean
          price_amount?: number | null
          price_currency?: string | null
          refund_policy?: string | null
          release_access_at?: string | null
          release_date?: string | null
          replay_access_hours?: number
          replay_access_model?: string
          replay_base_price?: number | null
          replay_price_amount?: number | null
          replay_price_currency?: string | null
          replay_price_ngn?: number | null
          replay_price_usd?: number | null
          review_count?: number | null
          sales_close_at?: string | null
          sales_open_at?: string | null
          screening_date?: string | null
          settlement_delivery_required?: boolean
          settlement_hold_hours?: number
          slug: string
          star_rating?: number | null
          status?: string
          tenant_id: string
          territory_allowlist?: string[]
          territory_blocklist?: string[]
          title: string
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          access_model?: string
          age_rating?: string | null
          allowed_countries?: string[] | null
          auto_convert_to_vod?: boolean
          banner_url?: string | null
          base_currency?: string | null
          base_price?: number | null
          blocked_countries?: string[] | null
          cancelled_at?: string | null
          cast_crew?: Json | null
          content_id?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          early_bird_capacity?: number | null
          early_bird_currency?: string | null
          early_bird_ends_at?: string | null
          early_bird_price?: number | null
          event_timezone?: string
          event_type?: string
          event_visibility?: string
          gallery_images?: string[] | null
          id?: string
          invite_only?: boolean
          lifecycle?: string
          live_ended_at?: string | null
          live_price_ngn?: number | null
          live_price_usd?: number | null
          live_provider_asset_id?: string | null
          live_recording_status?: string
          live_replay_ready_at?: string | null
          live_started_at?: string | null
          location_pricing?: Json
          max_concurrent_streams?: number
          max_streams_per_ticket?: number
          metadata?: Json | null
          poster_url?: string | null
          presale_enabled?: boolean
          price_amount?: number | null
          price_currency?: string | null
          refund_policy?: string | null
          release_access_at?: string | null
          release_date?: string | null
          replay_access_hours?: number
          replay_access_model?: string
          replay_base_price?: number | null
          replay_price_amount?: number | null
          replay_price_currency?: string | null
          replay_price_ngn?: number | null
          replay_price_usd?: number | null
          review_count?: number | null
          sales_close_at?: string | null
          sales_open_at?: string | null
          screening_date?: string | null
          settlement_delivery_required?: boolean
          settlement_hold_hours?: number
          slug?: string
          star_rating?: number | null
          status?: string
          tenant_id?: string
          territory_allowlist?: string[]
          territory_blocklist?: string[]
          title?: string
          trailer_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_provider_bindings: {
        Row: {
          base_url: string | null
          capability: string
          created_at: string
          credential_secret_ref: string | null
          enabled: boolean
          endpoints: Json
          health_checked_at: string | null
          health_error: string | null
          health_status: string
          id: string
          is_live: boolean
          live_credential_secret_ref: string | null
          live_webhook_secret_ref: string | null
          priority: number
          provider_key: string
          removed_at: string | null
          settings: Json
          test_credential_secret_ref: string | null
          test_webhook_secret_ref: string | null
          updated_at: string
          updated_by: string | null
          webhook_secret_ref: string | null
        }
        Insert: {
          base_url?: string | null
          capability: string
          created_at?: string
          credential_secret_ref?: string | null
          enabled?: boolean
          endpoints?: Json
          health_checked_at?: string | null
          health_error?: string | null
          health_status?: string
          id?: string
          is_live?: boolean
          live_credential_secret_ref?: string | null
          live_webhook_secret_ref?: string | null
          priority?: number
          provider_key: string
          removed_at?: string | null
          settings?: Json
          test_credential_secret_ref?: string | null
          test_webhook_secret_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret_ref?: string | null
        }
        Update: {
          base_url?: string | null
          capability?: string
          created_at?: string
          credential_secret_ref?: string | null
          enabled?: boolean
          endpoints?: Json
          health_checked_at?: string | null
          health_error?: string | null
          health_status?: string
          id?: string
          is_live?: boolean
          live_credential_secret_ref?: string | null
          live_webhook_secret_ref?: string | null
          priority?: number
          provider_key?: string
          removed_at?: string | null
          settings?: Json
          test_credential_secret_ref?: string | null
          test_webhook_secret_ref?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret_ref?: string | null
        }
        Relationships: []
      }
      service_provider_secret_versions: {
        Row: {
          capability: string
          created_at: string
          created_by: string | null
          id: string
          provider_key: string
          retired_at: string | null
          secret_kind: string
          secret_ref: string
          version: number
        }
        Insert: {
          capability: string
          created_at?: string
          created_by?: string | null
          id?: string
          provider_key: string
          retired_at?: string | null
          secret_kind: string
          secret_ref: string
          version: number
        }
        Update: {
          capability?: string
          created_at?: string
          created_by?: string | null
          id?: string
          provider_key?: string
          retired_at?: string | null
          secret_kind?: string
          secret_ref?: string
          version?: number
        }
        Relationships: []
      }
      stream_configs: {
        Row: {
          id: string
          ingest_url: string | null
          is_live: boolean
          playback_url: string | null
          provider: string
          screening_id: string | null
          simulcast_targets: Json
          stream_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          ingest_url?: string | null
          is_live?: boolean
          playback_url?: string | null
          provider?: string
          screening_id?: string | null
          simulcast_targets?: Json
          stream_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          ingest_url?: string | null
          is_live?: boolean
          playback_url?: string | null
          provider?: string
          screening_id?: string | null
          simulcast_targets?: Json
          stream_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stream_provider_event_logs: {
        Row: {
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider_event_id: string
          provider_key: string
          received_at: string
          stream_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id: string
          provider_key: string
          received_at?: string
          stream_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id?: string
          provider_key?: string
          received_at?: string
          stream_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_provider_event_logs_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_accounts: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          base_currency: string | null
          cac_doc_path: string | null
          cac_number: string | null
          company_name: string | null
          country_code: string | null
          created_at: string
          entity_type: Database["public"]["Enums"]["creator_entity_type"]
          id: string
          payout_account_name: string | null
          payout_bank_country: string | null
          payout_bank_name: string | null
          payout_bank_secret_ref: string | null
          payout_bank_suffix: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rights_declaration: Json
          rights_declared: boolean
          seats: number
          status: string
          tax_country: string | null
          tax_id: string | null
          tax_identifier_suffix: string | null
          tax_secret_ref: string | null
          tier: string
          updated_at: string
          user_id: string
          verification_reason: string | null
          verification_reviewed_at: string | null
          verification_reviewed_by: string | null
          verification_status: Database["public"]["Enums"]["creator_verification_status"]
          verification_submitted_at: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_currency?: string | null
          cac_doc_path?: string | null
          cac_number?: string | null
          company_name?: string | null
          country_code?: string | null
          created_at?: string
          entity_type?: Database["public"]["Enums"]["creator_entity_type"]
          id?: string
          payout_account_name?: string | null
          payout_bank_country?: string | null
          payout_bank_name?: string | null
          payout_bank_secret_ref?: string | null
          payout_bank_suffix?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_declaration?: Json
          rights_declared?: boolean
          seats?: number
          status?: string
          tax_country?: string | null
          tax_id?: string | null
          tax_identifier_suffix?: string | null
          tax_secret_ref?: string | null
          tier?: string
          updated_at?: string
          user_id: string
          verification_reason?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_status?: Database["public"]["Enums"]["creator_verification_status"]
          verification_submitted_at?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_currency?: string | null
          cac_doc_path?: string | null
          cac_number?: string | null
          company_name?: string | null
          country_code?: string | null
          created_at?: string
          entity_type?: Database["public"]["Enums"]["creator_entity_type"]
          id?: string
          payout_account_name?: string | null
          payout_bank_country?: string | null
          payout_bank_name?: string | null
          payout_bank_secret_ref?: string | null
          payout_bank_suffix?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_declaration?: Json
          rights_declared?: boolean
          seats?: number
          status?: string
          tax_country?: string | null
          tax_id?: string | null
          tax_identifier_suffix?: string | null
          tax_secret_ref?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
          verification_reason?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_status?: Database["public"]["Enums"]["creator_verification_status"]
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
      studio_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_user_id: string | null
          revoked_at: string | null
          role: string
          studio_account_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          invited_user_id?: string | null
          revoked_at?: string | null
          role: string
          studio_account_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string | null
          revoked_at?: string | null
          role?: string
          studio_account_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_invitations_studio_account_id_fkey"
            columns: ["studio_account_id"]
            isOneToOne: false
            referencedRelation: "studio_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_members: {
        Row: {
          created_at: string
          id: string
          member_email: string
          member_user_id: string | null
          owner_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_email: string
          member_user_id?: string | null
          owner_id: string
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_email?: string
          member_user_id?: string | null
          owner_id?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
      studio_memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: string
          studio_account_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: string
          studio_account_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: string
          studio_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_memberships_studio_account_id_fkey"
            columns: ["studio_account_id"]
            isOneToOne: false
            referencedRelation: "studio_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          interval: string | null
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          stripe_price_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          stripe_price_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_agents: {
        Row: {
          created_at: string
          department: string
          display_name: string | null
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string
          display_name?: string | null
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          display_name?: string | null
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_paths: string[]
          body: string
          created_at: string
          id: string
          is_internal: boolean
          read_at: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_paths?: string[]
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          read_at?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_paths?: string[]
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          read_at?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sla_policies: {
        Row: {
          first_response_minutes: number
          is_active: boolean
          priority: string
          resolution_minutes: number
          updated_at: string
        }
        Insert: {
          first_response_minutes: number
          is_active?: boolean
          priority: string
          resolution_minutes: number
          updated_at?: string
        }
        Update: {
          first_response_minutes?: number
          is_active?: boolean
          priority?: string
          resolution_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_agent_id: string | null
          category: string
          channel: string
          closed_at: string | null
          created_at: string
          department: string
          description: string
          escalated_at: string | null
          first_responded_at: string | null
          first_response_due_at: string | null
          id: string
          last_message_at: string
          priority: string
          related_content_id: string | null
          related_event_id: string | null
          related_transaction_reference: string | null
          resolution: string | null
          resolution_due_at: string | null
          resolved_at: string | null
          satisfaction_rating: number | null
          status: string
          subject: string
          ticket_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agent_id?: string | null
          category: string
          channel?: string
          closed_at?: string | null
          created_at?: string
          department?: string
          description: string
          escalated_at?: string | null
          first_responded_at?: string | null
          first_response_due_at?: string | null
          id?: string
          last_message_at?: string
          priority?: string
          related_content_id?: string | null
          related_event_id?: string | null
          related_transaction_reference?: string | null
          resolution?: string | null
          resolution_due_at?: string | null
          resolved_at?: string | null
          satisfaction_rating?: number | null
          status?: string
          subject: string
          ticket_number?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_agent_id?: string | null
          category?: string
          channel?: string
          closed_at?: string | null
          created_at?: string
          department?: string
          description?: string
          escalated_at?: string | null
          first_responded_at?: string | null
          first_response_due_at?: string | null
          id?: string
          last_message_at?: string
          priority?: string
          related_content_id?: string | null
          related_event_id?: string | null
          related_transaction_reference?: string | null
          resolution?: string | null
          resolution_due_at?: string | null
          resolved_at?: string | null
          satisfaction_rating?: number | null
          status?: string
          subject?: string
          ticket_number?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "support_agents"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tenants: {
        Row: {
          cdn_config: Json | null
          created_at: string
          custom_domain: string | null
          favicon_url: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          payment_config: Json | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at: string
        }
        Insert: {
          cdn_config?: Json | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          payment_config?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          type?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Update: {
          cdn_config?: Json | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          payment_config?: Json | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          type?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          active_session_expires_at: string | null
          active_session_started_at: string | null
          active_session_token: string | null
          claim_token_hash: string | null
          claimed_at: string | null
          content_id: string | null
          created_at: string
          creator_base_currency: string | null
          currency: string | null
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          guest_email: string | null
          id: string
          is_used: boolean | null
          metadata: Json | null
          original_currency: string | null
          payout_currency: string | null
          platform_base_currency: string | null
          price: number
          revocation_reason: string | null
          revoked_at: string | null
          settlement_currency: string | null
          stream_count: number
          stream_id: string | null
          tenant_id: string
          ticket_code: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          used_at: string | null
          user_id: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          active_session_expires_at?: string | null
          active_session_started_at?: string | null
          active_session_token?: string | null
          claim_token_hash?: string | null
          claimed_at?: string | null
          content_id?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          guest_email?: string | null
          id?: string
          is_used?: boolean | null
          metadata?: Json | null
          original_currency?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          price: number
          revocation_reason?: string | null
          revoked_at?: string | null
          settlement_currency?: string | null
          stream_count?: number
          stream_id?: string | null
          tenant_id: string
          ticket_code: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          used_at?: string | null
          user_id?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          active_session_expires_at?: string | null
          active_session_started_at?: string | null
          active_session_token?: string | null
          claim_token_hash?: string | null
          claimed_at?: string | null
          content_id?: string | null
          created_at?: string
          creator_base_currency?: string | null
          currency?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          guest_email?: string | null
          id?: string
          is_used?: boolean | null
          metadata?: Json | null
          original_currency?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          price?: number
          revocation_reason?: string | null
          revoked_at?: string | null
          settlement_currency?: string | null
          stream_count?: number
          stream_id?: string | null
          tenant_id?: string
          ticket_code?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          used_at?: string | null
          user_id?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          created_at: string
          creator_base_currency: string | null
          currency: string
          event_contribution_id: string | null
          fee: number
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          gross: number
          id: string
          kind: string
          net: number
          original_currency: string | null
          payout_currency: string | null
          platform_base_currency: string | null
          screening_id: string | null
          settlement_currency: string | null
          settles_at: string
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_base_currency?: string | null
          currency?: string
          event_contribution_id?: string | null
          fee?: number
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          gross?: number
          id?: string
          kind?: string
          net?: number
          original_currency?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          screening_id?: string | null
          settlement_currency?: string | null
          settles_at?: string
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          creator_base_currency?: string | null
          currency?: string
          event_contribution_id?: string | null
          fee?: number
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          gross?: number
          id?: string
          kind?: string
          net?: number
          original_currency?: string | null
          payout_currency?: string | null
          platform_base_currency?: string | null
          screening_id?: string | null
          settlement_currency?: string | null
          settles_at?: string
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_event_contribution_id_fkey"
            columns: ["event_contribution_id"]
            isOneToOne: false
            referencedRelation: "event_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topup_orders: {
        Row: {
          amount_major: number
          amount_minor: number
          checkout_url: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          paid_at: string | null
          provider_checkout_id: string | null
          provider_key: string
          provider_mode: string
          provider_reference: string
          provider_transaction_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_major: number
          amount_minor: number
          checkout_url?: string | null
          created_at?: string
          currency: string
          id?: string
          idempotency_key: string
          paid_at?: string | null
          provider_checkout_id?: string | null
          provider_key: string
          provider_mode: string
          provider_reference: string
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_major?: number
          amount_minor?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          provider_checkout_id?: string | null
          provider_key?: string
          provider_mode?: string
          provider_reference?: string
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          city: string | null
          completed: boolean | null
          content_id: string | null
          country: string | null
          created_at: string
          id: string
          last_watched_at: string
          screening_id: string | null
          session_id: string | null
          tenant_id: string | null
          user_id: string | null
          watch_duration: number | null
          watch_duration_seconds: number
          watch_position: number | null
        }
        Insert: {
          city?: string | null
          completed?: boolean | null
          content_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          last_watched_at?: string
          screening_id?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
          watch_duration?: number | null
          watch_duration_seconds?: number
          watch_position?: number | null
        }
        Update: {
          city?: string | null
          completed?: boolean | null
          content_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          last_watched_at?: string
          screening_id?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
          watch_duration?: number | null
          watch_duration_seconds?: number
          watch_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_participants: {
        Row: {
          display_name: string | null
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "watch_party_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_rooms: {
        Row: {
          created_at: string
          current_position: number
          host_user_id: string
          id: string
          is_playing: boolean
          last_event_at: string
          name: string | null
          room_code: string
          screening_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_position?: number
          host_user_id: string
          id?: string
          is_playing?: boolean
          last_event_at?: string
          name?: string | null
          room_code: string
          screening_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_position?: number
          host_user_id?: string
          id?: string
          is_playing?: boolean
          last_event_at?: string
          name?: string | null
          room_code?: string
          screening_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_rooms_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "public_screenings_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_party_rooms_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          content_id: string
          created_at: string
          id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlists_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "public_content_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          account_secret_ref: string
          admin_note: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_country: string | null
          bank_name: string
          created_at: string
          creator_base_currency: string | null
          currency: string
          failure_reason: string | null
          fx_provider: string | null
          fx_rate: number | null
          fx_timestamp: string | null
          id: string
          original_currency: string | null
          paid_at: string | null
          payout_currency: string | null
          payout_provider_key: string | null
          payout_reference: string | null
          platform_base_currency: string | null
          processing_at: string | null
          processing_by: string | null
          rejected_at: string | null
          rejected_by: string | null
          settlement_currency: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          account_secret_ref: string
          admin_note?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_country?: string | null
          bank_name: string
          created_at?: string
          creator_base_currency?: string | null
          currency?: string
          failure_reason?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          payout_provider_key?: string | null
          payout_reference?: string | null
          platform_base_currency?: string | null
          processing_at?: string | null
          processing_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          settlement_currency?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          account_secret_ref?: string
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_country?: string | null
          bank_name?: string
          created_at?: string
          creator_base_currency?: string | null
          currency?: string
          failure_reason?: string | null
          fx_provider?: string | null
          fx_rate?: number | null
          fx_timestamp?: string | null
          id?: string
          original_currency?: string | null
          paid_at?: string | null
          payout_currency?: string | null
          payout_provider_key?: string | null
          payout_reference?: string | null
          platform_base_currency?: string | null
          processing_at?: string | null
          processing_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          settlement_currency?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_content_catalog: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          genres: string[] | null
          id: string | null
          poster_url: string | null
          release_date: string | null
          title: string | null
          trailer_url: string | null
          type: Database["public"]["Enums"]["content_type"] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          genres?: string[] | null
          id?: string | null
          poster_url?: string | null
          release_date?: string | null
          title?: string | null
          trailer_url?: string | null
          type?: Database["public"]["Enums"]["content_type"] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          genres?: string[] | null
          id?: string | null
          poster_url?: string | null
          release_date?: string | null
          title?: string | null
          trailer_url?: string | null
          type?: Database["public"]["Enums"]["content_type"] | null
        }
        Relationships: []
      }
      public_screenings_catalog: {
        Row: {
          access_model: string | null
          age_rating: string | null
          allowed_countries: string[] | null
          banner_url: string | null
          base_currency: string | null
          base_price: number | null
          blocked_countries: string[] | null
          cancelled_at: string | null
          cast_crew: Json | null
          content_id: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          early_bird_capacity: number | null
          early_bird_currency: string | null
          early_bird_ends_at: string | null
          early_bird_price: number | null
          event_timezone: string | null
          event_type: string | null
          event_visibility: string | null
          gallery_images: string[] | null
          id: string | null
          invite_only: boolean | null
          lifecycle: string | null
          live_ended_at: string | null
          live_price_ngn: number | null
          live_price_usd: number | null
          live_recording_status: string | null
          live_replay_ready_at: string | null
          live_started_at: string | null
          location_pricing: Json | null
          poster_url: string | null
          presale_enabled: boolean | null
          refund_policy: string | null
          release_access_at: string | null
          release_date: string | null
          replay_access_hours: number | null
          replay_access_model: string | null
          replay_base_price: number | null
          replay_price_ngn: number | null
          replay_price_usd: number | null
          review_count: number | null
          sales_close_at: string | null
          sales_open_at: string | null
          screening_date: string | null
          slug: string | null
          star_rating: number | null
          status: string | null
          title: string | null
          trailer_url: string | null
          updated_at: string | null
        }
        Insert: {
          access_model?: string | null
          age_rating?: string | null
          allowed_countries?: string[] | null
          banner_url?: string | null
          base_currency?: string | null
          base_price?: number | null
          blocked_countries?: string[] | null
          cancelled_at?: string | null
          cast_crew?: Json | null
          content_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          early_bird_capacity?: number | null
          early_bird_currency?: string | null
          early_bird_ends_at?: string | null
          early_bird_price?: number | null
          event_timezone?: string | null
          event_type?: string | null
          event_visibility?: string | null
          gallery_images?: string[] | null
          id?: string | null
          invite_only?: boolean | null
          lifecycle?: string | null
          live_ended_at?: string | null
          live_price_ngn?: number | null
          live_price_usd?: number | null
          live_recording_status?: string | null
          live_replay_ready_at?: string | null
          live_started_at?: string | null
          location_pricing?: Json | null
          poster_url?: string | null
          presale_enabled?: boolean | null
          refund_policy?: string | null
          release_access_at?: string | null
          release_date?: string | null
          replay_access_hours?: number | null
          replay_access_model?: string | null
          replay_base_price?: number | null
          replay_price_ngn?: number | null
          replay_price_usd?: number | null
          review_count?: number | null
          sales_close_at?: string | null
          sales_open_at?: string | null
          screening_date?: string | null
          slug?: string | null
          star_rating?: number | null
          status?: string | null
          title?: string | null
          trailer_url?: string | null
          updated_at?: string | null
        }
        Update: {
          access_model?: string | null
          age_rating?: string | null
          allowed_countries?: string[] | null
          banner_url?: string | null
          base_currency?: string | null
          base_price?: number | null
          blocked_countries?: string[] | null
          cancelled_at?: string | null
          cast_crew?: Json | null
          content_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          early_bird_capacity?: number | null
          early_bird_currency?: string | null
          early_bird_ends_at?: string | null
          early_bird_price?: number | null
          event_timezone?: string | null
          event_type?: string | null
          event_visibility?: string | null
          gallery_images?: string[] | null
          id?: string | null
          invite_only?: boolean | null
          lifecycle?: string | null
          live_ended_at?: string | null
          live_price_ngn?: number | null
          live_price_usd?: number | null
          live_recording_status?: string | null
          live_replay_ready_at?: string | null
          live_started_at?: string | null
          location_pricing?: Json | null
          poster_url?: string | null
          presale_enabled?: boolean | null
          refund_policy?: string | null
          release_access_at?: string | null
          release_date?: string | null
          replay_access_hours?: number | null
          replay_access_model?: string | null
          replay_base_price?: number | null
          replay_price_ngn?: number | null
          replay_price_usd?: number | null
          review_count?: number | null
          sales_close_at?: string | null
          sales_open_at?: string | null
          screening_date?: string | null
          slug?: string | null
          star_rating?: number | null
          status?: string | null
          title?: string | null
          trailer_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_ticket_entitlements: {
        Row: {
          currency: string | null
          email: string | null
          entitlement_id: string | null
          entitlement_status: string | null
          is_active: boolean | null
          payment_reference: string | null
          payment_status: string | null
          price: number | null
          purchased_at: string | null
          revoked_at: string | null
          screening_id: string | null
          source_type: string | null
          stream_id: string | null
          ticket_code: string | null
          ticket_type: string | null
          user_id: string | null
          valid_until: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_studio_invitation: {
        Args: { p_email: string; p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      accept_studio_invites: { Args: never; Returns: number }
      admin_configure_email_provider: {
        Args: {
          p_enabled?: boolean
          p_from_email?: string
          p_from_name?: string
          p_live?: boolean
          p_live_secret?: string
          p_reply_to?: string
          p_test_secret?: string
        }
        Returns: Json
      }
      admin_configure_payment_provider: {
        Args: {
          p_enabled?: boolean
          p_live?: boolean
          p_live_public_key?: string
          p_live_secret?: string
          p_provider: string
          p_test_public_key?: string
          p_test_secret?: string
          p_webhook_secret?: string
        }
        Returns: Json
      }
      admin_configure_service_provider: {
        Args: {
          p_base_url?: string
          p_capability: string
          p_credential?: string
          p_enabled: boolean
          p_endpoints?: Json
          p_is_live: boolean
          p_provider_key: string
          p_remove?: boolean
          p_settings?: Json
          p_webhook_secret?: string
        }
        Returns: Json
      }
      admin_configure_service_provider_modes: {
        Args: {
          p_base_url?: string
          p_capability: string
          p_enabled: boolean
          p_endpoints?: Json
          p_is_live: boolean
          p_live_credential?: string
          p_live_webhook_secret?: string
          p_provider_key: string
          p_remove?: boolean
          p_settings?: Json
          p_test_credential?: string
          p_test_webhook_secret?: string
        }
        Returns: Json
      }
      admin_configure_service_provider_modes_with_priority: {
        Args: {
          p_base_url: string
          p_capability: string
          p_enabled: boolean
          p_endpoints: Json
          p_is_live: boolean
          p_live_credential: string
          p_live_webhook_secret: string
          p_priority: number
          p_provider_key: string
          p_settings: Json
          p_test_credential: string
          p_test_webhook_secret: string
        }
        Returns: Json
      }
      admin_list_tenants: {
        Args: never
        Returns: {
          content_count: number
          created_at: string
          custom_domain: string
          id: string
          is_active: boolean
          name: string
          published_content_count: number
          slug: string
          tenant_type: string
          user_count: number
        }[]
      }
      admin_set_tenant_status: {
        Args: { p_is_active: boolean; p_tenant_id: string }
        Returns: boolean
      }
      admin_upsert_country_currency_rule: {
        Args: {
          p_country_code: string
          p_currency_code: string
          p_currency_symbol: string
          p_enabled?: boolean
          p_locale_code?: string
          p_reason?: string
          p_timezone_name?: string
        }
        Returns: Json
      }
      admin_upsert_feature_control: {
        Args: {
          p_config: Json
          p_enabled: boolean
          p_feature_key: string
          p_reason: string
          p_release_state: string
          p_rollout_percentage: number
        }
        Returns: Json
      }
      apply_stream_provider_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_payload?: Json
          p_provider_key: string
          p_provider_reference: string
        }
        Returns: Json
      }
      authorize_legacy_screening_ticket_playback: {
        Args: {
          p_country_code: string
          p_email: string
          p_provider_expires_at: string
          p_session_token_hash: string
          p_watch_code: string
        }
        Returns: Json
      }
      authorize_screening_ticket_playback: {
        Args: {
          p_country_code?: string
          p_mode?: string
          p_screening_id: string
          p_session_token_hash: string
        }
        Returns: {
          session_expires_at: string
          session_id: string
          ticket_id: string
        }[]
      }
      claim_event_notification_outbox: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          content_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          live_stream_id: string | null
          notification_type: string
          payload: Json
          recipient_email: string
          recipient_user_id: string | null
          scheduled_for: string
          screening_id: string | null
          sent_at: string | null
          status: string
          tenant_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "event_notification_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_free_live_ticket: {
        Args: { p_screening_id: string }
        Returns: Json
      }
      claim_free_replay_ticket: {
        Args: { p_screening_id: string }
        Returns: Json
      }
      claim_guest_tickets: { Args: never; Returns: number }
      claim_live_guest_ticket: { Args: { p_token_hash: string }; Returns: Json }
      claim_live_payment_email: {
        Args: { p_reference: string }
        Returns: boolean
      }
      claim_media_processing_jobs: {
        Args: { p_limit?: number; p_worker: string }
        Returns: {
          attempts: number
          available_at: string
          clean_master_path: string | null
          content_id: string | null
          created_at: string
          dead_lettered_at: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          provenance: Json
          quarantine_path: string
          renditions: Json
          sha256: string | null
          stage: string
          status: Database["public"]["Enums"]["media_processing_status"]
          subtitles: Json
          updated_at: string
          upload_session_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "media_processing_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_event_contribution: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_reference: string
          p_transaction_id: string
        }
        Returns: Json
      }
      complete_guest_payment_order: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_reference: string
          p_transaction_id: string
        }
        Returns: Json
      }
      complete_live_payment_order:
        | {
            Args: {
              p_amount_minor: number
              p_currency: string
              p_reference: string
              p_transaction_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount_minor: number
              p_claim_token_hash?: string
              p_currency: string
              p_reference: string
              p_transaction_id: string
            }
            Returns: Json
          }
      complete_payment_refund: {
        Args: { p_provider_refund_id: string; p_refund_id: string }
        Returns: Json
      }
      confirm_event_delivery: {
        Args: {
          p_evidence?: Json
          p_live_stream_id?: string
          p_screening_id?: string
        }
        Returns: number
      }
      create_creator_screening: {
        Args: {
          p_content_id: string
          p_event_type: string
          p_location_pricing: Json
          p_screening_date: string
          p_slug: string
        }
        Returns: Json
      }
      create_creator_submission: { Args: { _application: Json }; Returns: Json }
      create_guest_payment_order: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_email: string
          p_location: string
          p_provider: string
          p_reference: string
          p_screening_id: string
          p_tenant_id: string
          p_ticket_code: string
          p_watch_code: string
        }
        Returns: string
      }
      create_guest_payment_order_v2: {
        Args: {
          p_amount_major: number
          p_amount_minor: number
          p_app_origin: string
          p_currency: string
          p_email: string
          p_location: string
          p_provider: string
          p_reference: string
          p_screening_id: string
          p_tenant_id: string
          p_ticket_code: string
          p_watch_code: string
        }
        Returns: string
      }
      create_guest_payment_order_v3: {
        Args: {
          p_amount_major: number
          p_amount_minor: number
          p_app_origin: string
          p_currency: string
          p_email: string
          p_location: string
          p_platform_fee_major: number
          p_provider: string
          p_reference: string
          p_screening_id: string
          p_tenant_id: string
          p_ticket_code: string
          p_watch_code: string
        }
        Returns: string
      }
      create_support_chat: { Args: never; Returns: Json }
      credit_personal_wallet_topup: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_reference: string
          p_transaction_id: string
        }
        Returns: Json
      }
      enqueue_event_cancellation_notifications: {
        Args: { p_screening_id: string }
        Returns: number
      }
      get_business_verification_material: {
        Args: { p_verification_id: string }
        Returns: {
          bank_account_name: string
          bank_account_number: string
          bank_country: string
          bank_name: string
          business_address: string
          business_city: string
          id: string
          identity_legal_name: string
          identity_verification_id: string
          legal_business_name: string
          registration_country: string
          registration_document_path: string
          registration_number: string
          tax_identifier: string
          user_id: string
          verification_mode: string
        }[]
      }
      get_content_support_feed: {
        Args: { p_content_id: string }
        Returns: {
          amount_major: number
          animation_duration_ms: number
          contribution_type: string
          contributor_name: string
          created_at: string
          currency: string
          gift_animation_url: string
          gift_asset_url: string
          gift_catalog_key: string
          gift_emoji: string
          gift_name: string
          id: string
          message: string
        }[]
      }
      get_email_provider_runtime_config: {
        Args: never
        Returns: {
          api_key: string
          from_email: string
          from_name: string
          is_enabled: boolean
          is_live: boolean
          reply_to: string
        }[]
      }
      get_event_contribution_feed: {
        Args: { p_live_stream_id?: string; p_screening_id?: string }
        Returns: {
          amount_major: number
          animation_duration_ms: number
          contribution_type: string
          contributor_name: string
          created_at: string
          currency: string
          gift_animation_url: string
          gift_asset_url: string
          gift_catalog_key: string
          gift_emoji: string
          gift_name: string
          id: string
          message: string
        }[]
      }
      get_event_contribution_leaderboard: {
        Args: {
          p_currency?: string
          p_target_id: string
          p_target_kind: string
        }
        Returns: {
          contribution_count: number
          contributor_name: string
          currency: string
          rank_position: number
          total_amount_major: number
        }[]
      }
      get_event_contribution_totals: {
        Args: { p_target_id: string; p_target_kind: string }
        Returns: {
          contribution_count: number
          currency: string
          gift_count: number
          supporter_count: number
          total_amount_major: number
        }[]
      }
      get_event_notification_worker_secret: { Args: never; Returns: string }
      get_media_transcoder_callback_secret: { Args: never; Returns: string }
      get_media_worker_secret: { Args: never; Returns: string }
      get_my_event_contributions: {
        Args: never
        Returns: {
          amount_major: number
          amount_minor: number
          contribution_type: string
          contributor_name: string
          currency: string
          event_title: string
          id: string
          is_anonymous: boolean
          message: string
          paid_at: string
          status: string
        }[]
      }
      get_my_live_stream_lifecycle: {
        Args: { p_screening_id: string }
        Returns: {
          actual_ended_at: string
          actual_started_at: string
          lifecycle_status: string
          reconnect_grace_expires_at: string
        }[]
      }
      get_my_personal_wallet_balances: {
        Args: never
        Returns: {
          balance_major: number
          balance_minor: number
          currency: string
        }[]
      }
      get_my_studio_account: {
        Args: never
        Returns: {
          status: string
          tier: string
        }[]
      }
      get_my_support_transactions: {
        Args: never
        Returns: {
          amount_major: number
          contribution_type: string
          created_at: string
          currency: string
          direction: string
          display_name: string
          id: string
          message: string
          status: string
          target_title: string
        }[]
      }
      get_my_tenant_config: {
        Args: never
        Returns: {
          created_at: string
          custom_domain: string
          favicon_url: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          updated_at: string
        }[]
      }
      get_my_wallet_activity: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          activity_type: string
          amount_major: number
          counterparty: string
          created_at: string
          currency: string
          description: string
          direction: string
          id: string
          reference: string
          status: string
        }[]
      }
      get_payment_provider_runtime_config: {
        Args: { p_provider: string }
        Returns: {
          is_enabled: boolean
          is_live: boolean
          provider: string
          public_key: string
          secret_key: string
          webhook_secret: string
        }[]
      }
      get_platform_release_assignment: {
        Args: { p_release_key: string; p_subject_id: string }
        Returns: {
          assigned: boolean
          cohort_basis: string
          release_version: string
          rollout_id: string
        }[]
      }
      get_service_provider_admin_secret: {
        Args: { p_capability: string; p_provider_key: string }
        Returns: {
          live_credential: string
          live_webhook_secret: string
          test_credential: string
          test_webhook_secret: string
        }[]
      }
      get_service_provider_runtime_config: {
        Args: { p_capability: string }
        Returns: {
          base_url: string
          capability: string
          credential: string
          endpoints: Json
          id: string
          is_live: boolean
          provider_key: string
          settings: Json
          webhook_secret: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_withdrawal_bank_details: {
        Args: { p_request_id: string }
        Returns: {
          account_name: string
          account_number: string
          bank_country: string
          bank_name: string
          request_id: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_studio_member: {
        Args: { p_roles?: string[]; p_studio_account_id: string }
        Returns: boolean
      }
      is_active_support_agent: { Args: { p_user_id: string }; Returns: boolean }
      is_approved_creator: { Args: { p_user_id: string }; Returns: boolean }
      is_filmmaker: { Args: { _user_id: string }; Returns: boolean }
      is_kyc_verified: { Args: { _user_id: string }; Returns: boolean }
      is_studio_member: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      publish_creator_content: { Args: { p_content_id: string }; Returns: Json }
      rate_support_ticket: {
        Args: { p_rating: number; p_ticket_id: string }
        Returns: Json
      }
      refresh_event_settlement_holds: {
        Args: { p_limit?: number }
        Returns: number
      }
      refund_personal_wallet_contribution: {
        Args: { p_contribution_id: string }
        Returns: Json
      }
      register_release_domain: {
        Args: {
          p_branding?: Json
          p_content_id: string
          p_custom_hostname?: string
          p_subdomain: string
        }
        Returns: {
          branding: Json
          branding_version: number | null
          content_id: string
          created_at: string
          dns_target: string | null
          dns_verified_at: string | null
          domain_kind: string
          hostname: string
          id: string
          last_verification_at: string | null
          seo_metadata: Json
          ssl_certificate_expires_at: string | null
          ssl_provider_key: string | null
          ssl_status: string
          status: string
          subdomain: string
          tenant_id: string | null
          updated_at: string
          verification_error: string | null
          verification_status:
            | Database["public"]["Enums"]["production_domain_status"]
            | null
          verification_token_hash: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "release_domains"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_event_early_bird_slot: {
        Args: { p_provider_reference: string }
        Returns: undefined
      }
      reopen_support_ticket: { Args: { p_ticket_id: string }; Returns: Json }
      request_wallet_withdrawal: {
        Args: {
          p_account_name: string
          p_account_number: string
          p_amount: number
          p_bank_country: string
          p_bank_name: string
          p_currency: string
        }
        Returns: Json
      }
      reserve_event_early_bird_slot: {
        Args: {
          p_expires_at?: string
          p_provider_reference: string
          p_screening_id: string
        }
        Returns: boolean
      }
      resolve_platform_security_alert: {
        Args: {
          p_actor_id: string
          p_alert_id: string
          p_resolution_note: string
        }
        Returns: Json
      }
      resolve_release_domain: {
        Args: { p_hostname: string }
        Returns: {
          content_id: string
          content_slug: string
          content_title: string
          content_type: string
          domain_branding: Json
          screening_id: string
        }[]
      }
      review_creator_submission: {
        Args: {
          p_admin_note: string
          p_status: string
          p_submission_id: string
        }
        Returns: Json
      }
      review_kyc_application: {
        Args: {
          p_decision: string
          p_ip_address?: string
          p_reason: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
      review_studio_account: {
        Args: { p_account_id: string; p_decision: string; p_reason: string }
        Returns: Json
      }
      rotate_service_provider_secret: {
        Args: {
          p_capability: string
          p_provider_key: string
          p_secret: string
          p_secret_kind: string
        }
        Returns: string
      }
      run_event_settlement_maintenance: { Args: never; Returns: number }
      spend_personal_wallet_for_contribution: {
        Args: { p_contribution_id: string }
        Returns: Json
      }
      store_creator_vault_material: {
        Args: {
          p_bank_account_number?: string
          p_tax_identifier?: string
          p_user_id: string
        }
        Returns: Json
      }
      submit_business_verification: {
        Args: {
          p_bank_account_name: string
          p_bank_account_number: string
          p_bank_country: string
          p_bank_name: string
          p_business_address: string
          p_business_city: string
          p_business_postal_code: string
          p_business_region: string
          p_legal_business_name: string
          p_registration_country: string
          p_registration_document_path: string
          p_registration_number: string
          p_tax_identifier: string
        }
        Returns: Json
      }
      submit_identity_verification: {
        Args: {
          p_address_city?: string
          p_address_line?: string
          p_address_postal_code?: string
          p_address_region?: string
          p_country_code: string
          p_date_of_birth?: string
          p_document_path: string
          p_document_type: string
          p_full_name: string
          p_selfie_video_path: string
        }
        Returns: Json
      }
      submit_kyc_application: {
        Args: {
          p_full_name: string
          p_id_path: string
          p_id_type: string
          p_selfie_path: string
        }
        Returns: Json
      }
      submit_my_studio_account: {
        Args: { p_tier: string }
        Returns: {
          status: string
          tier: string
        }[]
      }
      transition_platform_release: {
        Args: {
          p_actor_id: string
          p_expected_state: string
          p_reason: string
          p_release_key: string
          p_traffic_percentage?: number
          p_transition: string
        }
        Returns: Json
      }
      transition_withdrawal_request: {
        Args: {
          p_actor_id: string
          p_admin_note?: string
          p_request_id: string
          p_transition: string
        }
        Returns: Json
      }
      update_platform_branding: {
        Args: {
          p_actor_id: string
          p_brand_config: Json
          p_brand_key: string
          p_expected_version: number
          p_is_public: boolean
          p_reason: string
        }
        Returns: Json
      }
      wallet_balance: {
        Args: { _user_id: string }
        Returns: {
          escrow: number
          fees: number
          gross: number
          withdrawable: number
        }[]
      }
      wallet_balance_by_currency: {
        Args: { _user_id: string }
        Returns: {
          currency: string
          escrow: number
          fees: number
          gross: number
          withdrawable: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "platform_admin"
        | "licensee_admin"
        | "creator"
        | "moderator"
        | "viewer"
      broadcast_lifecycle_status:
        | "DRAFT"
        | "SCHEDULED"
        | "WAITING_FOR_ENCODER"
        | "ENCODER_CONNECTED"
        | "LIVE"
        | "ENCODER_DISCONNECTED"
        | "ENDING"
        | "PROCESSING_REPLAY"
        | "REPLAY_AVAILABLE"
        | "PUBLISHED_VOD"
        | "ARCHIVED"
        | "PROVISIONING_FAILED"
        | "REPLAY_FAILED"
        | "CANCELLED"
      content_preset_type:
        | "FILM"
        | "SERIES"
        | "EPISODE"
        | "SHORT"
        | "TRAILER"
        | "MUSIC_VIDEO"
        | "PODCAST"
        | "DOCUMENTARY"
        | "EDUCATIONAL"
        | "GAMING"
        | "SPORTS"
        | "RECORDED_EVENT"
      content_status:
        | "draft"
        | "processing"
        | "published"
        | "scheduled"
        | "archived"
        | "deleted"
      content_type:
        | "movie"
        | "series"
        | "episode"
        | "trailer"
        | "short"
        | "live"
        | "vod"
        | "channel"
      creator_content_lifecycle:
        | "DRAFT"
        | "REVIEW"
        | "APPROVED"
        | "SCHEDULED"
        | "PUBLISHED"
        | "UPDATED"
        | "WITHDRAWN"
        | "ARCHIVED"
      creator_entity_type:
        | "INDIVIDUAL_CREATOR"
        | "STUDIO"
        | "PRODUCTION_COMPANY"
        | "BUSINESS"
      creator_verification_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "ADDITIONAL_INFO_REQUIRED"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED"
        | "APPEAL_PENDING"
      media_processing_status:
        | "INITIALIZED"
        | "UPLOADING"
        | "UPLOADED"
        | "QUARANTINED"
        | "SCANNING"
        | "PROMOTING"
        | "TRANSCODING"
        | "READY"
        | "RETRY_WAIT"
        | "DEAD_LETTER"
        | "CANCELLED"
        | "FAILED"
      monetization_type: "free" | "svod" | "tvod" | "avod" | "ppv" | "ticket"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      production_domain_status:
        | "PENDING_DNS"
        | "VERIFYING"
        | "PROVISIONING_SSL"
        | "ACTIVE"
        | "FAILED"
        | "SUSPENDED"
      stream_status: "scheduled" | "live" | "ended" | "cancelled"
      subscription_status:
        | "active"
        | "cancelled"
        | "expired"
        | "paused"
        | "trial"
      tenant_type: "platform" | "licensee" | "creator"
      ticket_type: "live" | "replay" | "combo" | "screening"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "super_admin",
        "platform_admin",
        "licensee_admin",
        "creator",
        "moderator",
        "viewer",
      ],
      broadcast_lifecycle_status: [
        "DRAFT",
        "SCHEDULED",
        "WAITING_FOR_ENCODER",
        "ENCODER_CONNECTED",
        "LIVE",
        "ENCODER_DISCONNECTED",
        "ENDING",
        "PROCESSING_REPLAY",
        "REPLAY_AVAILABLE",
        "PUBLISHED_VOD",
        "ARCHIVED",
        "PROVISIONING_FAILED",
        "REPLAY_FAILED",
        "CANCELLED",
      ],
      content_preset_type: [
        "FILM",
        "SERIES",
        "EPISODE",
        "SHORT",
        "TRAILER",
        "MUSIC_VIDEO",
        "PODCAST",
        "DOCUMENTARY",
        "EDUCATIONAL",
        "GAMING",
        "SPORTS",
        "RECORDED_EVENT",
      ],
      content_status: [
        "draft",
        "processing",
        "published",
        "scheduled",
        "archived",
        "deleted",
      ],
      content_type: [
        "movie",
        "series",
        "episode",
        "trailer",
        "short",
        "live",
        "vod",
        "channel",
      ],
      creator_content_lifecycle: [
        "DRAFT",
        "REVIEW",
        "APPROVED",
        "SCHEDULED",
        "PUBLISHED",
        "UPDATED",
        "WITHDRAWN",
        "ARCHIVED",
      ],
      creator_entity_type: [
        "INDIVIDUAL_CREATOR",
        "STUDIO",
        "PRODUCTION_COMPANY",
        "BUSINESS",
      ],
      creator_verification_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "ADDITIONAL_INFO_REQUIRED",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
        "APPEAL_PENDING",
      ],
      media_processing_status: [
        "INITIALIZED",
        "UPLOADING",
        "UPLOADED",
        "QUARANTINED",
        "SCANNING",
        "PROMOTING",
        "TRANSCODING",
        "READY",
        "RETRY_WAIT",
        "DEAD_LETTER",
        "CANCELLED",
        "FAILED",
      ],
      monetization_type: ["free", "svod", "tvod", "avod", "ppv", "ticket"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      production_domain_status: [
        "PENDING_DNS",
        "VERIFYING",
        "PROVISIONING_SSL",
        "ACTIVE",
        "FAILED",
        "SUSPENDED",
      ],
      stream_status: ["scheduled", "live", "ended", "cancelled"],
      subscription_status: [
        "active",
        "cancelled",
        "expired",
        "paused",
        "trial",
      ],
      tenant_type: ["platform", "licensee", "creator"],
      ticket_type: ["live", "replay", "combo", "screening"],
    },
  },
} as const
