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
          address: string | null;
          default_cleaning_duration_minutes: number;
          notes: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          default_cleaning_duration_minutes?: number;
          notes?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: {
      current_user_can_manage_operations: {
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

