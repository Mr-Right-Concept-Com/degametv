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
          cast_crew: Json | null
          created_at: string
          creator_id: string | null
          currency: string | null
          description: string | null
          duration: number | null
          dynamic_metadata: Json
          episode_number: number | null
          genres: string[] | null
          id: string
          is_drm_protected: boolean | null
          is_featured: boolean | null
          like_count: number | null
          metadata: Json | null
          monetization: Database["public"]["Enums"]["monetization_type"]
          parent_id: string | null
          poster_url: string | null
          preset_type: Database["public"]["Enums"]["content_preset_type"] | null
          price: number | null
          rating: number | null
          release_date: string | null
          season_number: number | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["content_status"]
          tags: string[] | null
          tenant_id: string
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
          cast_crew?: Json | null
          created_at?: string
          creator_id?: string | null
          currency?: string | null
          description?: string | null
          duration?: number | null
          dynamic_metadata?: Json
          episode_number?: number | null
          genres?: string[] | null
          id?: string
          is_drm_protected?: boolean | null
          is_featured?: boolean | null
          like_count?: number | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          parent_id?: string | null
          poster_url?: string | null
          preset_type?:
            | Database["public"]["Enums"]["content_preset_type"]
            | null
          price?: number | null
          rating?: number | null
          release_date?: string | null
          season_number?: number | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          tenant_id: string
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
          cast_crew?: Json | null
          created_at?: string
          creator_id?: string | null
          currency?: string | null
          description?: string | null
          duration?: number | null
          dynamic_metadata?: Json
          episode_number?: number | null
          genres?: string[] | null
          id?: string
          is_drm_protected?: boolean | null
          is_featured?: boolean | null
          like_count?: number | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          parent_id?: string | null
          poster_url?: string | null
          preset_type?:
            | Database["public"]["Enums"]["content_preset_type"]
            | null
          price?: number | null
          rating?: number | null
          release_date?: string | null
          season_number?: number | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          tenant_id?: string
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
            foreignKeyName: "content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          currency: string
          email: string
          email_sent_at: string | null
          id: string
          paid_at: string | null
          provider: string
          provider_reference: string
          provider_transaction_id: string | null
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          app_origin?: string | null
          checkout_url?: string | null
          created_at?: string
          currency: string
          email: string
          email_sent_at?: string | null
          id?: string
          paid_at?: string | null
          provider: string
          provider_reference: string
          provider_transaction_id?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          app_origin?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          email?: string
          email_sent_at?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          provider_reference?: string
          provider_transaction_id?: string | null
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
      live_payment_orders: {
        Row: {
          amount_minor: number
          checkout_url: string | null
          created_at: string
          currency: string
          email: string
          guest_checkout: boolean
          id: string
          metadata: Json
          paid_at: string | null
          provider: string
          provider_reference: string
          provider_transaction_id: string | null
          screening_id: string
          status: string
          stream_id: string
          tenant_id: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_minor: number
          checkout_url?: string | null
          created_at?: string
          currency: string
          email: string
          guest_checkout?: boolean
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider: string
          provider_reference: string
          provider_transaction_id?: string | null
          screening_id: string
          status?: string
          stream_id: string
          tenant_id: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_minor?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          email?: string
          guest_checkout?: boolean
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider?: string
          provider_reference?: string
          provider_transaction_id?: string | null
          screening_id?: string
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
          encoder_connected_at: string | null
          id: string
          is_ticketed: boolean | null
          lifecycle_status: Database["public"]["Enums"]["broadcast_lifecycle_status"]
          metadata: Json | null
          monetization: Database["public"]["Enums"]["monetization_type"]
          peak_viewers: number | null
          playback_url: string | null
          provider_stream_id: string | null
          reconnect_grace_expires_at: string | null
          recording_enabled: boolean | null
          recording_url: string | null
          rtmp_url: string | null
          scheduled_end: string | null
          scheduled_start: string | null
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
          encoder_connected_at?: string | null
          id?: string
          is_ticketed?: boolean | null
          lifecycle_status?: Database["public"]["Enums"]["broadcast_lifecycle_status"]
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          peak_viewers?: number | null
          playback_url?: string | null
          provider_stream_id?: string | null
          reconnect_grace_expires_at?: string | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          rtmp_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
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
          encoder_connected_at?: string | null
          id?: string
          is_ticketed?: boolean | null
          lifecycle_status?: Database["public"]["Enums"]["broadcast_lifecycle_status"]
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          peak_viewers?: number | null
          playback_url?: string | null
          provider_stream_id?: string | null
          reconnect_grace_expires_at?: string | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          rtmp_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
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
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          payment_type: string
          provider: string | null
          reference_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_type: string
          provider?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_type?: string
          provider?: string | null
          reference_id?: string | null
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
          content_id: string
          created_at: string
          dns_verified_at: string | null
          domain_kind: string
          hostname: string
          id: string
          status: string
          subdomain: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          branding?: Json
          content_id: string
          created_at?: string
          dns_verified_at?: string | null
          domain_kind?: string
          hostname: string
          id?: string
          status?: string
          subdomain: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          branding?: Json
          content_id?: string
          created_at?: string
          dns_verified_at?: string | null
          domain_kind?: string
          hostname?: string
          id?: string
          status?: string
          subdomain?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_domains_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
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
          currency: string | null
          display_amount: number | null
          display_currency: string | null
          email: string
          expires_at: string
          first_played_at: string | null
          gift_from: string | null
          gift_message: string | null
          id: string
          is_used: boolean | null
          last_country: string | null
          last_ip: string | null
          location: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          price: number
          refund_reason: string | null
          refunded_at: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
          screening_id: string
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
          currency?: string | null
          display_amount?: number | null
          display_currency?: string | null
          email: string
          expires_at?: string
          first_played_at?: string | null
          gift_from?: string | null
          gift_message?: string | null
          id?: string
          is_used?: boolean | null
          last_country?: string | null
          last_ip?: string | null
          location: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          price: number
          refund_reason?: string | null
          refunded_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          screening_id: string
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
          currency?: string | null
          display_amount?: number | null
          display_currency?: string | null
          email?: string
          expires_at?: string
          first_played_at?: string | null
          gift_from?: string | null
          gift_message?: string | null
          id?: string
          is_used?: boolean | null
          last_country?: string | null
          last_ip?: string | null
          location?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          price?: number
          refund_reason?: string | null
          refunded_at?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          screening_id?: string
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
          blocked_countries: string[] | null
          cancelled_at: string | null
          cast_crew: Json | null
          content_id: string
          created_at: string
          description: string | null
          duration: number | null
          event_type: string
          gallery_images: string[] | null
          id: string
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
          refund_policy: string | null
          release_date: string | null
          replay_access_hours: number
          replay_access_model: string
          replay_price_ngn: number | null
          replay_price_usd: number | null
          review_count: number | null
          screening_date: string | null
          slug: string
          star_rating: number | null
          status: string
          tenant_id: string
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
          blocked_countries?: string[] | null
          cancelled_at?: string | null
          cast_crew?: Json | null
          content_id: string
          created_at?: string
          description?: string | null
          duration?: number | null
          event_type?: string
          gallery_images?: string[] | null
          id?: string
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
          refund_policy?: string | null
          release_date?: string | null
          replay_access_hours?: number
          replay_access_model?: string
          replay_price_ngn?: number | null
          replay_price_usd?: number | null
          review_count?: number | null
          screening_date?: string | null
          slug: string
          star_rating?: number | null
          status?: string
          tenant_id: string
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
          blocked_countries?: string[] | null
          cancelled_at?: string | null
          cast_crew?: Json | null
          content_id?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          event_type?: string
          gallery_images?: string[] | null
          id?: string
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
          refund_policy?: string | null
          release_date?: string | null
          replay_access_hours?: number
          replay_access_model?: string
          replay_price_ngn?: number | null
          replay_price_usd?: number | null
          review_count?: number | null
          screening_date?: string | null
          slug?: string
          star_rating?: number | null
          status?: string
          tenant_id?: string
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
          cac_doc_path: string | null
          cac_number: string | null
          company_name: string | null
          created_at: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rights_declared: boolean
          seats: number
          status: string
          tax_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          cac_doc_path?: string | null
          cac_number?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_declared?: boolean
          seats?: number
          status?: string
          tax_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          cac_doc_path?: string | null
          cac_number?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_declared?: boolean
          seats?: number
          status?: string
          tax_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          currency: string | null
          guest_email: string | null
          id: string
          is_used: boolean | null
          metadata: Json | null
          price: number
          revocation_reason: string | null
          revoked_at: string | null
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
          currency?: string | null
          guest_email?: string | null
          id?: string
          is_used?: boolean | null
          metadata?: Json | null
          price: number
          revocation_reason?: string | null
          revoked_at?: string | null
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
          currency?: string | null
          guest_email?: string | null
          id?: string
          is_used?: boolean | null
          metadata?: Json | null
          price?: number
          revocation_reason?: string | null
          revoked_at?: string | null
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
          currency: string
          fee: number
          gross: number
          id: string
          kind: string
          net: number
          screening_id: string | null
          settles_at: string
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          fee?: number
          gross?: number
          id?: string
          kind?: string
          net?: number
          screening_id?: string | null
          settles_at?: string
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          fee?: number
          gross?: number
          id?: string
          kind?: string
          net?: number
          screening_id?: string | null
          settles_at?: string
          ticket_id?: string | null
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
          admin_note: string | null
          amount: number
          bank_name: string
          created_at: string
          currency: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_note?: string | null
          amount: number
          bank_name: string
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_note?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_my_studio_account: {
        Args: never
        Returns: {
          status: string
          tier: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_creator: { Args: { p_user_id: string }; Returns: boolean }
      is_filmmaker: { Args: { _user_id: string }; Returns: boolean }
      is_kyc_verified: { Args: { _user_id: string }; Returns: boolean }
      is_studio_member: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      publish_creator_content: { Args: { p_content_id: string }; Returns: Json }
      register_release_domain: {
        Args: {
          p_branding?: Json
          p_content_id: string
          p_custom_hostname?: string
          p_subdomain: string
        }
        Returns: {
          branding: Json
          content_id: string
          created_at: string
          dns_verified_at: string | null
          domain_kind: string
          hostname: string
          id: string
          status: string
          subdomain: string
          tenant_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "release_domains"
          isOneToOne: true
          isSetofReturn: false
        }
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
      monetization_type: "free" | "svod" | "tvod" | "avod" | "ppv" | "ticket"
      payment_status: "pending" | "completed" | "failed" | "refunded"
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
      monetization_type: ["free", "svod", "tvod", "avod", "ppv", "ticket"],
      payment_status: ["pending", "completed", "failed", "refunded"],
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
