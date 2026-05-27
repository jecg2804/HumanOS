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
      [_ in never]: never
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
          variables_used: Json | null
        }
        Insert: {
          created_at?: string
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
          variables_used?: Json | null
        }
        Update: {
          created_at?: string
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
        }
        Insert: {
          completed_at?: string | null
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
        }
        Update: {
          completed_at?: string | null
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
          id: string
          is_current: boolean
          neighborhood: string | null
          notes: string | null
          person_id: string
          postal_code: string | null
          province: string | null
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
          id?: string
          is_current?: boolean
          neighborhood?: string | null
          notes?: string | null
          person_id: string
          postal_code?: string | null
          province?: string | null
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
          id?: string
          is_current?: boolean
          neighborhood?: string | null
          notes?: string | null
          person_id?: string
          postal_code?: string | null
          province?: string | null
          street?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_name: string | null
          contact_type: string
          created_at: string
          email: string | null
          id: string
          is_emergency: boolean
          is_primary: boolean
          notes: string | null
          person_id: string
          phone: string | null
          relationship: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          notes?: string | null
          person_id: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          is_emergency?: boolean
          is_primary?: boolean
          notes?: string | null
          person_id?: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      employments: {
        Row: {
          app_role: string
          created_at: string
          created_by: string | null
          created_from: string
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
          supervisor_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "org_units"
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
        ]
      }
      employment_types: {
        Row: {
          id: string
          code: string
          name: string
          short_name: string
          is_active: boolean
          display_order: number | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          short_name: string
          is_active?: boolean
          display_order?: number | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          short_name?: string
          is_active?: boolean
          display_order?: number | null
        }
        Relationships: []
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
            foreignKeyName: "invite_codes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          movimientos_location_id: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_type: string
          movimientos_location_id?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          movimientos_location_id?: string | null
          name?: string
          notes?: string | null
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
          doctor_name: string | null
          doctor_phone: string | null
          id: string
          medical_insurance_number: string | null
          medical_insurance_provider: string | null
          notes: string | null
          person_id: string
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
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          medical_insurance_number?: string | null
          medical_insurance_provider?: string | null
          notes?: string | null
          person_id: string
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
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          medical_insurance_number?: string | null
          medical_insurance_provider?: string | null
          notes?: string | null
          person_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_info_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      org_units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
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
          employee_code: string | null
          full_name: string
          gender: string | null
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
          status: string
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          created_from?: string
          date_of_birth?: string | null
          employee_code?: string | null
          full_name: string
          gender?: string | null
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
          status?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          created_from?: string
          date_of_birth?: string | null
          employee_code?: string | null
          full_name?: string
          gender?: string | null
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
          status?: string
          updated_at?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          external_data?: Json | null
          external_id: string
          id?: string
          last_synced_at?: string
          person_id: string
          source_system: string
        }
        Update: {
          created_at?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          last_synced_at?: string
          person_id?: string
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_sources_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_documents: {
        Row: {
          created_at: string
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
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
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
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
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
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_supervisor_position: boolean
          level: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_supervisor_position?: boolean
          level?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_supervisor_position?: boolean
          level?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          dashboard_layout: Json | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_employment_scd2_change: {
        Args: {
          p_person_id: string
          p_position_id: string | null
          p_position_text: string | null
          p_department_id: string | null
          p_department_text: string | null
          p_office_id: string | null
          p_office_text: string | null
          p_supervisor_id: string | null
          p_hire_date: string
          p_app_role: string
          p_employment_type_id: string
          p_actor_id: string
        }
        Returns: undefined
      }
      complete_onboarding_writes: {
        Args: {
          p_invite_id: string
          p_person_id: string
          p_auth_id: string
          p_photo_path: string | null
          p_emergency: Json
          p_medical: Json
          p_address: Json
          p_ack_ethics_at: string
          p_ack_child_labor_at: string
          p_ip_address: string | null
          p_user_agent: string | null
        }
        Returns: undefined
      }
      current_app_role: { Args: never; Returns: string }
      current_person_id: { Args: never; Returns: string }
      find_auth_user_by_identifier: {
        Args: { p_field: string; p_value: string }
        Returns: {
          id: string
          email: string | null
          phone: string | null
          raw_app_meta_data: Json
          encrypted_password: string | null
        }[]
      }
      has_direct_reports: { Args: never; Returns: boolean }
      is_hr_admin: { Args: never; Returns: boolean }
      is_president_or_admin: { Args: never; Returns: boolean }
      is_supervisor_of: { Args: { target_person_id: string }; Returns: boolean }
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
  notifications: {
    Tables: {
      outbox: {
        Row: {
          attempts: number
          body: string | null
          body_html: string | null
          channel: string
          created_at: string
          error_message: string | null
          expires_at: string | null
          id: string
          last_attempt_at: string | null
          max_attempts: number
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
          error_message?: string | null
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
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
          error_message?: string | null
          expires_at?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number
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
          p_recipient_id: string
          p_notification_type: string
          p_subject: string
          p_body: string
          p_template_code: string
          p_template_variables: Json
          p_metadata: Json
        }
        Returns: string
      }
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
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
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
          id: string
          notify_on: string[]
          ticket_id: string
          watch_reason: string | null
          watcher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_on?: string[]
          ticket_id: string
          watch_reason?: string | null
          watcher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_on?: string[]
          ticket_id?: string
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
  notifications: {
    Enums: {},
  },
  performance: {
    Enums: {},
  },
  requests: {
    Enums: {},
  },
  workflows: {
    Enums: {},
  },
} as const
