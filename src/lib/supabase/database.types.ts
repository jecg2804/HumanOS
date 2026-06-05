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
    PostgrestVersion: "14.1"
  }
  audit: {
    Tables: {
      access_log: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_schema: string
          entity_table: string
          event_type: string
          id: string
          metadata: Json
          source_system: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_schema: string
          entity_table: string
          event_type: string
          id?: string
          metadata?: Json
          source_system?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_schema?: string
          entity_table?: string
          event_type?: string
          id?: string
          metadata?: Json
          source_system?: string
        }
        Relationships: []
      }
      log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          changed_fields: string[] | null
          created_at: string
          field_changed: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          record_id: string | null
          request_id: string | null
          schema_name: string
          session_id: string | null
          source_system: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: string[] | null
          created_at?: string
          field_changed?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          record_id?: string | null
          request_id?: string | null
          schema_name: string
          session_id?: string | null
          source_system?: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          changed_fields?: string[] | null
          created_at?: string
          field_changed?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          record_id?: string | null
          request_id?: string | null
          schema_name?: string
          session_id?: string | null
          source_system?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_access: {
        Args: {
          p_entity_id?: string
          p_event_type: string
          p_metadata?: Json
          p_schema: string
          p_table: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  core: {
    Tables: {
      customers: {
        Row: {
          address_1: string | null
          address_2: string | null
          city: string | null
          created_at: string
          customer_code: string
          deleted_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          name: string
          phone_number: string | null
          price_level_material: string | null
          source_system: string
          state: string | null
          status: string | null
          taxable_flag: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          created_at?: string
          customer_code: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name: string
          phone_number?: string | null
          price_level_material?: string | null
          source_system?: string
          state?: string | null
          status?: string | null
          taxable_flag?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          created_at?: string
          customer_code?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string
          phone_number?: string | null
          price_level_material?: string | null
          source_system?: string
          state?: string | null
          status?: string | null
          taxable_flag?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      customers_external_ids: {
        Row: {
          created_at: string
          customer_id: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string | null
          source_system: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          source_system: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_external_ids_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      deductions_addons: {
        Row: {
          calc_method: string | null
          created_at: string
          deduct_type: string | null
          deleted_at: string | null
          description: string | null
          id: string
          source_system: string
          updated_at: string
          vol_deduct_code: string
        }
        Insert: {
          calc_method?: string | null
          created_at?: string
          deduct_type?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          source_system?: string
          updated_at?: string
          vol_deduct_code: string
        }
        Update: {
          calc_method?: string | null
          created_at?: string
          deduct_type?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          source_system?: string
          updated_at?: string
          vol_deduct_code?: string
        }
        Relationships: []
      }
      deductions_addons_external_ids: {
        Row: {
          created_at: string
          deduction_addon_id: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string | null
          source_system: string
        }
        Insert: {
          created_at?: string
          deduction_addon_id: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          source_system: string
        }
        Update: {
          created_at?: string
          deduction_addon_id?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "deductions_addons_external_ids_deduction_addon_id_fkey"
            columns: ["deduction_addon_id"]
            isOneToOne: false
            referencedRelation: "deductions_addons"
            referencedColumns: ["id"]
          },
        ]
      }
      eq_cost_categories: {
        Row: {
          cost_category_code: string
          cost_category_type: string | null
          cost_center: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          source_system: string
          status: string | null
          updated_at: string
        }
        Insert: {
          cost_category_code: string
          cost_category_type?: string | null
          cost_center?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          source_system?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          cost_category_code?: string
          cost_category_type?: string | null
          cost_center?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          source_system?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      eq_cost_categories_external_ids: {
        Row: {
          created_at: string
          eq_cost_category_id: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string | null
          source_system: string
        }
        Insert: {
          created_at?: string
          eq_cost_category_id: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          source_system: string
        }
        Update: {
          created_at?: string
          eq_cost_category_id?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "eq_cost_categories_external_ids_eq_cost_category_id_fkey"
            columns: ["eq_cost_category_id"]
            isOneToOne: false
            referencedRelation: "eq_cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          cost_center: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          division_code: string | null
          equipment_code: string
          equipment_make: string | null
          equipment_model: string | null
          equipment_status: string | null
          equipment_type: string | null
          equipment_year: string | null
          id: string
          license_number: string | null
          owned_flag: string | null
          serial_number: string | null
          source_system: string
          updated_at: string
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          division_code?: string | null
          equipment_code: string
          equipment_make?: string | null
          equipment_model?: string | null
          equipment_status?: string | null
          equipment_type?: string | null
          equipment_year?: string | null
          id?: string
          license_number?: string | null
          owned_flag?: string | null
          serial_number?: string | null
          source_system?: string
          updated_at?: string
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          division_code?: string | null
          equipment_code?: string
          equipment_make?: string | null
          equipment_model?: string | null
          equipment_status?: string | null
          equipment_type?: string | null
          equipment_year?: string | null
          id?: string
          license_number?: string | null
          owned_flag?: string | null
          serial_number?: string | null
          source_system?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_external_ids: {
        Row: {
          created_at: string
          equipment_id: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string | null
          source_system: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          source_system: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_external_ids_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      field_authority: {
        Row: {
          authoritative_source: string
          created_at: string
          entity: string
          field_name: string
          id: string
          notes: string | null
          strategy: string
          updated_at: string
        }
        Insert: {
          authoritative_source: string
          created_at?: string
          entity: string
          field_name: string
          id?: string
          notes?: string | null
          strategy: string
          updated_at?: string
        }
        Update: {
          authoritative_source?: string
          created_at?: string
          entity?: string
          field_name?: string
          id?: string
          notes?: string | null
          strategy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_authority_authoritative_source_fkey"
            columns: ["authoritative_source"]
            isOneToOne: false
            referencedRelation: "source_systems"
            referencedColumns: ["code"]
          },
        ]
      }
      jobs: {
        Row: {
          address_1: string | null
          address_2: string | null
          certified_flag: string | null
          city: string | null
          complete_date: string | null
          contract_number: string | null
          cost_center: string | null
          create_date: string | null
          created_at: string
          customer_code: string | null
          customer_id: string | null
          deleted_at: string | null
          division: string | null
          est_complete_date: string | null
          est_start_date: string | null
          estimator_code: string | null
          extra_code: string | null
          id: string
          is_extra: boolean
          job_description: string | null
          job_number: string
          obra_code: string
          parent_job_id: string | null
          project_manager_code: string | null
          projected_complete_date: string | null
          source_system: string
          start_date: string | null
          state: string | null
          status_code: string | null
          superintendent_code: string | null
          udf: Json | null
          updated_at: string
          work_state_tax_code: string | null
          zip_code: string | null
        }
        Insert: {
          address_1?: string | null
          address_2?: string | null
          certified_flag?: string | null
          city?: string | null
          complete_date?: string | null
          contract_number?: string | null
          cost_center?: string | null
          create_date?: string | null
          created_at?: string
          customer_code?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          division?: string | null
          est_complete_date?: string | null
          est_start_date?: string | null
          estimator_code?: string | null
          extra_code?: string | null
          id?: string
          is_extra?: boolean
          job_description?: string | null
          job_number: string
          obra_code: string
          parent_job_id?: string | null
          project_manager_code?: string | null
          projected_complete_date?: string | null
          source_system?: string
          start_date?: string | null
          state?: string | null
          status_code?: string | null
          superintendent_code?: string | null
          udf?: Json | null
          updated_at?: string
          work_state_tax_code?: string | null
          zip_code?: string | null
        }
        Update: {
          address_1?: string | null
          address_2?: string | null
          certified_flag?: string | null
          city?: string | null
          complete_date?: string | null
          contract_number?: string | null
          cost_center?: string | null
          create_date?: string | null
          created_at?: string
          customer_code?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          division?: string | null
          est_complete_date?: string | null
          est_start_date?: string | null
          estimator_code?: string | null
          extra_code?: string | null
          id?: string
          is_extra?: boolean
          job_description?: string | null
          job_number?: string
          obra_code?: string
          parent_job_id?: string | null
          project_manager_code?: string | null
          projected_complete_date?: string | null
          source_system?: string
          start_date?: string | null
          state?: string | null
          status_code?: string | null
          superintendent_code?: string | null
          udf?: Json | null
          updated_at?: string
          work_state_tax_code?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_external_ids: {
        Row: {
          created_at: string
          external_data: Json | null
          external_id: string
          id: string
          job_id: string
          last_synced_at: string | null
          source_system: string
        }
        Insert: {
          created_at?: string
          external_data?: Json | null
          external_id: string
          id?: string
          job_id: string
          last_synced_at?: string | null
          source_system: string
        }
        Update: {
          created_at?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          job_id?: string
          last_synced_at?: string | null
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_external_ids_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_types: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          pay_type: string
          source_system: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          pay_type: string
          source_system?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          pay_type?: string
          source_system?: string
          updated_at?: string
        }
        Relationships: []
      }
      pay_types_external_ids: {
        Row: {
          created_at: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string | null
          pay_type_id: string
          source_system: string
        }
        Insert: {
          created_at?: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          pay_type_id: string
          source_system: string
        }
        Update: {
          created_at?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          pay_type_id?: string
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_types_external_ids_pay_type_id_fkey"
            columns: ["pay_type_id"]
            isOneToOne: false
            referencedRelation: "pay_types"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          comment: string | null
          complete_date: string | null
          cost_center: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          job_id: string
          phase_code: string
          price_method_code: string | null
          source_system: string
          start_date: string | null
          status_code: string | null
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          complete_date?: string | null
          cost_center?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          job_id: string
          phase_code: string
          price_method_code?: string | null
          source_system?: string
          start_date?: string | null
          status_code?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          complete_date?: string | null
          cost_center?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          job_id?: string
          phase_code?: string
          price_method_code?: string | null
          source_system?: string
          start_date?: string | null
          status_code?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      phases_external_ids: {
        Row: {
          created_at: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string | null
          phase_id: string
          source_system: string
        }
        Insert: {
          created_at?: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          phase_id: string
          source_system: string
        }
        Update: {
          created_at?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          phase_id?: string
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_external_ids_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      source_systems: {
        Row: {
          code: string
          created_at: string
          display_name: string
          is_live: boolean
          notes: string | null
          precedence: number
          trust_rank: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          is_live?: boolean
          notes?: string | null
          precedence?: number
          trust_rank?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          is_live?: boolean
          notes?: string | null
          precedence?: number
          trust_rank?: number
          updated_at?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          batch_id: string
          created_at: string
          details: Json
          entity: string | null
          error: string | null
          finished_at: string | null
          id: string
          rows_flagged: number
          rows_read: number
          rows_upserted: number
          service: string | null
          source_system: string
          started_at: string
          status: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          details?: Json
          entity?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_flagged?: number
          rows_read?: number
          rows_upserted?: number
          service?: string | null
          source_system: string
          started_at?: string
          status?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          details?: Json
          entity?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          rows_flagged?: number
          rows_read?: number
          rows_upserted?: number
          service?: string | null
          source_system?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_source_system_fkey"
            columns: ["source_system"]
            isOneToOne: false
            referencedRelation: "source_systems"
            referencedColumns: ["code"]
          },
        ]
      }
      wage_codes: {
        Row: {
          created_at: string
          deleted_at: string | null
          effective_date: string | null
          full_description: string | null
          id: string
          short_description: string | null
          source_system: string
          union_code: string | null
          updated_at: string
          wage_code: string
          worker_comp_code: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          effective_date?: string | null
          full_description?: string | null
          id?: string
          short_description?: string | null
          source_system?: string
          union_code?: string | null
          updated_at?: string
          wage_code: string
          worker_comp_code?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          effective_date?: string | null
          full_description?: string | null
          id?: string
          short_description?: string | null
          source_system?: string
          union_code?: string | null
          updated_at?: string
          wage_code?: string
          worker_comp_code?: string | null
        }
        Relationships: []
      }
      wage_codes_external_ids: {
        Row: {
          created_at: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string | null
          source_system: string
          wage_code_id: string
        }
        Insert: {
          created_at?: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string | null
          source_system: string
          wage_code_id: string
        }
        Update: {
          created_at?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string | null
          source_system?: string
          wage_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wage_codes_external_ids_wage_code_id_fkey"
            columns: ["wage_code_id"]
            isOneToOne: false
            referencedRelation: "wage_codes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      persons: {
        Row: {
          employee_code: string | null
          full_name: string | null
          given_names: string | null
          id: string | null
          photo_url: string | null
          preferred_name: string | null
          source_system: string | null
          status: string | null
          surnames: string | null
        }
        Insert: {
          employee_code?: string | null
          full_name?: string | null
          given_names?: string | null
          id?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          source_system?: string | null
          status?: string | null
          surnames?: string | null
        }
        Update: {
          employee_code?: string | null
          full_name?: string | null
          given_names?: string | null
          id?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          source_system?: string | null
          status?: string | null
          surnames?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      land_sdx: {
        Args: {
          p_batch_id: string
          p_job_filter: string
          p_records: Json
          p_service: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  docs: {
    Tables: {
      acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          ip_address: string | null
          notes: string | null
          person_id: string
          signature_method: string
          sop_version_id: string
          user_agent: string | null
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          person_id: string
          signature_method?: string
          sop_version_id: string
          user_agent?: string | null
        }
        Update: {
          acknowledged_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          person_id?: string
          signature_method?: string
          sop_version_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acknowledgments_sop_version_id_fkey"
            columns: ["sop_version_id"]
            isOneToOne: false
            referencedRelation: "sop_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      article_acknowledgments: {
        Row: {
          acknowledged_at: string
          article_version_id: string
          id: string
          ip_address: unknown
          notes: string | null
          person_id: string
          reading_duration_seconds: number | null
          signature_method: string
          user_agent: string | null
        }
        Insert: {
          acknowledged_at?: string
          article_version_id: string
          id?: string
          ip_address?: unknown
          notes?: string | null
          person_id: string
          reading_duration_seconds?: number | null
          signature_method?: string
          user_agent?: string | null
        }
        Update: {
          acknowledged_at?: string
          article_version_id?: string
          id?: string
          ip_address?: unknown
          notes?: string | null
          person_id?: string
          reading_duration_seconds?: number | null
          signature_method?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_acknowledgments_article_version_id_fkey"
            columns: ["article_version_id"]
            isOneToOne: false
            referencedRelation: "article_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      article_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      article_versions: {
        Row: {
          article_id: string
          body_html: string | null
          body_markdown: string
          change_notes: string | null
          created_at: string
          edited_by: string | null
          id: string
          is_current: boolean
          is_draft: boolean
          published_at: string | null
          published_by: string | null
          title: string
          version_number: number
        }
        Insert: {
          article_id: string
          body_html?: string | null
          body_markdown: string
          change_notes?: string | null
          created_at?: string
          edited_by?: string | null
          id?: string
          is_current?: boolean
          is_draft?: boolean
          published_at?: string | null
          published_by?: string | null
          title: string
          version_number: number
        }
        Update: {
          article_id?: string
          body_html?: string | null
          body_markdown?: string
          change_notes?: string | null
          created_at?: string
          edited_by?: string | null
          id?: string
          is_current?: boolean
          is_draft?: boolean
          published_at?: string | null
          published_by?: string | null
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          category_id: string | null
          created_at: string
          current_version_id: string | null
          deleted_at: string | null
          id: string
          is_published: boolean
          is_required_reading: boolean
          related_articles: string[] | null
          related_sop_id: string | null
          required_for_departments: string[] | null
          required_for_roles: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_keywords: string | null
          slug: string
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
          visibility: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          is_required_reading?: boolean
          related_articles?: string[] | null
          related_sop_id?: string | null
          required_for_departments?: string[] | null
          required_for_roles?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_keywords?: string | null
          slug: string
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
          visibility?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          is_required_reading?: boolean
          related_articles?: string[] | null
          related_sop_id?: string | null
          required_for_departments?: string[] | null
          required_for_roles?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_keywords?: string | null
          slug?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "article_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_related_sop_id_fkey"
            columns: ["related_sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      generated: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_format: string
          file_url: string
          for_person_id: string
          generated_at: string
          generated_by: string | null
          id: string
          notes: string | null
          related_ticket_id: string | null
          rendered_content: string | null
          stamp_data: Json | null
          template_version_id: string | null
          updated_at: string
          variables_used: Json | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_format?: string
          file_url: string
          for_person_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          related_ticket_id?: string | null
          rendered_content?: string | null
          stamp_data?: Json | null
          template_version_id?: string | null
          updated_at?: string
          variables_used?: Json | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_format?: string
          file_url?: string
          for_person_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          notes?: string | null
          related_ticket_id?: string | null
          rendered_content?: string | null
          stamp_data?: Json | null
          template_version_id?: string | null
          updated_at?: string
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          completed_at: string | null
          deleted_at: string | null
          document_id: string | null
          expires_at: string | null
          external_id: string | null
          external_url: string | null
          id: string
          notes: string | null
          provider: string
          requested_at: string
          requested_by: string | null
          required_signers: string[]
          signed_by: string[]
          signed_file_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          deleted_at?: string | null
          document_id?: string | null
          expires_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          notes?: string | null
          provider?: string
          requested_at?: string
          requested_by?: string | null
          required_signers: string[]
          signed_by?: string[]
          signed_file_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          deleted_at?: string | null
          document_id?: string | null
          expires_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          notes?: string | null
          provider?: string
          requested_at?: string
          requested_by?: string | null
          required_signers?: string[]
          signed_by?: string[]
          signed_file_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          file_url: string
          gdrive_url: string | null
          id: string
          is_current: boolean
          published_at: string
          published_by: string | null
          sop_id: string
          version_number: string
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          file_url: string
          gdrive_url?: string | null
          id?: string
          is_current?: boolean
          published_at?: string
          published_by?: string | null
          sop_id: string
          version_number: string
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          file_url?: string
          gdrive_url?: string | null
          id?: string
          is_current?: boolean
          published_at?: string
          published_by?: string | null
          sop_id?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_versions_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          category: string
          code: string
          created_at: string
          current_version_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sops_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "sop_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          css_styles: string | null
          id: string
          is_current: boolean
          published_at: string
          published_by: string | null
          template_content: string
          template_id: string
          version_number: string
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          css_styles?: string | null
          id?: string
          is_current?: boolean
          published_at?: string
          published_by?: string | null
          template_content: string
          template_id: string
          version_number: string
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          css_styles?: string | null
          id?: string
          is_current?: boolean
          published_at?: string
          published_by?: string | null
          template_content?: string
          template_id?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          code: string
          created_at: string
          current_version_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  files: {
    Tables: {
      uploads: {
        Row: {
          category: string | null
          checksum_sha256: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          entity_id: string
          entity_schema: string
          entity_table: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          is_deleted: boolean
          legal_hold: boolean
          mime_type: string | null
          page_count: number | null
          retention_until: string | null
          storage_bucket: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          upload_source: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          checksum_sha256?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id: string
          entity_schema: string
          entity_table: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_deleted?: boolean
          legal_hold?: boolean
          mime_type?: string | null
          page_count?: number | null
          retention_until?: string | null
          storage_bucket?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          checksum_sha256?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entity_id?: string
          entity_schema?: string
          entity_table?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_deleted?: boolean
          legal_hold?: boolean
          mime_type?: string | null
          page_count?: number | null
          retention_until?: string | null
          storage_bucket?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  hr: {
    Tables: {
      addresses: {
        Row: {
          address_type: string
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_current: boolean
          neighborhood: string | null
          notes: string | null
          person_id: string
          postal_code: string | null
          province: string | null
          source_system: string
          street: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          address_type?: string
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_current?: boolean
          neighborhood?: string | null
          notes?: string | null
          person_id: string
          postal_code?: string | null
          province?: string | null
          source_system?: string
          street?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          address_type?: string
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_current?: boolean
          neighborhood?: string | null
          notes?: string | null
          person_id?: string
          postal_code?: string | null
          province?: string | null
          source_system?: string
          street?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "addresses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      consent: {
        Row: {
          actor_id: string | null
          consent_at: string
          created_at: string
          granted: boolean
          id: string
          ip: unknown
          legal_version: string
          person_id: string
          scope: string
          source_system: string
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          consent_at?: string
          created_at?: string
          granted: boolean
          id?: string
          ip?: unknown
          legal_version: string
          person_id: string
          scope: string
          source_system?: string
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          consent_at?: string
          created_at?: string
          granted?: boolean
          id?: string
          ip?: unknown
          legal_version?: string
          person_id?: string
          scope?: string
          source_system?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "consent_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "consent_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "consent_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_name: string | null
          contact_type: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          is_emergency: boolean
          is_primary: boolean
          notes: string | null
          person_id: string
          phone: string | null
          relationship: string | null
          source_system: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_type?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          notes?: string | null
          person_id: string
          phone?: string | null
          relationship?: string | null
          source_system?: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_type?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          notes?: string | null
          person_id?: string
          phone?: string | null
          relationship?: string | null
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "contacts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      employment_classifications: {
        Row: {
          cost_center: string | null
          created_at: string
          created_from: string
          deleted_at: string | null
          deleted_by: string | null
          department_code: string | null
          id: string
          is_current: boolean
          occupation: string | null
          person_id: string
          source_system: string
          trade: string | null
          union_code: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
          wage_class: string | null
          worker_comp_code: string | null
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          created_from?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_code?: string | null
          id?: string
          is_current?: boolean
          occupation?: string | null
          person_id: string
          source_system?: string
          trade?: string | null
          union_code?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          wage_class?: string | null
          worker_comp_code?: string | null
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          created_from?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_code?: string | null
          id?: string
          is_current?: boolean
          occupation?: string | null
          person_id?: string
          source_system?: string
          trade?: string | null
          union_code?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          wage_class?: string | null
          worker_comp_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_classifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_classifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "employment_classifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      employment_types: {
        Row: {
          code: string
          created_at: string
          display_order: number
          has_seniority_premium: boolean
          has_vacations: boolean
          has_xiii_month: boolean
          id: string
          is_active: boolean
          isr_applies: boolean
          name: string
          notes: string | null
          se_applies: boolean
          severance_pct: number
          short_name: string
          sop_reference: string | null
          ss_applies: boolean
          union_fee_pct: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          has_seniority_premium: boolean
          has_vacations: boolean
          has_xiii_month: boolean
          id?: string
          is_active?: boolean
          isr_applies: boolean
          name: string
          notes?: string | null
          se_applies: boolean
          severance_pct?: number
          short_name: string
          sop_reference?: string | null
          ss_applies: boolean
          union_fee_pct?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          has_seniority_premium?: boolean
          has_vacations?: boolean
          has_xiii_month?: boolean
          id?: string
          is_active?: boolean
          isr_applies?: boolean
          name?: string
          notes?: string | null
          se_applies?: boolean
          severance_pct?: number
          short_name?: string
          sop_reference?: string | null
          ss_applies?: boolean
          union_fee_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      employments: {
        Row: {
          app_role: string
          created_at: string
          created_by: string | null
          created_from: string
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          department_text: string | null
          employment_type_id: string | null
          hire_date: string | null
          hiring_source: string | null
          id: string
          is_current: boolean | null
          notes: string | null
          office_id: string | null
          office_text: string | null
          person_id: string
          position_id: string | null
          position_text: string | null
          source_system: string
          supervisor_id: string | null
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          app_role?: string
          created_at?: string
          created_by?: string | null
          created_from?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          department_text?: string | null
          employment_type_id?: string | null
          hire_date?: string | null
          hiring_source?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          office_id?: string | null
          office_text?: string | null
          person_id: string
          position_id?: string | null
          position_text?: string | null
          source_system?: string
          supervisor_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          app_role?: string
          created_at?: string
          created_by?: string | null
          created_from?: string
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          department_text?: string | null
          employment_type_id?: string | null
          hire_date?: string | null
          hiring_source?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          office_id?: string | null
          office_text?: string | null
          person_id?: string
          position_id?: string | null
          position_text?: string | null
          source_system?: string
          supervisor_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "employments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "employments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "employments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "employments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "employments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      invite_code_attempts: {
        Row: {
          attempts: number
          blocked_until: string | null
          created_at: string
          first_attempt_at: string
          id: string
          invite_code_id: string
          ip_address: unknown
          last_attempt_at: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt_at?: string
          id?: string
          invite_code_id: string
          ip_address: unknown
          last_attempt_at?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt_at?: string
          id?: string
          invite_code_id?: string
          ip_address?: unknown
          last_attempt_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_code_attempts_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          consumed_at: string | null
          consumed_by_auth_id: string | null
          created_at: string
          delivery_target: string | null
          expires_at: string
          generated_at: string
          generated_by: string | null
          id: string
          invite_method: string | null
          notes: string | null
          person_id: string
          updated_at: string
          validated_at: string | null
          validated_delivery_target_hash: string | null
        }
        Insert: {
          code: string
          consumed_at?: string | null
          consumed_by_auth_id?: string | null
          created_at?: string
          delivery_target?: string | null
          expires_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          invite_method?: string | null
          notes?: string | null
          person_id: string
          updated_at?: string
          validated_at?: string | null
          validated_delivery_target_hash?: string | null
        }
        Update: {
          code?: string
          consumed_at?: string | null
          consumed_by_auth_id?: string | null
          created_at?: string
          delivery_target?: string | null
          expires_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          invite_method?: string | null
          notes?: string | null
          person_id?: string
          updated_at?: string
          validated_at?: string | null
          validated_delivery_target_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "invite_codes_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "invite_codes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "invite_codes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      leave_assignments: {
        Row: {
          accrual_start_date: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          person_id: string
          policy_id: string
          source_system: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          accrual_start_date: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          person_id: string
          policy_id: string
          source_system?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          accrual_start_date?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          person_id?: string
          policy_id?: string
          source_system?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "leave_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "leave_assignments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          accrued: number
          as_of: string
          assignment_id: string
          available: number
          created_at: string
          id: string
          pending: number
          source_system: string
          updated_at: string
          used: number
        }
        Insert: {
          accrued?: number
          as_of?: string
          assignment_id: string
          available?: number
          created_at?: string
          id?: string
          pending?: number
          source_system?: string
          updated_at?: string
          used?: number
        }
        Update: {
          accrued?: number
          as_of?: string
          assignment_id?: string
          available?: number
          created_at?: string
          id?: string
          pending?: number
          source_system?: string
          updated_at?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "leave_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_ledger: {
        Row: {
          amount: number
          assignment_id: string
          balance_after: number
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          kind: string
          note: string | null
          reversal_of_id: string | null
          source_system: string
          source_ticket_id: string | null
        }
        Insert: {
          amount: number
          assignment_id: string
          balance_after: number
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          kind: string
          note?: string | null
          reversal_of_id?: string | null
          source_system?: string
          source_ticket_id?: string | null
        }
        Update: {
          amount?: number
          assignment_id?: string
          balance_after?: number
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          kind?: string
          note?: string | null
          reversal_of_id?: string | null
          source_system?: string
          source_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_ledger_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "leave_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "leave_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "leave_ledger_reversal_of_id_fkey"
            columns: ["reversal_of_id"]
            isOneToOne: false
            referencedRelation: "leave_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          accrual_frequency: string | null
          accrual_method: string
          accrual_rate: number | null
          allow_negative_balance: boolean
          carryover_expiry_months: number | null
          carryover_limit: number | null
          code: string
          created_at: string
          deleted_at: string | null
          employment_type_id: string | null
          id: string
          is_active: boolean
          max_balance_cap: number | null
          name: string
          proration_rule: string | null
          reset_negative_on_carryover: boolean
          source_system: string
          unit: string
          updated_at: string
        }
        Insert: {
          accrual_frequency?: string | null
          accrual_method: string
          accrual_rate?: number | null
          allow_negative_balance?: boolean
          carryover_expiry_months?: number | null
          carryover_limit?: number | null
          code: string
          created_at?: string
          deleted_at?: string | null
          employment_type_id?: string | null
          id?: string
          is_active?: boolean
          max_balance_cap?: number | null
          name: string
          proration_rule?: string | null
          reset_negative_on_carryover?: boolean
          source_system?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          accrual_frequency?: string | null
          accrual_method?: string
          accrual_rate?: number | null
          allow_negative_balance?: boolean
          carryover_expiry_months?: number | null
          carryover_limit?: number | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          employment_type_id?: string | null
          id?: string
          is_active?: boolean
          max_balance_cap?: number | null
          name?: string
          proration_rule?: string | null
          reset_negative_on_carryover?: boolean
          source_system?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_employment_type_id_fkey"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          location_type: string
          movimientos_location_id: string | null
          name: string
          notes: string | null
          source_system: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_type: string
          movimientos_location_id?: string | null
          name: string
          notes?: string | null
          source_system?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_type?: string
          movimientos_location_id?: string | null
          name?: string
          notes?: string | null
          source_system?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_info: {
        Row: {
          allergies: string | null
          blood_type: string | null
          chronic_conditions: string | null
          created_at: string
          css_number: string | null
          current_medications: string | null
          deleted_at: string | null
          deleted_by: string | null
          doctor_name: string | null
          doctor_phone: string | null
          id: string
          medical_insurance_number: string | null
          medical_insurance_provider: string | null
          notes: string | null
          person_id: string
          source_system: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          created_at?: string
          css_number?: string | null
          current_medications?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          medical_insurance_number?: string | null
          medical_insurance_provider?: string | null
          notes?: string | null
          person_id: string
          source_system?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          created_at?: string
          css_number?: string | null
          current_medications?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          medical_insurance_number?: string | null
          medical_insurance_provider?: string | null
          notes?: string | null
          person_id?: string
          source_system?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_info_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_info_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "medical_info_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "medical_info_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_info_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "medical_info_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      org_units: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          source_system: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          source_system?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          auth_id: string | null
          created_at: string
          created_from: string
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          employee_code: string | null
          full_name: string
          gender: string | null
          given_names: string | null
          id: string
          marital_status: string | null
          national_id: string | null
          nationality: string | null
          needs_review: boolean
          num_dependents: number
          photo_url: string | null
          preferred_name: string | null
          review_notes: string | null
          source_record_id: string | null
          source_system: string
          status: string
          surnames: string | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          created_from?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          employee_code?: string | null
          full_name: string
          gender?: string | null
          given_names?: string | null
          id?: string
          marital_status?: string | null
          national_id?: string | null
          nationality?: string | null
          needs_review?: boolean
          num_dependents?: number
          photo_url?: string | null
          preferred_name?: string | null
          review_notes?: string | null
          source_record_id?: string | null
          source_system?: string
          status?: string
          surnames?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          created_from?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          employee_code?: string | null
          full_name?: string
          gender?: string | null
          given_names?: string | null
          id?: string
          marital_status?: string | null
          national_id?: string | null
          nationality?: string | null
          needs_review?: boolean
          num_dependents?: number
          photo_url?: string | null
          preferred_name?: string | null
          review_notes?: string | null
          source_record_id?: string | null
          source_system?: string
          status?: string
          surnames?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "people_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      person_sources: {
        Row: {
          created_at: string
          external_data: Json | null
          external_id: string
          id: string
          last_synced_at: string
          person_id: string
          source_system: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string
          person_id: string
          source_system: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string
          person_id?: string
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_sources_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_sources_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_sources_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      personal_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          document_name: string | null
          document_type: string
          expires_at: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          is_active: boolean
          mime_type: string | null
          notes: string | null
          person_id: string
          source_system: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document_name?: string | null
          document_type: string
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_active?: boolean
          mime_type?: string | null
          notes?: string | null
          person_id: string
          source_system?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document_name?: string | null
          document_type?: string
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_active?: boolean
          mime_type?: string | null
          notes?: string | null
          person_id?: string
          source_system?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "personal_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "personal_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "personal_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_supervisor_position: boolean
          level: number | null
          source_system: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_supervisor_position?: boolean
          level?: number | null
          source_system?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_supervisor_position?: boolean
          level?: number | null
          source_system?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          dashboard_layout: Json | null
          deleted_at: string | null
          id: string
          language: string
          notification_email_enabled: boolean
          notification_in_app_enabled: boolean
          notification_sms_enabled: boolean
          notification_whatsapp_enabled: boolean
          person_id: string
          preferences: Json
          timezone: string
          two_factor_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          dashboard_layout?: Json | null
          deleted_at?: string | null
          id?: string
          language?: string
          notification_email_enabled?: boolean
          notification_in_app_enabled?: boolean
          notification_sms_enabled?: boolean
          notification_whatsapp_enabled?: boolean
          person_id: string
          preferences?: Json
          timezone?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          dashboard_layout?: Json | null
          deleted_at?: string | null
          id?: string
          language?: string
          notification_email_enabled?: boolean
          notification_in_app_enabled?: boolean
          notification_sms_enabled?: boolean
          notification_whatsapp_enabled?: boolean
          person_id?: string
          preferences?: Json
          timezone?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "user_settings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
    }
    Views: {
      v_directory: {
        Row: {
          department: string | null
          employee_code: string | null
          employment_id: string | null
          full_name: string | null
          hire_date: string | null
          office: string | null
          person_id: string | null
          photo_url: string | null
          position: string | null
          preferred_name: string | null
          supervisor_id: string | null
          supervisor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_directory"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "employments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_pending_reconsent"
            referencedColumns: ["person_id"]
          },
        ]
      }
      v_org_chart: {
        Row: {
          depth: number | null
          person_id: string | null
          supervisor_id: string | null
        }
        Relationships: []
      }
      v_pending_reconsent: {
        Row: {
          auth_id: string | null
          can_prompt_now: boolean | null
          full_name: string | null
          person_id: string | null
        }
        Insert: {
          auth_id?: string | null
          can_prompt_now?: never
          full_name?: string | null
          person_id?: string | null
        }
        Update: {
          auth_id?: string | null
          can_prompt_now?: never
          full_name?: string | null
          person_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_employment_scd2_change: {
        Args: {
          p_actor_id?: string
          p_app_role?: string
          p_department_id?: string
          p_department_text?: string
          p_employment_type_id?: string
          p_hire_date?: string
          p_office_id?: string
          p_office_text?: string
          p_person_id: string
          p_position_id?: string
          p_position_text?: string
          p_supervisor_id?: string
        }
        Returns: undefined
      }
      apply_spectrum_classification: {
        Args: {
          p_batch_id: string
          p_cost_center: string
          p_department_code: string
          p_occupation: string
          p_person_id: string
          p_trade: string
          p_union_code: string
          p_wage_class: string
          p_worker_comp_code: string
        }
        Returns: string
      }
      check_invite_code_rate_limit: {
        Args: {
          p_block_minutes?: number
          p_invite_code_id: string
          p_ip_address: unknown
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      complete_onboarding_writes: {
        Args: {
          p_ack_child_labor_at?: string
          p_ack_ethics_at?: string
          p_address?: Json
          p_auth_id: string
          p_consent_data_processing?: boolean
          p_consent_emergency?: boolean
          p_consent_legal_version?: string
          p_consent_medical?: boolean
          p_emergency?: Json
          p_invite_id: string
          p_ip_address?: string
          p_medical?: Json
          p_person_id: string
          p_photo_path?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      create_employee_with_invite: {
        Args: {
          p_actor_id?: string
          p_app_role?: string
          p_delivery_target?: string
          p_department_id?: string
          p_department_text?: string
          p_employee_code?: string
          p_employment_type_id?: string
          p_full_name: string
          p_hire_date?: string
          p_invite_code?: string
          p_invite_method?: string
          p_national_id: string
          p_office_id?: string
          p_office_text?: string
          p_position_id?: string
          p_position_text?: string
          p_supervisor_id?: string
        }
        Returns: {
          new_expires_at: string
          new_invite_code: string
          new_invite_id: string
          new_person_id: string
        }[]
      }
      current_app_role: { Args: never; Returns: string }
      current_person_id: { Args: never; Returns: string }
      find_auth_user_by_identifier: {
        Args: { p_field: string; p_value: string }
        Returns: {
          email: string
          id: string
          phone: string
          raw_app_meta_data: Json
        }[]
      }
      generate_employee_code: {
        Args: { p_apellido_paterno: string; p_national_id: string }
        Returns: string
      }
      has_active_consent: {
        Args: { p_person_id: string; p_scope: string }
        Returns: boolean
      }
      has_direct_reports: { Args: never; Returns: boolean }
      is_hr_admin: { Args: never; Returns: boolean }
      is_president_or_admin: { Args: never; Returns: boolean }
      is_supervisor_of: { Args: { target_person_id: string }; Returns: boolean }
      post_leave_ledger_entry: {
        Args: {
          p_amount: number
          p_assignment_id: string
          p_event_date?: string
          p_kind: string
          p_note?: string
          p_source_ticket_id?: string
        }
        Returns: {
          amount: number
          assignment_id: string
          balance_after: number
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          kind: string
          note: string | null
          reversal_of_id: string | null
          source_system: string
          source_ticket_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "leave_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      regenerate_invite_code: {
        Args: {
          p_code: string
          p_delivery_target: string
          p_invite_method: string
          p_person_id: string
        }
        Returns: {
          out_code: string
          out_expires_at: string
        }[]
      }
      sync_spectrum_people: {
        Args: { p_batch_id: string; p_records: Json }
        Returns: Json
      }
      update_person_profile: {
        Args: {
          p_employee_code?: string
          p_full_name: string
          p_national_id: string
          p_person_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  learning: {
    Tables: {
      assessments: {
        Row: {
          attempt_number: number
          completed_at: string | null
          correct_count: number | null
          created_at: string
          duration_seconds: number | null
          enrollment_id: string
          graded_at: string | null
          graded_by: string | null
          grading_method: string | null
          id: string
          incorrect_count: number | null
          max_score: number | null
          module_id: string | null
          notes: string | null
          passed: boolean | null
          passing_score: number | null
          percentage: number | null
          responses: Json | null
          score: number | null
          started_at: string | null
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          duration_seconds?: number | null
          enrollment_id: string
          graded_at?: string | null
          graded_by?: string | null
          grading_method?: string | null
          id?: string
          incorrect_count?: number | null
          max_score?: number | null
          module_id?: string | null
          notes?: string | null
          passed?: boolean | null
          passing_score?: number | null
          percentage?: number | null
          responses?: Json | null
          score?: number | null
          started_at?: string | null
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          duration_seconds?: number | null
          enrollment_id?: string
          graded_at?: string | null
          graded_by?: string | null
          grading_method?: string | null
          id?: string
          incorrect_count?: number | null
          max_score?: number | null
          module_id?: string | null
          notes?: string | null
          passed?: boolean | null
          passing_score?: number | null
          percentage?: number | null
          responses?: Json | null
          score?: number | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_method: string
          attendance_sheet_file_id: string | null
          attended_at: string
          created_at: string
          duration_minutes: number | null
          enrollment_id: string
          id: string
          location_id: string | null
          module_id: string | null
          notes: string | null
          recorded_by: string | null
          video_watch_percent: number | null
        }
        Insert: {
          attendance_method: string
          attendance_sheet_file_id?: string | null
          attended_at?: string
          created_at?: string
          duration_minutes?: number | null
          enrollment_id: string
          id?: string
          location_id?: string | null
          module_id?: string | null
          notes?: string | null
          recorded_by?: string | null
          video_watch_percent?: number | null
        }
        Update: {
          attendance_method?: string
          attendance_sheet_file_id?: string | null
          attended_at?: string
          created_at?: string
          duration_minutes?: number | null
          enrollment_id?: string
          id?: string
          location_id?: string | null
          module_id?: string | null
          notes?: string | null
          recorded_by?: string | null
          video_watch_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_assignments: {
        Row: {
          certificate_file_id: string | null
          certificate_number: string | null
          certification_id: string
          created_at: string
          expiration_date: string | null
          id: string
          is_legally_required: boolean
          is_renewable: boolean | null
          issued_date: string
          issuing_body_signatory: string | null
          notes: string | null
          obtained_via: string | null
          person_id: string
          previous_assignment_id: string | null
          related_enrollment_id: string | null
          renewed_to_id: string | null
          revocation_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          certificate_file_id?: string | null
          certificate_number?: string | null
          certification_id: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_legally_required?: boolean
          is_renewable?: boolean | null
          issued_date: string
          issuing_body_signatory?: string | null
          notes?: string | null
          obtained_via?: string | null
          person_id: string
          previous_assignment_id?: string | null
          related_enrollment_id?: string | null
          renewed_to_id?: string | null
          revocation_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          certificate_file_id?: string | null
          certificate_number?: string | null
          certification_id?: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          is_legally_required?: boolean
          is_renewable?: boolean | null
          issued_date?: string
          issuing_body_signatory?: string | null
          notes?: string | null
          obtained_via?: string | null
          person_id?: string
          previous_assignment_id?: string | null
          related_enrollment_id?: string | null
          renewed_to_id?: string | null
          revocation_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_assignments_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_assignments_previous_assignment_id_fkey"
            columns: ["previous_assignment_id"]
            isOneToOne: false
            referencedRelation: "certification_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_assignments_related_enrollment_id_fkey"
            columns: ["related_enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_assignments_renewed_to_id_fkey"
            columns: ["renewed_to_id"]
            isOneToOne: false
            referencedRelation: "certification_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          code: string
          cost_to_obtain: number | null
          cost_to_renew: number | null
          created_at: string
          description: string | null
          grace_period_days: number
          id: string
          is_active: boolean
          is_renewable: boolean
          is_required_by_law: boolean
          is_required_for_locations: string[] | null
          is_required_for_roles: string[] | null
          issuing_body: string | null
          issuing_body_type: string | null
          legal_reference: string | null
          name: string
          paid_by: string | null
          renewal_warning_days: number
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          code: string
          cost_to_obtain?: number | null
          cost_to_renew?: number | null
          created_at?: string
          description?: string | null
          grace_period_days?: number
          id?: string
          is_active?: boolean
          is_renewable?: boolean
          is_required_by_law?: boolean
          is_required_for_locations?: string[] | null
          is_required_for_roles?: string[] | null
          issuing_body?: string | null
          issuing_body_type?: string | null
          legal_reference?: string | null
          name: string
          paid_by?: string | null
          renewal_warning_days?: number
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          code?: string
          cost_to_obtain?: number | null
          cost_to_renew?: number | null
          created_at?: string
          description?: string | null
          grace_period_days?: number
          id?: string
          is_active?: boolean
          is_renewable?: boolean
          is_required_by_law?: boolean
          is_required_for_locations?: string[] | null
          is_required_for_roles?: string[] | null
          issuing_body?: string | null
          issuing_body_type?: string | null
          legal_reference?: string | null
          name?: string
          paid_by?: string | null
          renewal_warning_days?: number
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          assessment_questions: Json | null
          content_storage_path: string | null
          content_type: string
          content_url: string | null
          course_id: string
          created_at: string
          description: string | null
          estimated_minutes: number | null
          has_assessment: boolean
          id: string
          is_mandatory: boolean
          max_attempts: number | null
          module_order: number
          name: string
          passing_score: number | null
          randomize_questions: boolean | null
          related_article_id: string | null
          related_sop_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_questions?: Json | null
          content_storage_path?: string | null
          content_type: string
          content_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          has_assessment?: boolean
          id?: string
          is_mandatory?: boolean
          max_attempts?: number | null
          module_order: number
          name: string
          passing_score?: number | null
          randomize_questions?: boolean | null
          related_article_id?: string | null
          related_sop_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_questions?: Json | null
          content_storage_path?: string | null
          content_type?: string
          content_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          has_assessment?: boolean
          id?: string
          is_mandatory?: boolean
          max_attempts?: number | null
          module_order?: number
          name?: string
          passing_score?: number | null
          randomize_questions?: boolean | null
          related_article_id?: string | null
          related_sop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          available_languages: string[] | null
          code: string | null
          cost_per_seat: number | null
          course_type: string
          created_at: string
          created_by: string | null
          delivery_method: string | null
          description: string | null
          duration_hours: number | null
          effort_hours: number | null
          grants_certification_id: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          is_published: boolean
          language: string | null
          long_description: string | null
          max_seats_per_session: number | null
          min_seats_to_run: number | null
          name: string
          prerequisites: string[] | null
          provider_contact: string | null
          provider_name: string | null
          provider_type: string | null
          related_sop_ids: string[] | null
          required_for_departments: string[] | null
          required_for_locations: string[] | null
          required_for_roles: string[] | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          available_languages?: string[] | null
          code?: string | null
          cost_per_seat?: number | null
          course_type: string
          created_at?: string
          created_by?: string | null
          delivery_method?: string | null
          description?: string | null
          duration_hours?: number | null
          effort_hours?: number | null
          grants_certification_id?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          is_published?: boolean
          language?: string | null
          long_description?: string | null
          max_seats_per_session?: number | null
          min_seats_to_run?: number | null
          name: string
          prerequisites?: string[] | null
          provider_contact?: string | null
          provider_name?: string | null
          provider_type?: string | null
          related_sop_ids?: string[] | null
          required_for_departments?: string[] | null
          required_for_locations?: string[] | null
          required_for_roles?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          available_languages?: string[] | null
          code?: string | null
          cost_per_seat?: number | null
          course_type?: string
          created_at?: string
          created_by?: string | null
          delivery_method?: string | null
          description?: string | null
          duration_hours?: number | null
          effort_hours?: number | null
          grants_certification_id?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          is_published?: boolean
          language?: string | null
          long_description?: string | null
          max_seats_per_session?: number | null
          min_seats_to_run?: number | null
          name?: string
          prerequisites?: string[] | null
          provider_contact?: string | null
          provider_name?: string | null
          provider_type?: string | null
          related_sop_ids?: string[] | null
          required_for_departments?: string[] | null
          required_for_locations?: string[] | null
          required_for_roles?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_grants_cert_fkey"
            columns: ["grants_certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          cancelled_at: string | null
          certificate_file_id: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          enrolled_at: string
          enrolled_by: string | null
          enrollment_reason: string | null
          expires_at: string | null
          final_grade: string | null
          final_score: number | null
          granted_certification_assignment_id: string | null
          id: string
          notes: string | null
          passed: boolean | null
          person_id: string
          progress_percent: number
          session_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          certificate_file_id?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          due_date?: string | null
          enrolled_at?: string
          enrolled_by?: string | null
          enrollment_reason?: string | null
          expires_at?: string | null
          final_grade?: string | null
          final_score?: number | null
          granted_certification_assignment_id?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          person_id: string
          progress_percent?: number
          session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          certificate_file_id?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          due_date?: string | null
          enrolled_at?: string
          enrolled_by?: string | null
          enrollment_reason?: string | null
          expires_at?: string | null
          final_grade?: string | null
          final_score?: number | null
          granted_certification_assignment_id?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          person_id?: string
          progress_percent?: number
          session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_granted_cert_fkey"
            columns: ["granted_certification_assignment_id"]
            isOneToOne: false
            referencedRelation: "certification_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          created_at: string
          duration_hours: number | null
          external_certificate_file_id: string | null
          id: string
          notes: string | null
          person_id: string
          provider: string | null
          record_type: string
          recorded_at: string
          recorded_by: string | null
          related_article_acknowledgment_id: string | null
          related_certification_id: string | null
          related_enrollment_id: string | null
          related_sop_acknowledgment_id: string | null
          training_description: string | null
          training_name: string | null
        }
        Insert: {
          created_at?: string
          duration_hours?: number | null
          external_certificate_file_id?: string | null
          id?: string
          notes?: string | null
          person_id: string
          provider?: string | null
          record_type: string
          recorded_at?: string
          recorded_by?: string | null
          related_article_acknowledgment_id?: string | null
          related_certification_id?: string | null
          related_enrollment_id?: string | null
          related_sop_acknowledgment_id?: string | null
          training_description?: string | null
          training_name?: string | null
        }
        Update: {
          created_at?: string
          duration_hours?: number | null
          external_certificate_file_id?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          provider?: string | null
          record_type?: string
          recorded_at?: string
          recorded_by?: string | null
          related_article_acknowledgment_id?: string | null
          related_certification_id?: string | null
          related_enrollment_id?: string | null
          related_sop_acknowledgment_id?: string | null
          training_description?: string | null
          training_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_records_related_certification_id_fkey"
            columns: ["related_certification_id"]
            isOneToOne: false
            referencedRelation: "certification_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_related_enrollment_id_fkey"
            columns: ["related_enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  mdm: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  notifications: {
    Tables: {
      outbox: {
        Row: {
          attempts: number
          body: string | null
          body_html: string | null
          channel: string
          created_at: string
          dedupe_key: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          last_attempt_at: string | null
          max_attempts: number
          metadata: Json | null
          notification_type: string
          priority: string
          provider_message_id: string | null
          read_at: string | null
          recipient_id: string
          scheduled_for: string | null
          sent_at: string | null
          source_id: string | null
          source_schema: string | null
          source_table: string | null
          status: string
          subject: string | null
          template_code: string | null
          template_variables: Json | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          body?: string | null
          body_html?: string | null
          channel: string
          created_at?: string
          dedupe_key?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          metadata?: Json | null
          notification_type: string
          priority?: string
          provider_message_id?: string | null
          read_at?: string | null
          recipient_id: string
          scheduled_for?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_schema?: string | null
          source_table?: string | null
          status?: string
          subject?: string | null
          template_code?: string | null
          template_variables?: Json | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string | null
          body_html?: string | null
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
          metadata?: Json | null
          notification_type?: string
          priority?: string
          provider_message_id?: string | null
          read_at?: string | null
          recipient_id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_schema?: string | null
          source_table?: string | null
          status?: string
          subject?: string | null
          template_code?: string | null
          template_variables?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enqueue: {
        Args: {
          p_body: string
          p_dedupe_key?: string
          p_metadata: Json
          p_notification_type: string
          p_recipient_id: string
          p_subject: string
          p_template_code: string
          p_template_variables: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  payroll: {
    Tables: {
      cost_centers: {
        Row: {
          cost_center_code: string
          created_at: string
          extra_id: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          cost_center_code: string
          created_at?: string
          extra_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          cost_center_code?: string
          created_at?: string
          extra_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cost_centers_extra"
            columns: ["extra_id"]
            isOneToOne: true
            referencedRelation: "project_extras"
            referencedColumns: ["id"]
          },
        ]
      }
      person_project_assignments: {
        Row: {
          allocation_percent: number | null
          created_at: string
          effective_from: string | null
          effective_to: string | null
          extra_id: string | null
          id: string
          is_active: boolean
          person_id: string
          phase_id: string | null
          project_id: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          allocation_percent?: number | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          extra_id?: string | null
          id?: string
          is_active?: boolean
          person_id: string
          phase_id?: string | null
          project_id: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          allocation_percent?: number | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          extra_id?: string | null
          id?: string
          is_active?: boolean
          person_id?: string
          phase_id?: string | null
          project_id?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_assignment_extra"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "project_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assignment_phase"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assignment_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          created_at: string
          ct: string | null
          description: string | null
          extra_id: string
          id: string
          is_active: boolean
          legacy_phase_id: number | null
          phase_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ct?: string | null
          description?: string | null
          extra_id: string
          id?: string
          is_active?: boolean
          legacy_phase_id?: number | null
          phase_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ct?: string | null
          description?: string | null
          extra_id?: string
          id?: string
          is_active?: boolean
          legacy_phase_id?: number | null
          phase_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_phases_extra"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "project_extras"
            referencedColumns: ["id"]
          },
        ]
      }
      project_extras: {
        Row: {
          created_at: string
          entity_name: string
          extra_code: string | null
          id: string
          is_active: boolean
          legacy_entity_id: number | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_name: string
          extra_code?: string | null
          id?: string
          is_active?: boolean
          legacy_entity_id?: number | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_name?: string
          extra_code?: string | null
          id?: string
          is_active?: boolean
          legacy_entity_id?: number | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_extras_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          base_project_code: string
          created_at: string
          id: string
          is_active: boolean
          legacy_project_id: number | null
          project_name: string
          updated_at: string
        }
        Insert: {
          base_project_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          legacy_project_id?: number | null
          project_name: string
          updated_at?: string
        }
        Update: {
          base_project_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          legacy_project_id?: number | null
          project_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stg_cost_centers: {
        Row: {
          CostCenterCode: string | null
          Id: number | null
          JobNumber: string | null
        }
        Insert: {
          CostCenterCode?: string | null
          Id?: number | null
          JobNumber?: string | null
        }
        Update: {
          CostCenterCode?: string | null
          Id?: number | null
          JobNumber?: string | null
        }
        Relationships: []
      }
      stg_phases: {
        Row: {
          ct: string | null
          description: string | null
          entity_id: number | null
          id: number | null
          phase_code: string | null
        }
        Insert: {
          ct?: string | null
          description?: string | null
          entity_id?: number | null
          id?: number | null
          phase_code?: string | null
        }
        Update: {
          ct?: string | null
          description?: string | null
          entity_id?: number | null
          id?: number | null
          phase_code?: string | null
        }
        Relationships: []
      }
      stg_project_entities: {
        Row: {
          entity_code: string | null
          entity_name: string | null
          extra_code: string | null
          id: number | null
          project_id: number | null
        }
        Insert: {
          entity_code?: string | null
          entity_name?: string | null
          extra_code?: string | null
          id?: number | null
          project_id?: number | null
        }
        Update: {
          entity_code?: string | null
          entity_name?: string | null
          extra_code?: string | null
          id?: number | null
          project_id?: number | null
        }
        Relationships: []
      }
      stg_projects: {
        Row: {
          base_project_code: string | null
          id: number | null
          project_name: string | null
        }
        Insert: {
          base_project_code?: string | null
          id?: number | null
          project_name?: string | null
        }
        Update: {
          base_project_code?: string | null
          id?: number | null
          project_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  performance: {
    Tables: {
      calibrations: {
        Row: {
          completed_at: string | null
          created_at: string
          cycle_id: string
          decisions: Json | null
          facilitated_by: string | null
          id: string
          notes: string | null
          participants: string[] | null
          rating_distribution: Json | null
          reviewees_calibrated: string[] | null
          session_date: string | null
          session_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cycle_id: string
          decisions?: Json | null
          facilitated_by?: string | null
          id?: string
          notes?: string | null
          participants?: string[] | null
          rating_distribution?: Json | null
          reviewees_calibrated?: string[] | null
          session_date?: string | null
          session_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cycle_id?: string
          decisions?: Json | null
          facilitated_by?: string | null
          id?: string
          notes?: string | null
          participants?: string[] | null
          rating_distribution?: Json | null
          reviewees_calibrated?: string[] | null
          session_date?: string | null
          session_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibrations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          applies_to_departments: string[] | null
          applies_to_persons: string[] | null
          applies_to_roles: string[] | null
          calibration_required: boolean
          closed_at: string | null
          closed_by: string | null
          created_at: string
          cycle_type: string
          finalization_deadline: string | null
          goal_template_id: string | null
          goals_enabled: boolean
          id: string
          name: string
          notes: string | null
          peer_evaluation_enabled: boolean
          period_end: string
          period_start: string
          review_template_id: string | null
          self_evaluation_enabled: boolean
          self_review_deadline: string | null
          skip_level_enabled: boolean
          status: string
          subordinate_evaluation_enabled: boolean
          supervisor_evaluation_enabled: boolean
          supervisor_review_deadline: string | null
          updated_at: string
        }
        Insert: {
          applies_to_departments?: string[] | null
          applies_to_persons?: string[] | null
          applies_to_roles?: string[] | null
          calibration_required?: boolean
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          cycle_type: string
          finalization_deadline?: string | null
          goal_template_id?: string | null
          goals_enabled?: boolean
          id?: string
          name: string
          notes?: string | null
          peer_evaluation_enabled?: boolean
          period_end: string
          period_start: string
          review_template_id?: string | null
          self_evaluation_enabled?: boolean
          self_review_deadline?: string | null
          skip_level_enabled?: boolean
          status?: string
          subordinate_evaluation_enabled?: boolean
          supervisor_evaluation_enabled?: boolean
          supervisor_review_deadline?: string | null
          updated_at?: string
        }
        Update: {
          applies_to_departments?: string[] | null
          applies_to_persons?: string[] | null
          applies_to_roles?: string[] | null
          calibration_required?: boolean
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          cycle_type?: string
          finalization_deadline?: string | null
          goal_template_id?: string | null
          goals_enabled?: boolean
          id?: string
          name?: string
          notes?: string | null
          peer_evaluation_enabled?: boolean
          period_end?: string
          period_start?: string
          review_template_id?: string | null
          self_evaluation_enabled?: boolean
          self_review_deadline?: string | null
          skip_level_enabled?: boolean
          status?: string
          subordinate_evaluation_enabled?: boolean
          supervisor_evaluation_enabled?: boolean
          supervisor_review_deadline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_review_template_fkey"
            columns: ["review_template_id"]
            isOneToOne: false
            referencedRelation: "review_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by_recipient: boolean
          author_id: string | null
          body: string
          competency: string | null
          created_at: string
          feedback_type: string
          id: string
          is_anonymous: boolean
          recipient_id: string
          recipient_response: string | null
          related_goal_id: string | null
          related_project: string | null
          related_review_id: string | null
          title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by_recipient?: boolean
          author_id?: string | null
          body: string
          competency?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          is_anonymous?: boolean
          recipient_id: string
          recipient_response?: string | null
          related_goal_id?: string | null
          related_project?: string | null
          related_review_id?: string | null
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by_recipient?: boolean
          author_id?: string | null
          body?: string
          competency?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          is_anonymous?: boolean
          recipient_id?: string
          recipient_response?: string | null
          related_goal_id?: string | null
          related_project?: string | null
          related_review_id?: string | null
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_related_goal_id_fkey"
            columns: ["related_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_related_review_id_fkey"
            columns: ["related_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_updates: {
        Row: {
          blockers: string | null
          created_at: string
          goal_id: string
          id: string
          new_status: string | null
          next_steps: string | null
          progress_percent: number | null
          update_text: string | null
          updated_by: string
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          goal_id: string
          id?: string
          new_status?: string | null
          next_steps?: string | null
          progress_percent?: number | null
          update_text?: string | null
          updated_by: string
        }
        Update: {
          blockers?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          new_status?: string | null
          next_steps?: string | null
          progress_percent?: number | null
          update_text?: string | null
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_updates_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_supervisor: boolean
          category: string | null
          completed_date: string | null
          contributes_to_company_goal: string | null
          created_at: string
          created_by: string | null
          current_value: string | null
          cycle_id: string | null
          description: string | null
          goal_type: string
          id: string
          is_public: boolean
          measurement_criteria: string | null
          parent_goal_id: string | null
          person_id: string
          priority: string | null
          progress_percent: number
          start_date: string | null
          status: string
          target_date: string | null
          target_value: string | null
          title: string
          unit: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_supervisor?: boolean
          category?: string | null
          completed_date?: string | null
          contributes_to_company_goal?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: string | null
          cycle_id?: string | null
          description?: string | null
          goal_type?: string
          id?: string
          is_public?: boolean
          measurement_criteria?: string | null
          parent_goal_id?: string | null
          person_id: string
          priority?: string | null
          progress_percent?: number
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_value?: string | null
          title: string
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_supervisor?: boolean
          category?: string | null
          completed_date?: string | null
          contributes_to_company_goal?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: string | null
          cycle_id?: string | null
          description?: string | null
          goal_type?: string
          id?: string
          is_public?: boolean
          measurement_criteria?: string | null
          parent_goal_id?: string | null
          person_id?: string
          priority?: string | null
          progress_percent?: number
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_value?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      review_templates: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          criteria: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          rating_scale: Json
          related_sop_id: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          criteria: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rating_scale: Json
          related_sop_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rating_scale?: Json
          related_sop_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          achievements: string | null
          acknowledged_at: string | null
          areas_improvement: string | null
          calibration_id: string | null
          calibration_notes: string | null
          challenges: string | null
          created_at: string
          cycle_id: string
          development_actions: string | null
          due_date: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          learning_goals: string | null
          overall_rating: string | null
          overall_score: number | null
          post_calibration_score: number | null
          pre_calibration_score: number | null
          responses: Json
          review_type: string
          reviewee_acknowledgment_comments: string | null
          reviewee_dispute_reason: string | null
          reviewee_disputes: boolean
          reviewee_id: string
          reviewer_comments: string | null
          reviewer_id: string
          shared_at: string | null
          started_at: string | null
          status: string
          strengths: string | null
          submitted_at: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          acknowledged_at?: string | null
          areas_improvement?: string | null
          calibration_id?: string | null
          calibration_notes?: string | null
          challenges?: string | null
          created_at?: string
          cycle_id: string
          development_actions?: string | null
          due_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          learning_goals?: string | null
          overall_rating?: string | null
          overall_score?: number | null
          post_calibration_score?: number | null
          pre_calibration_score?: number | null
          responses?: Json
          review_type: string
          reviewee_acknowledgment_comments?: string | null
          reviewee_dispute_reason?: string | null
          reviewee_disputes?: boolean
          reviewee_id: string
          reviewer_comments?: string | null
          reviewer_id: string
          shared_at?: string | null
          started_at?: string | null
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          acknowledged_at?: string | null
          areas_improvement?: string | null
          calibration_id?: string | null
          calibration_notes?: string | null
          challenges?: string | null
          created_at?: string
          cycle_id?: string
          development_actions?: string | null
          due_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          learning_goals?: string | null
          overall_rating?: string | null
          overall_score?: number | null
          post_calibration_score?: number | null
          pre_calibration_score?: number | null
          responses?: Json
          review_type?: string
          reviewee_acknowledgment_comments?: string | null
          reviewee_dispute_reason?: string | null
          reviewee_disputes?: boolean
          reviewee_id?: string
          reviewer_comments?: string | null
          reviewer_id?: string
          shared_at?: string | null
          started_at?: string | null
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_calibration_fkey"
            columns: ["calibration_id"]
            isOneToOne: false
            referencedRelation: "calibrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "review_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          changed_fields: string[] | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          changed_fields?: string[] | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_code_categories: {
        Row: {
          cost_category_id: string
          cost_code_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          cost_category_id: string
          cost_code_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          cost_category_id?: string
          cost_code_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_categories_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_code_categories_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          created_at: string | null
          extra_id: string | null
          full_code: string | null
          id: string
          phase_code: string
          phase_description: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          extra_id?: string | null
          full_code?: string | null
          id?: string
          phase_code: string
          phase_description?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          extra_id?: string | null
          full_code?: string | null
          id?: string
          phase_code?: string
          phase_description?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "project_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          acquisition_type: string | null
          brand: string | null
          capacity: string | null
          category_id: string | null
          created_at: string | null
          current_location: string | null
          current_project_id: string | null
          description: string
          disposal_date: string | null
          engine_serial_number: string | null
          equipment_type: string | null
          fuel_tank_capacity_liters: number | null
          id: string
          inspection_type: string | null
          insurance_expiry: string | null
          internal_asset_tag: string | null
          last_inspection_date: string | null
          last_meter_reading_date: string | null
          meter_reading: number | null
          model: string | null
          next_inspection_due: string | null
          notes: string | null
          ownership_type: string | null
          parent_equipment_id: string | null
          photo_url: string | null
          plate: string | null
          purchase_cost: number | null
          purchase_date: string | null
          qr_code_url: string | null
          serial_number: string | null
          spectrum_code: string | null
          status: string | null
          tracking_tier: string | null
          type_code: string | null
          updated_at: string | null
          weight_class: string | null
          year: number | null
        }
        Insert: {
          acquisition_type?: string | null
          brand?: string | null
          capacity?: string | null
          category_id?: string | null
          created_at?: string | null
          current_location?: string | null
          current_project_id?: string | null
          description: string
          disposal_date?: string | null
          engine_serial_number?: string | null
          equipment_type?: string | null
          fuel_tank_capacity_liters?: number | null
          id?: string
          inspection_type?: string | null
          insurance_expiry?: string | null
          internal_asset_tag?: string | null
          last_inspection_date?: string | null
          last_meter_reading_date?: string | null
          meter_reading?: number | null
          model?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          ownership_type?: string | null
          parent_equipment_id?: string | null
          photo_url?: string | null
          plate?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_code_url?: string | null
          serial_number?: string | null
          spectrum_code?: string | null
          status?: string | null
          tracking_tier?: string | null
          type_code?: string | null
          updated_at?: string | null
          weight_class?: string | null
          year?: number | null
        }
        Update: {
          acquisition_type?: string | null
          brand?: string | null
          capacity?: string | null
          category_id?: string | null
          created_at?: string | null
          current_location?: string | null
          current_project_id?: string | null
          description?: string
          disposal_date?: string | null
          engine_serial_number?: string | null
          equipment_type?: string | null
          fuel_tank_capacity_liters?: number | null
          id?: string
          inspection_type?: string | null
          insurance_expiry?: string | null
          internal_asset_tag?: string | null
          last_inspection_date?: string | null
          last_meter_reading_date?: string | null
          meter_reading?: number | null
          model?: string | null
          next_inspection_due?: string | null
          notes?: string | null
          ownership_type?: string | null
          parent_equipment_id?: string | null
          photo_url?: string | null
          plate?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_code_url?: string | null
          serial_number?: string | null
          spectrum_code?: string | null
          status?: string | null
          tracking_tier?: string | null
          type_code?: string | null
          updated_at?: string | null
          weight_class?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_parent_equipment_id_fkey"
            columns: ["parent_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assemblies: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          primary_equipment_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          primary_equipment_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          primary_equipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assemblies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assemblies_primary_equipment_id_fkey"
            columns: ["primary_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assembly_members: {
        Row: {
          assembly_id: string
          equipment_id: string
          id: string
          is_required: boolean | null
          notes: string | null
        }
        Insert: {
          assembly_id: string
          equipment_id: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
        }
        Update: {
          assembly_id?: string
          equipment_id?: string
          id?: string
          is_required?: boolean | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assembly_members_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "equipment_assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assembly_members_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          code: string
          created_at: string | null
          default_inspection_template_id: string | null
          default_tracking_tier: string | null
          description: string | null
          id: string
          is_minor_equipment: boolean | null
          name: string
          requires_inspection_on_dispatch: boolean | null
          requires_operator_license: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          default_inspection_template_id?: string | null
          default_tracking_tier?: string | null
          description?: string | null
          id?: string
          is_minor_equipment?: boolean | null
          name: string
          requires_inspection_on_dispatch?: boolean | null
          requires_operator_license?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          default_inspection_template_id?: string | null
          default_tracking_tier?: string | null
          description?: string | null
          id?: string
          is_minor_equipment?: boolean | null
          name?: string
          requires_inspection_on_dispatch?: boolean | null
          requires_operator_license?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_categories_default_template_fkey"
            columns: ["default_inspection_template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inspections: {
        Row: {
          context: string
          created_at: string | null
          equipment_id: string
          id: string
          inspection_date: string | null
          inspector_id: string
          location_id: string | null
          meter_reading: number | null
          notes: string | null
          overall_result: string
          pdf_url: string | null
          project_id: string | null
          signature_url: string | null
          template_id: string
          trip_id: string | null
        }
        Insert: {
          context: string
          created_at?: string | null
          equipment_id: string
          id?: string
          inspection_date?: string | null
          inspector_id: string
          location_id?: string | null
          meter_reading?: number | null
          notes?: string | null
          overall_result: string
          pdf_url?: string | null
          project_id?: string | null
          signature_url?: string | null
          template_id: string
          trip_id?: string | null
        }
        Update: {
          context?: string
          created_at?: string | null
          equipment_id?: string
          id?: string
          inspection_date?: string | null
          inspector_id?: string
          location_id?: string | null
          meter_reading?: number | null
          notes?: string | null
          overall_result?: string
          pdf_url?: string | null
          project_id?: string | null
          signature_url?: string | null
          template_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inspections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_status_log: {
        Row: {
          changed_at: string | null
          changed_by: string
          equipment_id: string
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          equipment_id: string
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          equipment_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_status_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          attachments: Json | null
          category: string
          created_at: string | null
          description: string
          id: string
          person_id: string | null
          person_name: string
          person_role: string
          priority: string
          screen: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          attachments?: Json | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          person_id?: string | null
          person_name: string
          person_role: string
          priority?: string
          screen: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          attachments?: Json | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          person_id?: string | null
          person_name?: string
          person_role?: string
          priority?: string
          screen?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          created_at: string | null
          date: string
          equipment_id: string
          fuel_type: string | null
          id: string
          location_id: string | null
          logged_by: string
          meter_reading: number | null
          notes: string | null
          project_id: string | null
          quantity_liters: number
          receipt_url: string | null
          source: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          equipment_id: string
          fuel_type?: string | null
          id?: string
          location_id?: string | null
          logged_by: string
          meter_reading?: number | null
          notes?: string | null
          project_id?: string | null
          quantity_liters: number
          receipt_url?: string | null
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          equipment_id?: string
          fuel_type?: string | null
          id?: string
          location_id?: string | null
          logged_by?: string
          meter_reading?: number | null
          notes?: string | null
          project_id?: string | null
          quantity_liters?: number
          receipt_url?: string | null
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          caption: string | null
          id: string
          photo_url: string
          response_id: string
          taken_at: string | null
        }
        Insert: {
          caption?: string | null
          id?: string
          photo_url: string
          response_id: string
          taken_at?: string | null
        }
        Update: {
          caption?: string | null
          id?: string
          photo_url?: string
          response_id?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "inspection_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_responses: {
        Row: {
          id: string
          inspection_id: string
          notes: string | null
          result: string
          severity: string | null
          template_item_id: string
          work_order_id: string | null
        }
        Insert: {
          id?: string
          inspection_id: string
          notes?: string | null
          result: string
          severity?: string | null
          template_item_id: string
          work_order_id?: string | null
        }
        Update: {
          id?: string
          inspection_id?: string
          notes?: string | null
          result?: string
          severity?: string | null
          template_item_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_responses_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "equipment_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_work_order_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_items: {
        Row: {
          help_text: string | null
          id: string
          is_critical: boolean | null
          label: string
          options: Json | null
          requires_photo_on_fail: boolean | null
          response_type: string
          section_id: string
          sort_order: number
        }
        Insert: {
          help_text?: string | null
          id?: string
          is_critical?: boolean | null
          label: string
          options?: Json | null
          requires_photo_on_fail?: boolean | null
          response_type: string
          section_id: string
          sort_order: number
        }
        Update: {
          help_text?: string | null
          id?: string
          is_critical?: boolean | null
          label?: string
          options?: Json | null
          requires_photo_on_fail?: boolean | null
          response_type?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_sections: {
        Row: {
          description: string | null
          id: string
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          sort_order: number
          template_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          applies_to_categories: string[] | null
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_blocking: boolean | null
          is_mandatory: boolean | null
          name: string
          trigger_context: string[] | null
          validity_hours: number | null
          version: number | null
        }
        Insert: {
          applies_to_categories?: string[] | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_blocking?: boolean | null
          is_mandatory?: boolean | null
          name: string
          trigger_context?: string[] | null
          validity_hours?: number | null
          version?: number | null
        }
        Update: {
          applies_to_categories?: string[] | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_blocking?: boolean | null
          is_mandatory?: boolean | null
          name?: string
          trigger_context?: string[] | null
          validity_hours?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location_type: string | null
          name: string
          notes: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_type?: string | null
          name?: string
          notes?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_readings: {
        Row: {
          created_at: string | null
          equipment_id: string
          hours: number | null
          id: string
          is_verified: boolean | null
          kilometers: number | null
          notes: string | null
          reading_date: string | null
          reading_type: string
          recorded_by: string | null
          source: string
          source_id: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          hours?: number | null
          id?: string
          is_verified?: boolean | null
          kilometers?: number | null
          notes?: string | null
          reading_date?: string | null
          reading_type: string
          recorded_by?: string | null
          source: string
          source_id?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          hours?: number | null
          id?: string
          is_verified?: boolean | null
          kilometers?: number | null
          notes?: string | null
          reading_date?: string | null
          reading_type?: string
          recorded_by?: string | null
          source?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilization_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_period: string | null
          campaign_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          notes: string | null
          override_cost: number | null
          project_id: string
          rate_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          target_equipment_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period?: string | null
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          override_cost?: number | null
          project_id: string
          rate_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_equipment_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period?: string | null
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          override_cost?: number | null
          project_id?: string
          rate_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_equipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobilization_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "mobilization_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilization_campaigns_target_equipment_id_fkey"
            columns: ["target_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilization_rates: {
        Row: {
          code: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          rate: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          rate: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          reference_id: string | null
          reference_type: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_qualifications: {
        Row: {
          category_id: string
          created_at: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          issue_date: string | null
          license_number: string | null
          license_type: string | null
          notes: string | null
          person_id: string
          verified_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          license_number?: string | null
          license_type?: string | null
          notes?: string | null
          person_id: string
          verified_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          issue_date?: string | null
          license_number?: string | null
          license_type?: string | null
          notes?: string | null
          person_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_qualifications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_qualifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_qualifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          app_role: string | null
          auth_id: string | null
          cedula: string | null
          city: string | null
          code: string | null
          created_at: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          hire_date: string | null
          id: string
          license_expiry: string | null
          license_type: string | null
          name: string
          notification_preferences: Json | null
          notifications_enabled: boolean
          phone: string | null
          position: string | null
          status: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          app_role?: string | null
          auth_id?: string | null
          cedula?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          license_expiry?: string | null
          license_type?: string | null
          name: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean
          phone?: string | null
          position?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          app_role?: string | null
          auth_id?: string | null
          cedula?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          license_expiry?: string | null
          license_type?: string | null
          name?: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean
          phone?: string | null
          position?: string | null
          status?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_projects: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          person_id: string
          project_id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          person_id: string
          project_id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          person_id?: string
          project_id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_projects_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_extras: {
        Row: {
          code: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          notes: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_extras_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          billing_code: string | null
          budget: number | null
          client: string | null
          code: string
          created_at: string | null
          end_date: string | null
          id: string
          location: string | null
          manager: string | null
          name: string
          notes: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          billing_code?: string | null
          budget?: number | null
          client?: string | null
          code: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager?: string | null
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_code?: string | null
          budget?: number | null
          client?: string | null
          code?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          manager?: string | null
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          cost_code_id: string | null
          description: string
          id: string
          line_number: number
          notes: string | null
          purchase_order_id: string
          qty_pending: number | null
          qty_received: number | null
          quantity: number
          status: string | null
          total_cost: number | null
          unit_cost: number | null
          unit_id: string | null
        }
        Insert: {
          cost_code_id?: string | null
          description: string
          id?: string
          line_number: number
          notes?: string | null
          purchase_order_id: string
          qty_pending?: number | null
          qty_received?: number | null
          quantity: number
          status?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_id?: string | null
        }
        Update: {
          cost_code_id?: string | null
          description?: string
          id?: string
          line_number?: number
          notes?: string | null
          purchase_order_id?: string
          qty_pending?: number | null
          qty_received?: number | null
          quantity?: number
          status?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          date_expected: string | null
          date_issued: string | null
          document_url: string | null
          id: string
          notes: string | null
          po_number: string
          project_id: string | null
          requester_id: string | null
          status: string | null
          total_amount: number | null
          vendor_contact: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date_expected?: string | null
          date_issued?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          po_number: string
          project_id?: string | null
          requester_id?: string | null
          status?: string | null
          total_amount?: number | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date_expected?: string | null
          date_issued?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          po_number?: string
          project_id?: string | null
          requester_id?: string | null
          status?: string | null
          total_amount?: number | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_agreements: {
        Row: {
          billing_type: string | null
          condition_at_delivery: string | null
          condition_at_return: string | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          daily_rate: number | null
          delivery_photos_url: string | null
          end_date: string | null
          equipment_id: string
          id: string
          monthly_rate: number | null
          notes: string | null
          project_id: string | null
          return_photos_url: string | null
          start_date: string
          status: string | null
          vendor_contact: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          billing_type?: string | null
          condition_at_delivery?: string | null
          condition_at_return?: string | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          delivery_photos_url?: string | null
          end_date?: string | null
          equipment_id: string
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          project_id?: string | null
          return_photos_url?: string | null
          start_date: string
          status?: string | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          billing_type?: string | null
          condition_at_delivery?: string | null
          condition_at_return?: string | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          delivery_photos_url?: string | null
          end_date?: string | null
          equipment_id?: string
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          project_id?: string | null
          return_photos_url?: string | null
          start_date?: string
          status?: string | null
          vendor_contact?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          id: string
          next_number: number
          project_id: string | null
          seq_type: string
        }
        Insert: {
          id?: string
          next_number?: number
          project_id?: string | null
          seq_type: string
        }
        Update: {
          id?: string
          next_number?: number
          project_id?: string | null
          seq_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_request_lines: {
        Row: {
          category: string | null
          cost_category_id: string | null
          cost_code_id: string | null
          created_at: string | null
          delivered_at: string | null
          description: string
          equipment_id: string | null
          equipment_text: string | null
          from_location_id: string | null
          from_text: string | null
          id: string
          line_number: number
          line_type: string
          material_category: string | null
          notes: string | null
          po_reference: string | null
          purchase_order_line_id: string | null
          qty_delivered: number | null
          qty_scheduled: number | null
          quantity: number
          request_id: string
          status: string
          to_location_id: string | null
          to_text: string | null
          unit_id: string | null
          unit_text: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          cost_category_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          description: string
          equipment_id?: string | null
          equipment_text?: string | null
          from_location_id?: string | null
          from_text?: string | null
          id?: string
          line_number: number
          line_type: string
          material_category?: string | null
          notes?: string | null
          po_reference?: string | null
          purchase_order_line_id?: string | null
          qty_delivered?: number | null
          qty_scheduled?: number | null
          quantity?: number
          request_id: string
          status?: string
          to_location_id?: string | null
          to_text?: string | null
          unit_id?: string | null
          unit_text?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          cost_category_id?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          description?: string
          equipment_id?: string | null
          equipment_text?: string | null
          from_location_id?: string | null
          from_text?: string | null
          id?: string
          line_number?: number
          line_type?: string
          material_category?: string | null
          notes?: string | null
          po_reference?: string | null
          purchase_order_line_id?: string | null
          qty_delivered?: number | null
          qty_scheduled?: number | null
          quantity?: number
          request_id?: string
          status?: string
          to_location_id?: string | null
          to_text?: string | null
          unit_id?: string | null
          unit_text?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_request_lines_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sm_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_request_lines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      sm_requests: {
        Row: {
          approved_by: string | null
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          date_cancelled: string | null
          date_completed: string | null
          date_created: string | null
          date_required: string
          date_submitted: string | null
          id: string
          initial_priority: string | null
          notes: string | null
          priority: string | null
          project_id: string
          request_id: string | null
          requester_id: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          date_completed?: string | null
          date_created?: string | null
          date_required: string
          date_submitted?: string | null
          id?: string
          initial_priority?: string | null
          notes?: string | null
          priority?: string | null
          project_id: string
          request_id?: string | null
          requester_id: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          date_completed?: string | null
          date_created?: string | null
          date_required?: string
          date_submitted?: string | null
          id?: string
          initial_priority?: string | null
          notes?: string | null
          priority?: string | null
          project_id?: string
          request_id?: string | null
          requester_id?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sm_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sm_requests_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string | null
          id: string
          reviewed_by: string | null
          status: string | null
          suggested_by: string | null
          suggested_value: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          suggested_by?: string | null
          suggested_value: string
          table_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          suggested_by?: string | null
          suggested_value?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_events: {
        Row: {
          attachments: Json | null
          confirmation_code_used: string | null
          created_at: string | null
          event_timestamp: string | null
          event_type: string
          id: string
          location: string | null
          notes: string | null
          received_by_id: string | null
          received_by_name: string | null
          registered_by: string | null
          trip_id: string
        }
        Insert: {
          attachments?: Json | null
          confirmation_code_used?: string | null
          created_at?: string | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          location?: string | null
          notes?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          registered_by?: string | null
          trip_id: string
        }
        Update: {
          attachments?: Json | null
          confirmation_code_used?: string | null
          created_at?: string | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          received_by_id?: string | null
          received_by_name?: string | null
          registered_by?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_received_by_id_fkey"
            columns: ["received_by_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_line_assignments: {
        Row: {
          created_at: string | null
          id: string
          qty_delivered: number | null
          quantity_assigned: number
          request_line_id: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          qty_delivered?: number | null
          quantity_assigned: number
          request_line_id: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          qty_delivered?: number | null
          quantity_assigned?: number
          request_line_id?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_line_assignments_request_line_id_fkey"
            columns: ["request_line_id"]
            isOneToOne: false
            referencedRelation: "sm_request_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_line_assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          att_permit: boolean | null
          attachments: Json | null
          campaign_id: string | null
          confirmation_code: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          date_cancelled: string | null
          driver_id: string | null
          escort: boolean | null
          id: string
          is_external: boolean | null
          notes: string | null
          rate_id: string | null
          route_summary: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string
          trailer_id: string | null
          trip_id: string | null
          updated_at: string | null
          updated_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          att_permit?: boolean | null
          attachments?: Json | null
          campaign_id?: string | null
          confirmation_code?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          driver_id?: string | null
          escort?: boolean | null
          id?: string
          is_external?: boolean | null
          notes?: string | null
          rate_id?: string | null
          route_summary?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          trailer_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          att_permit?: boolean | null
          attachments?: Json | null
          campaign_id?: string | null
          confirmation_code?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          date_cancelled?: string | null
          driver_id?: string | null
          escort?: boolean | null
          id?: string
          is_external?: boolean | null
          notes?: string | null
          rate_id?: string | null
          route_summary?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          trailer_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mobilization_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "mobilization_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_app_roles: {
        Row: {
          app_code: string
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          person_id: string
          role_code: string
          updated_at: string | null
        }
        Insert: {
          app_code: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          person_id: string
          role_code: string
          updated_at?: string | null
        }
        Update: {
          app_code?: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          person_id?: string
          role_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_app_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_app_roles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          ruc: string | null
          trade_name: string | null
          vendor_type: string[] | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          ruc?: string | null
          trade_name?: string | null
          vendor_type?: string[] | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          ruc?: string | null
          trade_name?: string | null
          vendor_type?: string[] | null
        }
        Relationships: []
      }
      warehouse_items: {
        Row: {
          category: string | null
          code: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          description: string
          id: string
          is_active: boolean | null
          location: string | null
          min_stock: number | null
          photo_url: string | null
          unit_id: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          min_stock?: number | null
          photo_url?: string | null
          unit_id?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          min_stock?: number | null
          photo_url?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_transactions: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          project_id: string | null
          quantity: number
          reference: string | null
          transacted_by: string
          transaction_type: string
          warehouse_item_id: string
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          quantity: number
          reference?: string | null
          transacted_by: string
          transaction_type: string
          warehouse_item_id: string
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          quantity?: number
          reference?: string | null
          transacted_by?: string
          transaction_type?: string
          warehouse_item_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transactions_transacted_by_fkey"
            columns: ["transacted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transactions_warehouse_item_id_fkey"
            columns: ["warehouse_item_id"]
            isOneToOne: false
            referencedRelation: "warehouse_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transactions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          description: string
          id: string
          notes: string | null
          part_number: string | null
          quantity: number
          source: string | null
          total_cost: number | null
          unit_cost: number | null
          work_order_id: string
        }
        Insert: {
          description: string
          id?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id: string
        }
        Update: {
          description?: string
          id?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          date_closed: string | null
          date_completed: string | null
          date_due: string | null
          date_opened: string | null
          description: string | null
          equipment_id: string
          estimated_hours: number | null
          external_cost: number | null
          id: string
          inspection_response_id: string | null
          labor_cost: number | null
          meter_reading: number | null
          notes: string | null
          parts_cost: number | null
          priority: string | null
          project_id: string | null
          requested_by: string | null
          status: string | null
          title: string
          total_cost: number | null
          type: string
          work_order_number: string | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_completed?: string | null
          date_due?: string | null
          date_opened?: string | null
          description?: string | null
          equipment_id: string
          estimated_hours?: number | null
          external_cost?: number | null
          id?: string
          inspection_response_id?: string | null
          labor_cost?: number | null
          meter_reading?: number | null
          notes?: string | null
          parts_cost?: number | null
          priority?: string | null
          project_id?: string | null
          requested_by?: string | null
          status?: string | null
          title: string
          total_cost?: number | null
          type: string
          work_order_number?: string | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_completed?: string | null
          date_due?: string | null
          date_opened?: string | null
          description?: string | null
          equipment_id?: string
          estimated_hours?: number | null
          external_cost?: number | null
          id?: string
          inspection_response_id?: string | null
          labor_cost?: number | null
          meter_reading?: number | null
          notes?: string | null
          parts_cost?: number | null
          priority?: string | null
          project_id?: string | null
          requested_by?: string | null
          status?: string | null
          title?: string
          total_cost?: number | null
          type?: string
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_inspection_response_id_fkey"
            columns: ["inspection_response_id"]
            isOneToOne: false
            referencedRelation: "inspection_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_app_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  requests: {
    Tables: {
      approvals: {
        Row: {
          approver_id: string | null
          approver_role: string
          comments: string | null
          created_at: string
          decision: string | null
          decision_at: string | null
          delegated_at: string | null
          delegated_to_id: string | null
          delegation_reason: string | null
          id: string
          stamp_data: Json | null
          stamp_text: string | null
          step_order: number
          ticket_id: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          approver_role: string
          comments?: string | null
          created_at?: string
          decision?: string | null
          decision_at?: string | null
          delegated_at?: string | null
          delegated_to_id?: string | null
          delegation_reason?: string | null
          id?: string
          stamp_data?: Json | null
          stamp_text?: string | null
          step_order: number
          ticket_id: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          approver_role?: string
          comments?: string | null
          created_at?: string
          decision?: string | null
          decision_at?: string | null
          delegated_at?: string | null
          delegated_to_id?: string | null
          delegation_reason?: string | null
          id?: string
          stamp_data?: Json | null
          stamp_text?: string | null
          step_order?: number
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          ticket_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          ticket_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_internal?: boolean
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          read_at: string | null
          recipient_id: string
          sent_at: string | null
          status: string
          subject: string | null
          ticket_id: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          read_at?: string | null
          recipient_id: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      revisions: {
        Row: {
          created_at: string
          fields_changed: string[] | null
          id: string
          new_form_data: Json
          old_form_data: Json
          reason: string
          responded_at: string | null
          responded_by: string | null
          response_comments: string | null
          revised_at: string
          revised_by: string
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields_changed?: string[] | null
          id?: string
          new_form_data: Json
          old_form_data: Json
          reason: string
          responded_at?: string | null
          responded_by?: string | null
          response_comments?: string | null
          revised_at?: string
          revised_by: string
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields_changed?: string[] | null
          id?: string
          new_form_data?: Json
          old_form_data?: Json
          reason?: string
          responded_at?: string | null
          responded_by?: string | null
          response_comments?: string | null
          revised_at?: string
          revised_by?: string
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          current_value: number
          format: string | null
          prefix: string | null
          seq_type: string
        }
        Insert: {
          current_value?: number
          format?: string | null
          prefix?: string | null
          seq_type: string
        }
        Update: {
          current_value?: number
          format?: string | null
          prefix?: string | null
          seq_type?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string
          created_by_hr_admin: string | null
          current_assignee_id: string | null
          current_step: number
          deleted_at: string | null
          form_data: Json
          id: string
          manual_entry: boolean
          notes: string | null
          parent_ticket_id: string | null
          priority: string
          processed_at: string | null
          processed_by: string | null
          received_at: string | null
          received_by: string | null
          requester_id: string
          resolved_at: string | null
          selected_supervisor_id: string | null
          sla_deadline: string | null
          sla_hours: number | null
          status: string
          submitted_at: string | null
          tags: string[] | null
          ticket_number: string
          type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_hr_admin?: string | null
          current_assignee_id?: string | null
          current_step?: number
          deleted_at?: string | null
          form_data?: Json
          id?: string
          manual_entry?: boolean
          notes?: string | null
          parent_ticket_id?: string | null
          priority?: string
          processed_at?: string | null
          processed_by?: string | null
          received_at?: string | null
          received_by?: string | null
          requester_id: string
          resolved_at?: string | null
          selected_supervisor_id?: string | null
          sla_deadline?: string | null
          sla_hours?: number | null
          status?: string
          submitted_at?: string | null
          tags?: string[] | null
          ticket_number: string
          type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_hr_admin?: string | null
          current_assignee_id?: string | null
          current_step?: number
          deleted_at?: string | null
          form_data?: Json
          id?: string
          manual_entry?: boolean
          notes?: string | null
          parent_ticket_id?: string | null
          priority?: string
          processed_at?: string | null
          processed_by?: string | null
          received_at?: string | null
          received_by?: string | null
          requester_id?: string
          resolved_at?: string | null
          selected_supervisor_id?: string | null
          sla_deadline?: string | null
          sla_hours?: number | null
          status?: string
          submitted_at?: string | null
          tags?: string[] | null
          ticket_number?: string
          type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "types"
            referencedColumns: ["id"]
          },
        ]
      }
      types: {
        Row: {
          allow_supervisor_override: boolean
          approval_chain_template: Json | null
          category: string | null
          code: string
          created_at: string
          description: string | null
          form_schema: Json | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_type_id: string | null
          sla_hours: number | null
          sop_file_url: string | null
          sop_reference: string | null
          updated_at: string
        }
        Insert: {
          allow_supervisor_override?: boolean
          approval_chain_template?: Json | null
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          form_schema?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_type_id?: string | null
          sla_hours?: number | null
          sop_file_url?: string | null
          sop_reference?: string | null
          updated_at?: string
        }
        Update: {
          allow_supervisor_override?: boolean
          approval_chain_template?: Json | null
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          form_schema?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_type_id?: string | null
          sla_hours?: number | null
          sop_file_url?: string | null
          sop_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "types_parent_type_id_fkey"
            columns: ["parent_type_id"]
            isOneToOne: false
            referencedRelation: "types"
            referencedColumns: ["id"]
          },
        ]
      }
      watchers: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          notify_on: string[]
          ticket_id: string
          updated_at: string
          watch_reason: string | null
          watcher_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notify_on?: string[]
          ticket_id: string
          updated_at?: string
          watch_reason?: string | null
          watcher_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notify_on?: string[]
          ticket_id?: string
          updated_at?: string
          watch_reason?: string | null
          watcher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_ticket: { Args: { p_ticket_id: string }; Returns: boolean }
      next_sequence: { Args: { p_seq_type: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  workflows: {
    Tables: {
      instances: {
        Row: {
          completed_at: string | null
          context: Json
          created_at: string
          current_step: number
          deleted_at: string | null
          id: string
          process_version_id: string
          started_at: string
          started_by: string | null
          status: string
          subject_person_id: string
          total_steps: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_step?: number
          deleted_at?: string | null
          id?: string
          process_version_id: string
          started_at?: string
          started_by?: string | null
          status?: string
          subject_person_id: string
          total_steps: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_step?: number
          deleted_at?: string | null
          id?: string
          process_version_id?: string
          started_at?: string
          started_by?: string | null
          status?: string
          subject_person_id?: string
          total_steps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instances_process_version_id_fkey"
            columns: ["process_version_id"]
            isOneToOne: false
            referencedRelation: "process_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      process_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          id: string
          is_current: boolean
          process_id: string
          published_at: string
          published_by: string | null
          steps: Json
          version_number: string
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          process_id: string
          published_at?: string
          published_by?: string | null
          steps: Json
          version_number: string
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          process_id?: string
          published_at?: string
          published_by?: string | null
          steps?: Json
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_versions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          category: string | null
          code: string
          created_at: string
          current_version_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "process_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      step_assignments: {
        Row: {
          assigned_to_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          data: Json | null
          deleted_at: string | null
          id: string
          instance_id: string
          notes: string | null
          related_acknowledgment_id: string | null
          related_ticket_id: string | null
          status: string
          step_id: string
          step_name: string
          step_order: number
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          id?: string
          instance_id: string
          notes?: string | null
          related_acknowledgment_id?: string | null
          related_ticket_id?: string | null
          status?: string
          step_id: string
          step_name: string
          step_order: number
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          data?: Json | null
          deleted_at?: string | null
          id?: string
          instance_id?: string
          notes?: string | null
          related_acknowledgment_id?: string | null
          related_ticket_id?: string | null
          status?: string
          step_id?: string
          step_name?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_assignments_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  audit: {
    Enums: {},
  },
  core: {
    Enums: {},
  },
  docs: {
    Enums: {},
  },
  files: {
    Enums: {},
  },
  hr: {
    Enums: {},
  },
  learning: {
    Enums: {},
  },
  mdm: {
    Enums: {},
  },
  notifications: {
    Enums: {},
  },
  payroll: {
    Enums: {},
  },
  performance: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  requests: {
    Enums: {},
  },
  workflows: {
    Enums: {},
  },
} as const
