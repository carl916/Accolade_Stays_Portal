export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          mobile_number: string | null;
          role: Database["public"]["Enums"]["app_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name: string;
          mobile_number?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string;
          mobile_number?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          name: string;
          address_line_1: string;
          address_line_2: string;
          town: string;
          county: string;
          postcode: string;
          default_cleaning_duration_minutes: number;
          notes: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address_line_1?: string;
          address_line_2?: string;
          town?: string;
          county?: string;
          postcode?: string;
          default_cleaning_duration_minutes?: number;
          notes?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address_line_1?: string;
          address_line_2?: string;
          town?: string;
          county?: string;
          postcode?: string;
          default_cleaning_duration_minutes?: number;
          notes?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bedrooms: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          physical_bed_type: Database["public"]["Enums"]["physical_bed_type"];
          default_configuration: Database["public"]["Enums"]["bed_configuration"];
          current_configuration: Database["public"]["Enums"]["bed_configuration"];
          current_configuration_confirmed_at: string | null;
          current_configuration_confirmed_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          physical_bed_type: Database["public"]["Enums"]["physical_bed_type"];
          default_configuration?: Database["public"]["Enums"]["bed_configuration"];
          current_configuration?: Database["public"]["Enums"]["bed_configuration"];
          current_configuration_confirmed_at?: string | null;
          current_configuration_confirmed_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          name?: string;
          physical_bed_type?: Database["public"]["Enums"]["physical_bed_type"];
          default_configuration?: Database["public"]["Enums"]["bed_configuration"];
          current_configuration?: Database["public"]["Enums"]["bed_configuration"];
          current_configuration_confirmed_at?: string | null;
          current_configuration_confirmed_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bedrooms_current_configuration_confirmed_by_fkey";
            columns: ["current_configuration_confirmed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bedrooms_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      bedroom_permitted_configurations: {
        Row: {
          id: string;
          bedroom_id: string;
          configuration: Database["public"]["Enums"]["bed_configuration"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bedroom_id: string;
          configuration: Database["public"]["Enums"]["bed_configuration"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bedroom_id?: string;
          configuration?: Database["public"]["Enums"]["bed_configuration"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bedroom_permitted_configurations_bedroom_id_fkey";
            columns: ["bedroom_id"];
            referencedRelation: "bedrooms";
            referencedColumns: ["id"];
          }
        ];
      };
      linen_items: {
        Row: {
          id: string;
          name: string;
          unit: string;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit?: string;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          unit?: string;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cleaning_jobs: {
        Row: {
          id: string;
          property_id: string;
          scheduled_date: string;
          expected_start_time: string | null;
          expected_start_time_window_end: string | null;
          guest_arrival_deadline: string | null;
          expected_duration_minutes: number;
          cleaning_type: Database["public"]["Enums"]["cleaning_type"];
          status: Database["public"]["Enums"]["cleaning_job_status"];
          cleaning_manager_id: string | null;
          assigned_cleaner_id: string | null;
          created_by: string | null;
          approved_by: string | null;
          assigned_at: string | null;
          viewed_at: string | null;
          accepted_at: string | null;
          declined_at: string | null;
          approved_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          actual_duration_minutes: number | null;
          is_long_clean: boolean;
          requires_review: boolean;
          long_clean_reason: Database["public"]["Enums"]["long_clean_reason"] | null;
          long_clean_notes: string | null;
          instructions: string;
          notes: string;
          manager_notes: string;
          cleaner_notes: string;
          smoobu_booking_id: string | null;
          booking_change_requires_review: boolean;
          booking_change_reason: string | null;
          booking_context: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          scheduled_date: string;
          expected_start_time?: string | null;
          expected_start_time_window_end?: string | null;
          guest_arrival_deadline?: string | null;
          expected_duration_minutes?: number;
          cleaning_type?: Database["public"]["Enums"]["cleaning_type"];
          status?: Database["public"]["Enums"]["cleaning_job_status"];
          cleaning_manager_id?: string | null;
          assigned_cleaner_id?: string | null;
          created_by?: string | null;
          approved_by?: string | null;
          assigned_at?: string | null;
          viewed_at?: string | null;
          accepted_at?: string | null;
          declined_at?: string | null;
          approved_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          actual_duration_minutes?: number | null;
          is_long_clean?: boolean;
          requires_review?: boolean;
          long_clean_reason?: Database["public"]["Enums"]["long_clean_reason"] | null;
          long_clean_notes?: string | null;
          instructions?: string;
          notes?: string;
          manager_notes?: string;
          cleaner_notes?: string;
          smoobu_booking_id?: string | null;
          booking_change_requires_review?: boolean;
          booking_change_reason?: string | null;
          booking_context?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          scheduled_date?: string;
          expected_start_time?: string | null;
          expected_start_time_window_end?: string | null;
          guest_arrival_deadline?: string | null;
          expected_duration_minutes?: number;
          cleaning_type?: Database["public"]["Enums"]["cleaning_type"];
          status?: Database["public"]["Enums"]["cleaning_job_status"];
          cleaning_manager_id?: string | null;
          assigned_cleaner_id?: string | null;
          created_by?: string | null;
          approved_by?: string | null;
          assigned_at?: string | null;
          viewed_at?: string | null;
          accepted_at?: string | null;
          declined_at?: string | null;
          approved_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          actual_duration_minutes?: number | null;
          is_long_clean?: boolean;
          requires_review?: boolean;
          long_clean_reason?: Database["public"]["Enums"]["long_clean_reason"] | null;
          long_clean_notes?: string | null;
          instructions?: string;
          notes?: string;
          manager_notes?: string;
          cleaner_notes?: string;
          smoobu_booking_id?: string | null;
          booking_change_requires_review?: boolean;
          booking_change_reason?: string | null;
          booking_context?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_jobs_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_jobs_assigned_cleaner_id_fkey";
            columns: ["assigned_cleaner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_jobs_cleaning_manager_id_fkey";
            columns: ["cleaning_manager_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_jobs_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_jobs_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_jobs_smoobu_booking_id_fkey";
            columns: ["smoobu_booking_id"];
            referencedRelation: "smoobu_bookings";
            referencedColumns: ["id"];
          }
        ];
      };
      cleaning_job_bedrooms: {
        Row: {
          id: string;
          cleaning_job_id: string;
          bedroom_id: string | null;
          bedroom_name: string;
          physical_bed_type: Database["public"]["Enums"]["physical_bed_type"];
          assumed_current_configuration: Database["public"]["Enums"]["bed_configuration"];
          actual_configuration_found: Database["public"]["Enums"]["bed_configuration"] | null;
          required_configuration: Database["public"]["Enums"]["bed_configuration"];
          final_configuration: Database["public"]["Enums"]["bed_configuration"] | null;
          arrival_difference_reported: boolean;
          completion_status: Database["public"]["Enums"]["job_bedroom_completion_status"];
          cleaner_note: string | null;
          mismatch_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cleaning_job_id: string;
          bedroom_id?: string | null;
          bedroom_name: string;
          physical_bed_type: Database["public"]["Enums"]["physical_bed_type"];
          assumed_current_configuration?: Database["public"]["Enums"]["bed_configuration"];
          actual_configuration_found?: Database["public"]["Enums"]["bed_configuration"] | null;
          required_configuration: Database["public"]["Enums"]["bed_configuration"];
          final_configuration?: Database["public"]["Enums"]["bed_configuration"] | null;
          arrival_difference_reported?: boolean;
          completion_status?: Database["public"]["Enums"]["job_bedroom_completion_status"];
          cleaner_note?: string | null;
          mismatch_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cleaning_job_id?: string;
          bedroom_id?: string | null;
          bedroom_name?: string;
          physical_bed_type?: Database["public"]["Enums"]["physical_bed_type"];
          assumed_current_configuration?: Database["public"]["Enums"]["bed_configuration"];
          actual_configuration_found?: Database["public"]["Enums"]["bed_configuration"] | null;
          required_configuration?: Database["public"]["Enums"]["bed_configuration"];
          final_configuration?: Database["public"]["Enums"]["bed_configuration"] | null;
          arrival_difference_reported?: boolean;
          completion_status?: Database["public"]["Enums"]["job_bedroom_completion_status"];
          cleaner_note?: string | null;
          mismatch_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_job_bedrooms_bedroom_id_fkey";
            columns: ["bedroom_id"];
            referencedRelation: "bedrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_job_bedrooms_cleaning_job_id_fkey";
            columns: ["cleaning_job_id"];
            referencedRelation: "cleaning_jobs";
            referencedColumns: ["id"];
          }
        ];
      };
      cleaning_linen_records: {
        Row: {
          id: string;
          cleaning_job_id: string;
          linen_item_id: string;
          expected_dirty_quantity: number;
          dirty_quantity: number | null;
          expected_clean_quantity: number;
          clean_quantity_used: number | null;
          is_confirmed: boolean;
          recorded_by: string | null;
          recorded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cleaning_job_id: string;
          linen_item_id: string;
          expected_dirty_quantity?: number;
          dirty_quantity?: number | null;
          expected_clean_quantity?: number;
          clean_quantity_used?: number | null;
          is_confirmed?: boolean;
          recorded_by?: string | null;
          recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cleaning_job_id?: string;
          linen_item_id?: string;
          expected_dirty_quantity?: number;
          dirty_quantity?: number | null;
          expected_clean_quantity?: number;
          clean_quantity_used?: number | null;
          is_confirmed?: boolean;
          recorded_by?: string | null;
          recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_linen_records_cleaning_job_id_fkey";
            columns: ["cleaning_job_id"];
            referencedRelation: "cleaning_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_linen_records_linen_item_id_fkey";
            columns: ["linen_item_id"];
            referencedRelation: "linen_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_linen_records_recorded_by_fkey";
            columns: ["recorded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      cleaning_exceptions: {
        Row: {
          id: string;
          cleaning_job_id: string;
          exception_type: Database["public"]["Enums"]["cleaning_exception_type"];
          reason_code: string | null;
          description: string;
          evidence_required: boolean;
          review_status: Database["public"]["Enums"]["exception_review_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cleaning_job_id: string;
          exception_type: Database["public"]["Enums"]["cleaning_exception_type"];
          reason_code?: string | null;
          description?: string;
          evidence_required?: boolean;
          review_status?: Database["public"]["Enums"]["exception_review_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cleaning_job_id?: string;
          exception_type?: Database["public"]["Enums"]["cleaning_exception_type"];
          reason_code?: string | null;
          description?: string;
          evidence_required?: boolean;
          review_status?: Database["public"]["Enums"]["exception_review_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_exceptions_cleaning_job_id_fkey";
            columns: ["cleaning_job_id"];
            referencedRelation: "cleaning_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_exceptions_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_exceptions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      cleaning_job_photos: {
        Row: {
          id: string;
          cleaning_job_id: string;
          cleaning_exception_id: string | null;
          uploaded_by: string | null;
          storage_path: string;
          caption: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          cleaning_job_id: string;
          cleaning_exception_id?: string | null;
          uploaded_by?: string | null;
          storage_path: string;
          caption?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          cleaning_job_id?: string;
          cleaning_exception_id?: string | null;
          uploaded_by?: string | null;
          storage_path?: string;
          caption?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_job_photos_cleaning_exception_id_fkey";
            columns: ["cleaning_exception_id"];
            referencedRelation: "cleaning_exceptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_job_photos_cleaning_job_id_fkey";
            columns: ["cleaning_job_id"];
            referencedRelation: "cleaning_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_job_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          cleaning_job_id: string | null;
          notification_type: Database["public"]["Enums"]["notification_type"];
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cleaning_job_id?: string | null;
          notification_type: Database["public"]["Enums"]["notification_type"];
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cleaning_job_id?: string | null;
          notification_type?: Database["public"]["Enums"]["notification_type"];
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_cleaning_job_id_fkey";
            columns: ["cleaning_job_id"];
            referencedRelation: "cleaning_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      cleaning_job_audit_events: {
        Row: {
          id: string;
          cleaning_job_id: string;
          user_id: string | null;
          action: string;
          previous_value: Json | null;
          new_value: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cleaning_job_id: string;
          user_id?: string | null;
          action: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cleaning_job_id?: string;
          user_id?: string | null;
          action?: string;
          previous_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_job_audit_events_cleaning_job_id_fkey";
            columns: ["cleaning_job_id"];
            referencedRelation: "cleaning_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_job_audit_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      smoobu_property_mappings: {
        Row: {
          id: string;
          property_id: string;
          provider: string;
          smoobu_apartment_id: number;
          smoobu_apartment_name: string;
          is_active: boolean;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          provider?: string;
          smoobu_apartment_id: number;
          smoobu_apartment_name: string;
          is_active?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          provider?: string;
          smoobu_apartment_id?: number;
          smoobu_apartment_name?: string;
          is_active?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "smoobu_property_mappings_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      smoobu_bookings: {
        Row: {
          id: string;
          property_id: string;
          smoobu_reservation_id: number;
          smoobu_reference_id: string | null;
          smoobu_apartment_id: number;
          smoobu_apartment_name: string;
          smoobu_channel_id: number | null;
          channel_name: string | null;
          booking_type: string;
          arrival_date: string;
          departure_date: string;
          previous_arrival_date: string | null;
          previous_departure_date: string | null;
          check_in_time: string | null;
          check_out_time: string | null;
          guest_name: string;
          guest_email: string | null;
          guest_phone: string | null;
          adults: number | null;
          children: number | null;
          guest_language: string | null;
          guest_id: number | null;
          guest_app_url: string | null;
          notice: string | null;
          is_blocked_booking: boolean;
          is_cancelled: boolean;
          source_deleted_at: string | null;
          booking_price: number | null;
          price_paid: string | null;
          prepayment: number | null;
          prepayment_paid: string | null;
          deposit: number | null;
          deposit_paid: string | null;
          smoobu_created_at: string | null;
          smoobu_modified_at: string | null;
          sync_status: string;
          last_synced_at: string | null;
          last_sync_error: string | null;
          messages_last_webhook_at: string | null;
          messages_need_refresh: boolean;
          clean_review_required: boolean;
          clean_review_reason: string | null;
          raw_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          smoobu_reservation_id: number;
          smoobu_reference_id?: string | null;
          smoobu_apartment_id: number;
          smoobu_apartment_name: string;
          smoobu_channel_id?: number | null;
          channel_name?: string | null;
          booking_type?: string;
          arrival_date: string;
          departure_date: string;
          previous_arrival_date?: string | null;
          previous_departure_date?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          guest_name?: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          adults?: number | null;
          children?: number | null;
          guest_language?: string | null;
          guest_id?: number | null;
          guest_app_url?: string | null;
          notice?: string | null;
          is_blocked_booking?: boolean;
          is_cancelled?: boolean;
          source_deleted_at?: string | null;
          booking_price?: number | null;
          price_paid?: string | null;
          prepayment?: number | null;
          prepayment_paid?: string | null;
          deposit?: number | null;
          deposit_paid?: string | null;
          smoobu_created_at?: string | null;
          smoobu_modified_at?: string | null;
          sync_status?: string;
          last_synced_at?: string | null;
          last_sync_error?: string | null;
          messages_last_webhook_at?: string | null;
          messages_need_refresh?: boolean;
          clean_review_required?: boolean;
          clean_review_reason?: string | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          smoobu_reservation_id?: number;
          smoobu_reference_id?: string | null;
          smoobu_apartment_id?: number;
          smoobu_apartment_name?: string;
          smoobu_channel_id?: number | null;
          channel_name?: string | null;
          booking_type?: string;
          arrival_date?: string;
          departure_date?: string;
          previous_arrival_date?: string | null;
          previous_departure_date?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          guest_name?: string;
          guest_email?: string | null;
          guest_phone?: string | null;
          adults?: number | null;
          children?: number | null;
          guest_language?: string | null;
          guest_id?: number | null;
          guest_app_url?: string | null;
          notice?: string | null;
          is_blocked_booking?: boolean;
          is_cancelled?: boolean;
          source_deleted_at?: string | null;
          booking_price?: number | null;
          price_paid?: string | null;
          prepayment?: number | null;
          prepayment_paid?: string | null;
          deposit?: number | null;
          deposit_paid?: string | null;
          smoobu_created_at?: string | null;
          smoobu_modified_at?: string | null;
          sync_status?: string;
          last_synced_at?: string | null;
          last_sync_error?: string | null;
          messages_last_webhook_at?: string | null;
          messages_need_refresh?: boolean;
          clean_review_required?: boolean;
          clean_review_reason?: string | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "smoobu_bookings_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      smoobu_booking_price_elements: {
        Row: {
          id: string;
          booking_id: string;
          smoobu_price_element_id: number;
          type: string | null;
          name: string | null;
          amount: number | null;
          quantity: number | null;
          tax: number | null;
          currency_code: string | null;
          sort_order: number | null;
          price_included_in_id: number | null;
          raw_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          smoobu_price_element_id: number;
          type?: string | null;
          name?: string | null;
          amount?: number | null;
          quantity?: number | null;
          tax?: number | null;
          currency_code?: string | null;
          sort_order?: number | null;
          price_included_in_id?: number | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          smoobu_price_element_id?: number;
          type?: string | null;
          name?: string | null;
          amount?: number | null;
          quantity?: number | null;
          tax?: number | null;
          currency_code?: string | null;
          sort_order?: number | null;
          price_included_in_id?: number | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "smoobu_booking_price_elements_booking_id_fkey";
            columns: ["booking_id"];
            referencedRelation: "smoobu_bookings";
            referencedColumns: ["id"];
          }
        ];
      };
      smoobu_sync_runs: {
        Row: {
          id: string;
          sync_type: string;
          status: string;
          started_at: string;
          completed_at: string | null;
          date_from: string | null;
          date_to: string | null;
          modified_from: string | null;
          modified_to: string | null;
          records_created: number;
          records_updated: number;
          records_cancelled: number;
          records_failed: number;
          last_successful_sync_at: string | null;
          error_message: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sync_type: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          date_from?: string | null;
          date_to?: string | null;
          modified_from?: string | null;
          modified_to?: string | null;
          records_created?: number;
          records_updated?: number;
          records_cancelled?: number;
          records_failed?: number;
          last_successful_sync_at?: string | null;
          error_message?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sync_type?: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          date_from?: string | null;
          date_to?: string | null;
          modified_from?: string | null;
          modified_to?: string | null;
          records_created?: number;
          records_updated?: number;
          records_cancelled?: number;
          records_failed?: number;
          last_successful_sync_at?: string | null;
          error_message?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "smoobu_sync_runs_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      smoobu_webhook_events: {
        Row: {
          id: string;
          action: string;
          smoobu_user_id: number | null;
          smoobu_reservation_id: number | null;
          payload_hash: string;
          status: string;
          error_message: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          action: string;
          smoobu_user_id?: number | null;
          smoobu_reservation_id?: number | null;
          payload_hash: string;
          status?: string;
          error_message?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          action?: string;
          smoobu_user_id?: number | null;
          smoobu_reservation_id?: number | null;
          payload_hash?: string;
          status?: string;
          error_message?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_cleaning_job_with_bedroom_snapshots: {
        Args: {
          p_property_id: string;
          p_scheduled_date: string;
          p_expected_start_time: string | null;
          p_expected_start_time_window_end: string | null;
          p_guest_arrival_deadline: string | null;
          p_expected_duration_minutes: number;
          p_cleaning_type: Database["public"]["Enums"]["cleaning_type"];
          p_instructions: string;
          p_notes: string;
          p_required_configurations: Json;
        };
        Returns: string;
      };
      create_cleaning_job_from_booking_with_bedroom_snapshots: {
        Args: {
          p_booking_id: string;
          p_expected_start_time: string | null;
          p_guest_arrival_deadline: string | null;
          p_expected_duration_minutes: number;
          p_cleaning_type: Database["public"]["Enums"]["cleaning_type"];
          p_instructions: string;
          p_notes: string;
          p_required_configurations: Json;
        };
        Returns: string;
      };
      current_user_can_manage_operations: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      current_user_is_administrator: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      user_can_access_cleaning_job: {
        Args: {
          job_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "administrator" | "cleaning_manager" | "cleaner";
      bed_configuration: "king" | "double" | "two_singles" | "single" | "unmade" | "other" | "unknown";
      cleaning_exception_type:
        | "property_exceptionally_dirty"
        | "excessive_rubbish"
        | "access_problem"
        | "damage"
        | "linen_shortage"
        | "missing_supplies"
        | "guest_still_present"
        | "bed_configuration_difference"
        | "long_clean"
        | "other";
      cleaning_job_status:
        | "awaiting_approval"
        | "awaiting_cleaner_response"
        | "accepted"
        | "in_progress"
        | "completed"
        | "requires_review"
        | "cancelled";
      cleaning_type: "standard_changeover" | "mid_stay_clean" | "deep_or_remedial_clean" | "other";
      exception_review_status: "open" | "in_review" | "resolved" | "dismissed";
      job_bedroom_completion_status: "pending" | "confirmed" | "requires_review";
      long_clean_reason:
        | "property_exceptionally_dirty"
        | "excessive_rubbish"
        | "guest_departure_delay"
        | "access_delay"
        | "additional_beds_required"
        | "linen_problem"
        | "damage_or_maintenance_issue"
        | "missing_supplies"
        | "cleaner_interruption"
        | "other";
      notification_type:
        | "clean_awaiting_approval"
        | "cleaner_declined_job"
        | "job_unaccepted"
        | "job_not_started_on_time"
        | "clean_in_progress_too_long"
        | "long_clean"
        | "bed_configuration_requires_review"
        | "job_assigned"
        | "job_changed"
        | "job_cancelled"
        | "clean_due_soon"
        | "clean_completed";
      physical_bed_type: "zip_and_link" | "fixed_double" | "fixed_single" | "other";
    };
    CompositeTypes: Record<string, never>;
  };
};

