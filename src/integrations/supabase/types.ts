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
          actual_start: string | null
          banner_url: string | null
          chat_enabled: boolean | null
          created_at: string
          creator_id: string
          currency: string | null
          description: string | null
          id: string
          is_ticketed: boolean | null
          metadata: Json | null
          monetization: Database["public"]["Enums"]["monetization_type"]
          peak_viewers: number | null
          playback_url: string | null
          recording_enabled: boolean | null
          recording_url: string | null
          rtmp_url: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["stream_status"]
          stream_key: string
          tenant_id: string
          thumbnail_url: string | null
          ticket_price: number | null
          title: string
          updated_at: string
          viewer_count: number | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          banner_url?: string | null
          chat_enabled?: boolean | null
          created_at?: string
          creator_id: string
          currency?: string | null
          description?: string | null
          id?: string
          is_ticketed?: boolean | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          peak_viewers?: number | null
          playback_url?: string | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          rtmp_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key: string
          tenant_id: string
          thumbnail_url?: string | null
          ticket_price?: number | null
          title: string
          updated_at?: string
          viewer_count?: number | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          banner_url?: string | null
          chat_enabled?: boolean | null
          created_at?: string
          creator_id?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_ticketed?: boolean | null
          metadata?: Json | null
          monetization?: Database["public"]["Enums"]["monetization_type"]
          peak_viewers?: number | null
          playback_url?: string | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          rtmp_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["stream_status"]
          stream_key?: string
          tenant_id?: string
          thumbnail_url?: string | null
          ticket_price?: number | null
          title?: string
          updated_at?: string
          viewer_count?: number | null
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
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
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
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
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
      screening_tickets: {
        Row: {
          access_hours: number | null
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
          age_rating: string | null
          allowed_countries: string[] | null
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
          location_pricing: Json
          max_concurrent_streams: number
          max_streams_per_ticket: number
          metadata: Json | null
          poster_url: string | null
          refund_policy: string | null
          release_date: string | null
          replay_access_hours: number
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
          age_rating?: string | null
          allowed_countries?: string[] | null
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
          location_pricing?: Json
          max_concurrent_streams?: number
          max_streams_per_ticket?: number
          metadata?: Json | null
          poster_url?: string | null
          refund_policy?: string | null
          release_date?: string | null
          replay_access_hours?: number
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
          age_rating?: string | null
          allowed_countries?: string[] | null
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
          location_pricing?: Json
          max_concurrent_streams?: number
          max_streams_per_ticket?: number
          metadata?: Json | null
          poster_url?: string | null
          refund_policy?: string | null
          release_date?: string | null
          replay_access_hours?: number
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
          content_id: string | null
          created_at: string
          currency: string | null
          id: string
          is_used: boolean | null
          metadata: Json | null
          price: number
          stream_id: string | null
          tenant_id: string
          ticket_code: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          used_at: string | null
          user_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_used?: boolean | null
          metadata?: Json | null
          price: number
          stream_id?: string | null
          tenant_id: string
          ticket_code: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          used_at?: string | null
          user_id: string
          valid_from: string
          valid_until: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_used?: boolean | null
          metadata?: Json | null
          price?: number
          stream_id?: string | null
          tenant_id?: string
          ticket_code?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          used_at?: string | null
          user_id?: string
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
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_filmmaker: { Args: { _user_id: string }; Returns: boolean }
      is_kyc_verified: { Args: { _user_id: string }; Returns: boolean }
      is_studio_member: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      wallet_balance: {
        Args: { _user_id: string }
        Returns: {
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
