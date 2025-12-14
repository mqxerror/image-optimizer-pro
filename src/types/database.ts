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
      ai_jobs: {
        Row: {
          ai_model: string
          attempt_count: number | null
          callback_at: string | null
          callback_received: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_code: string | null
          error_message: string | null
          id: string
          input_url: string
          input_url_2: string | null
          job_type: string
          last_error: string | null
          max_attempts: number | null
          metadata: Json | null
          next_retry_at: string | null
          organization_id: string
          processing_time_ms: number | null
          prompt: string | null
          provider: string | null
          result_url: string | null
          settings: Json | null
          source: string
          source_id: string | null
          status: string | null
          submitted_at: string | null
          task_id: string | null
          tokens_refunded: boolean | null
          tokens_reserved: number | null
          tokens_used: number | null
        }
        Insert: {
          ai_model: string
          attempt_count?: number | null
          callback_at?: string | null
          callback_received?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_url: string
          input_url_2?: string | null
          job_type: string
          last_error?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          next_retry_at?: string | null
          organization_id: string
          processing_time_ms?: number | null
          prompt?: string | null
          provider?: string | null
          result_url?: string | null
          settings?: Json | null
          source: string
          source_id?: string | null
          status?: string | null
          submitted_at?: string | null
          task_id?: string | null
          tokens_refunded?: boolean | null
          tokens_reserved?: number | null
          tokens_used?: number | null
        }
        Update: {
          ai_model?: string
          attempt_count?: number | null
          callback_at?: string | null
          callback_received?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_url?: string
          input_url_2?: string | null
          job_type?: string
          last_error?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          next_retry_at?: string | null
          organization_id?: string
          processing_time_ms?: number | null
          prompt?: string | null
          provider?: string | null
          result_url?: string | null
          settings?: Json | null
          source?: string
          source_id?: string | null
          status?: string | null
          submitted_at?: string | null
          task_id?: string | null
          tokens_refunded?: boolean | null
          tokens_reserved?: number | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_configs: {
        Row: {
          avg_processing_time_sec: number | null
          created_at: string | null
          description: string | null
          display_name: string
          failure_check: Json | null
          id: string
          is_active: boolean | null
          max_processing_time_sec: number | null
          provider: string | null
          request_template: Json
          result_url_paths: string[] | null
          status_endpoint: string
          submit_endpoint: string
          success_check: Json | null
          supports_callback: boolean | null
          task_id_path: string[] | null
          token_cost: number | null
          updated_at: string | null
        }
        Insert: {
          avg_processing_time_sec?: number | null
          created_at?: string | null
          description?: string | null
          display_name: string
          failure_check?: Json | null
          id: string
          is_active?: boolean | null
          max_processing_time_sec?: number | null
          provider?: string | null
          request_template: Json
          result_url_paths?: string[] | null
          status_endpoint: string
          submit_endpoint: string
          success_check?: Json | null
          supports_callback?: boolean | null
          task_id_path?: string[] | null
          token_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_processing_time_sec?: number | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          failure_check?: Json | null
          id?: string
          is_active?: boolean | null
          max_processing_time_sec?: number | null
          provider?: string | null
          request_template?: Json
          result_url_paths?: string[] | null
          status_endpoint?: string
          submit_endpoint?: string
          success_check?: Json | null
          supports_callback?: boolean | null
          task_id_path?: string[] | null
          token_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      combination_jobs: {
        Row: {
          advanced_settings: Json | null
          ai_model: string | null
          blend_intensity: number | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          generated_prompt: string | null
          id: string
          is_favorite: boolean | null
          is_reprocess: boolean | null
          jewelry_image_analysis: Json | null
          jewelry_image_storage_path: string | null
          jewelry_image_url: string
          lighting_match: number | null
          model_image_analysis: Json | null
          model_image_storage_path: string | null
          model_image_url: string
          organization_id: string | null
          parent_job_id: string | null
          position_y: number | null
          processing_time_sec: number | null
          result_storage_path: string | null
          result_thumbnail_url: string | null
          result_url: string | null
          rotation: number | null
          scale: number | null
          status: string | null
          task_id: string | null
          template_id: string | null
          tokens_used: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          advanced_settings?: Json | null
          ai_model?: string | null
          blend_intensity?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          generated_prompt?: string | null
          id?: string
          is_favorite?: boolean | null
          is_reprocess?: boolean | null
          jewelry_image_analysis?: Json | null
          jewelry_image_storage_path?: string | null
          jewelry_image_url: string
          lighting_match?: number | null
          model_image_analysis?: Json | null
          model_image_storage_path?: string | null
          model_image_url: string
          organization_id?: string | null
          parent_job_id?: string | null
          position_y?: number | null
          processing_time_sec?: number | null
          result_storage_path?: string | null
          result_thumbnail_url?: string | null
          result_url?: string | null
          rotation?: number | null
          scale?: number | null
          status?: string | null
          task_id?: string | null
          template_id?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          advanced_settings?: Json | null
          ai_model?: string | null
          blend_intensity?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          generated_prompt?: string | null
          id?: string
          is_favorite?: boolean | null
          is_reprocess?: boolean | null
          jewelry_image_analysis?: Json | null
          jewelry_image_storage_path?: string | null
          jewelry_image_url?: string
          lighting_match?: number | null
          model_image_analysis?: Json | null
          model_image_storage_path?: string | null
          model_image_url?: string
          organization_id?: string | null
          parent_job_id?: string | null
          position_y?: number | null
          processing_time_sec?: number | null
          result_storage_path?: string | null
          result_thumbnail_url?: string | null
          result_url?: string | null
          rotation?: number | null
          scale?: number | null
          status?: string | null
          task_id?: string | null
          template_id?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "combination_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combination_jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "combination_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combination_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "combination_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      combination_templates: {
        Row: {
          advanced_settings: Json | null
          blend_intensity: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          lighting_match: number | null
          name: string
          organization_id: string | null
          position_y: number | null
          rotation: number | null
          scale: number | null
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          advanced_settings?: Json | null
          blend_intensity?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          lighting_match?: number | null
          name: string
          organization_id?: string | null
          position_y?: number | null
          rotation?: number | null
          scale?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          advanced_settings?: Json | null
          blend_intensity?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          lighting_match?: number | null
          name?: string
          organization_id?: string | null
          position_y?: number | null
          rotation?: number | null
          scale?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "combination_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_connections: {
        Row: {
          access_token: string
          connected_by: string
          created_at: string | null
          google_email: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          organization_id: string
          refresh_token: string | null
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          connected_by: string
          created_at?: string | null
          google_email: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          connected_by?: string
          created_at?: string | null
          google_email?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id?: string
          refresh_token?: string | null
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      processing_history: {
        Row: {
          ai_model: string | null
          completed_at: string | null
          created_by: string | null
          error_message: string | null
          file_id: string
          file_name: string | null
          file_size_after: number | null
          file_size_before: number | null
          generated_prompt: string | null
          id: string
          optimized_storage_path: string | null
          optimized_url: string | null
          organization_id: string | null
          original_url: string | null
          parent_id: string | null
          processing_time_sec: number | null
          project_id: string | null
          resolution: string | null
          started_at: string | null
          status: string | null
          tokens_used: number | null
          version: number | null
        }
        Insert: {
          ai_model?: string | null
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_id: string
          file_name?: string | null
          file_size_after?: number | null
          file_size_before?: number | null
          generated_prompt?: string | null
          id?: string
          optimized_storage_path?: string | null
          optimized_url?: string | null
          organization_id?: string | null
          original_url?: string | null
          parent_id?: string | null
          processing_time_sec?: number | null
          project_id?: string | null
          resolution?: string | null
          started_at?: string | null
          status?: string | null
          tokens_used?: number | null
          version?: number | null
        }
        Update: {
          ai_model?: string | null
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_id?: string
          file_name?: string | null
          file_size_after?: number | null
          file_size_before?: number | null
          generated_prompt?: string | null
          id?: string
          optimized_storage_path?: string | null
          optimized_url?: string | null
          organization_id?: string | null
          original_url?: string | null
          parent_id?: string | null
          processing_time_sec?: number | null
          project_id?: string | null
          resolution?: string | null
          started_at?: string | null
          status?: string | null
          tokens_used?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_history_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "processing_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          ai_model: string | null
          batch_id: string | null
          error_message: string | null
          file_id: string
          file_name: string | null
          file_url: string | null
          folder_id: string | null
          folder_path: string | null
          generated_prompt: string | null
          id: string
          last_updated: string | null
          organization_id: string | null
          progress: number | null
          project_id: string | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          task_id: string | null
          thumbnail_url: string | null
          tokens_reserved: number | null
        }
        Insert: {
          ai_model?: string | null
          batch_id?: string | null
          error_message?: string | null
          file_id: string
          file_name?: string | null
          file_url?: string | null
          folder_id?: string | null
          folder_path?: string | null
          generated_prompt?: string | null
          id?: string
          last_updated?: string | null
          organization_id?: string | null
          progress?: number | null
          project_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          tokens_reserved?: number | null
        }
        Update: {
          ai_model?: string | null
          batch_id?: string | null
          error_message?: string | null
          file_id?: string
          file_name?: string | null
          file_url?: string | null
          folder_id?: string | null
          folder_path?: string | null
          generated_prompt?: string | null
          id?: string
          last_updated?: string | null
          organization_id?: string | null
          progress?: number | null
          project_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          thumbnail_url?: string | null
          tokens_reserved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_model: string | null
          created_at: string | null
          custom_prompt: string | null
          failed_images: number | null
          id: string
          input_folder_id: string | null
          input_folder_url: string | null
          name: string
          organization_id: string | null
          output_folder_id: string | null
          output_folder_url: string | null
          processed_images: number | null
          prompt_mode: string | null
          resolution: string | null
          status: string | null
          studio_preset_id: string | null
          template_id: string | null
          total_images: number | null
          total_tokens: number | null
          trial_completed: number | null
          trial_count: number | null
          updated_at: string | null
        }
        Insert: {
          ai_model?: string | null
          created_at?: string | null
          custom_prompt?: string | null
          failed_images?: number | null
          id?: string
          input_folder_id?: string | null
          input_folder_url?: string | null
          name: string
          organization_id?: string | null
          output_folder_id?: string | null
          output_folder_url?: string | null
          processed_images?: number | null
          prompt_mode?: string | null
          resolution?: string | null
          status?: string | null
          studio_preset_id?: string | null
          template_id?: string | null
          total_images?: number | null
          total_tokens?: number | null
          trial_completed?: number | null
          trial_count?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_model?: string | null
          created_at?: string | null
          custom_prompt?: string | null
          failed_images?: number | null
          id?: string
          input_folder_id?: string | null
          input_folder_url?: string | null
          name?: string
          organization_id?: string | null
          output_folder_id?: string | null
          output_folder_url?: string | null
          processed_images?: number | null
          prompt_mode?: string | null
          resolution?: string | null
          status?: string | null
          studio_preset_id?: string | null
          template_id?: string | null
          total_images?: number | null
          total_tokens?: number | null
          trial_completed?: number | null
          trial_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_studio_preset_id_fkey"
            columns: ["studio_preset_id"]
            isOneToOne: false
            referencedRelation: "studio_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          background: string | null
          base_prompt: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          lighting: string | null
          name: string
          organization_id: string | null
          style: string | null
          subcategory: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          background?: string | null
          base_prompt?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          lighting?: string | null
          name: string
          organization_id?: string | null
          style?: string | null
          subcategory?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          background?: string | null
          base_prompt?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          lighting?: string | null
          name?: string
          organization_id?: string | null
          style?: string | null
          subcategory?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      regenerate_presets: {
        Row: {
          ai_model: string
          created_at: string | null
          created_by: string | null
          custom_prompt: string | null
          id: string
          name: string
          organization_id: string
          prompt_mode: string
          studio_preset_id: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_model: string
          created_at?: string | null
          created_by?: string | null
          custom_prompt?: string | null
          id?: string
          name: string
          organization_id: string
          prompt_mode: string
          studio_preset_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_model?: string
          created_at?: string | null
          created_by?: string | null
          custom_prompt?: string | null
          id?: string
          name?: string
          organization_id?: string
          prompt_mode?: string
          studio_preset_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regenerate_presets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regenerate_presets_studio_preset_id_fkey"
            columns: ["studio_preset_id"]
            isOneToOne: false
            referencedRelation: "studio_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regenerate_presets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_images: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          image_position: number | null
          job_id: string
          last_push_error: string | null
          optimized_storage_path: string | null
          optimized_url: string | null
          original_height: number | null
          original_url: string
          original_width: number | null
          processing_time_ms: number | null
          product_title: string | null
          push_attempts: number | null
          pushed_at: string | null
          shopify_image_id: string
          shopify_product_id: string
          status: string | null
          tokens_used: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_position?: number | null
          job_id: string
          last_push_error?: string | null
          optimized_storage_path?: string | null
          optimized_url?: string | null
          original_height?: number | null
          original_url: string
          original_width?: number | null
          processing_time_ms?: number | null
          product_title?: string | null
          push_attempts?: number | null
          pushed_at?: string | null
          shopify_image_id: string
          shopify_product_id: string
          status?: string | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_position?: number | null
          job_id?: string
          last_push_error?: string | null
          optimized_storage_path?: string | null
          optimized_url?: string | null
          original_height?: number | null
          original_url?: string
          original_width?: number | null
          processing_time_ms?: number | null
          product_title?: string | null
          push_attempts?: number | null
          pushed_at?: string | null
          shopify_image_id?: string
          shopify_product_id?: string
          status?: string | null
          tokens_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "shopify_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_stores: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          last_sync_at: string | null
          scopes: string[] | null
          settings: Json | null
          shop_domain: string
          shop_name: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          webhook_id: string | null
          webhook_secret: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          scopes?: string[] | null
          settings?: Json | null
          shop_domain: string
          shop_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          webhook_id?: string | null
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          scopes?: string[] | null
          settings?: Json | null
          shop_domain?: string
          shop_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_id?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      shopify_sync_jobs: {
        Row: {
          approved_at: string | null
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          failed_count: number | null
          id: string
          image_count: number | null
          last_error: string | null
          max_retries: number | null
          next_retry_at: string | null
          preset_id: string | null
          preset_type: string
          processed_count: number | null
          product_count: number | null
          pushed_count: number | null
          retry_count: number | null
          status: string | null
          store_id: string
          tokens_used: number | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          failed_count?: number | null
          id?: string
          image_count?: number | null
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          preset_id?: string | null
          preset_type: string
          processed_count?: number | null
          product_count?: number | null
          pushed_count?: number | null
          retry_count?: number | null
          status?: string | null
          store_id: string
          tokens_used?: number | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          failed_count?: number | null
          id?: string
          image_count?: number | null
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          preset_id?: string | null
          preset_type?: string
          processed_count?: number | null
          product_count?: number | null
          pushed_count?: number | null
          retry_count?: number | null
          status?: string | null
          store_id?: string
          tokens_used?: number | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_sync_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_connections: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          metadata: Json | null
          organization_id: string
          provider: string
          provider_email: string | null
          provider_user_id: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          provider: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          provider?: string
          provider_email?: string | null
          provider_user_id?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_generations: {
        Row: {
          ai_model: string
          created_at: string | null
          created_by: string | null
          custom_prompt: string | null
          error_message: string | null
          final_prompt: string | null
          id: string
          is_favorite: boolean | null
          organization_id: string | null
          original_file_name: string | null
          original_storage_path: string | null
          original_url: string
          preset_id: string | null
          processing_time_sec: number | null
          result_storage_path: string | null
          result_url: string | null
          settings_snapshot: Json
          status: string | null
          task_id: string | null
          tokens_used: number | null
        }
        Insert: {
          ai_model: string
          created_at?: string | null
          created_by?: string | null
          custom_prompt?: string | null
          error_message?: string | null
          final_prompt?: string | null
          id?: string
          is_favorite?: boolean | null
          organization_id?: string | null
          original_file_name?: string | null
          original_storage_path?: string | null
          original_url: string
          preset_id?: string | null
          processing_time_sec?: number | null
          result_storage_path?: string | null
          result_url?: string | null
          settings_snapshot: Json
          status?: string | null
          task_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          ai_model?: string
          created_at?: string | null
          created_by?: string | null
          custom_prompt?: string | null
          error_message?: string | null
          final_prompt?: string | null
          id?: string
          is_favorite?: boolean | null
          organization_id?: string | null
          original_file_name?: string | null
          original_storage_path?: string | null
          original_url?: string
          preset_id?: string | null
          processing_time_sec?: number | null
          result_storage_path?: string | null
          result_url?: string | null
          settings_snapshot?: Json
          status?: string | null
          task_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_generations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_generations_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "studio_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_ideas: {
        Row: {
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          text: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          text: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          text?: string
        }
        Relationships: []
      }
      studio_presets: {
        Row: {
          ai_model: string | null
          background_color: string | null
          background_reflection: number | null
          background_shadow: string | null
          background_surface: string | null
          background_type: string | null
          camera_angle: string | null
          camera_aperture: string | null
          camera_distance: string | null
          camera_focus: string | null
          camera_lens: string | null
          category: string | null
          composition_aspect_ratio: string | null
          composition_framing: string | null
          composition_padding: number | null
          created_at: string | null
          created_by: string | null
          custom_prompt: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          jewelry_color_pop: number | null
          jewelry_detail: number | null
          jewelry_finish: string | null
          jewelry_metal: string | null
          jewelry_sparkle: number | null
          lighting_direction: string | null
          lighting_fill_intensity: number | null
          lighting_key_intensity: number | null
          lighting_rim_intensity: number | null
          lighting_style: string | null
          name: string
          organization_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          ai_model?: string | null
          background_color?: string | null
          background_reflection?: number | null
          background_shadow?: string | null
          background_surface?: string | null
          background_type?: string | null
          camera_angle?: string | null
          camera_aperture?: string | null
          camera_distance?: string | null
          camera_focus?: string | null
          camera_lens?: string | null
          category?: string | null
          composition_aspect_ratio?: string | null
          composition_framing?: string | null
          composition_padding?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_prompt?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          jewelry_color_pop?: number | null
          jewelry_detail?: number | null
          jewelry_finish?: string | null
          jewelry_metal?: string | null
          jewelry_sparkle?: number | null
          lighting_direction?: string | null
          lighting_fill_intensity?: number | null
          lighting_key_intensity?: number | null
          lighting_rim_intensity?: number | null
          lighting_style?: string | null
          name: string
          organization_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          ai_model?: string | null
          background_color?: string | null
          background_reflection?: number | null
          background_shadow?: string | null
          background_surface?: string | null
          background_type?: string | null
          camera_angle?: string | null
          camera_aperture?: string | null
          camera_distance?: string | null
          camera_focus?: string | null
          camera_lens?: string | null
          category?: string | null
          composition_aspect_ratio?: string | null
          composition_framing?: string | null
          composition_padding?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_prompt?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          jewelry_color_pop?: number | null
          jewelry_detail?: number | null
          jewelry_finish?: string | null
          jewelry_metal?: string | null
          jewelry_sparkle?: number | null
          lighting_direction?: string | null
          lighting_fill_intensity?: number | null
          lighting_key_intensity?: number | null
          lighting_rim_intensity?: number | null
          lighting_style?: string | null
          name?: string
          organization_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_presets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      token_accounts: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          lifetime_purchased: number | null
          lifetime_used: number | null
          low_balance_threshold: number | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          lifetime_purchased?: number | null
          lifetime_used?: number | null
          low_balance_threshold?: number | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          lifetime_purchased?: number | null
          lifetime_used?: number | null
          low_balance_threshold?: number | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      token_pricing: {
        Row: {
          description: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          operation: string
          token_cost: number
        }
        Insert: {
          description?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          operation: string
          token_cost: number
        }
        Update: {
          description?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          operation?: string
          token_cost?: number
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          account_id: string | null
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "token_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          created_at: string | null
          organization_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          organization_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          organization_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_tokens: {
        Args: {
          p_amount: number
          p_description?: string
          p_organization_id: string
        }
        Returns: boolean
      }
      bulk_insert_queue_items: {
        Args: { p_items: Json }
        Returns: {
          batch_id: string
          inserted_count: number
        }[]
      }
      deduct_tokens: {
        Args: { p_amount: number; p_organization_id: string }
        Returns: boolean
      }
      get_active_jobs: {
        Args: { p_org_id: string }
        Returns: {
          ai_model: string
          attempt_count: number
          created_at: string
          elapsed_seconds: number
          input_url: string
          job_id: string
          job_type: string
          source: string
          source_id: string
          status: string
          submitted_at: string
        }[]
      }
      get_ai_job_stats: {
        Args: { p_days?: number; p_org_id: string }
        Returns: {
          avg_processing_time_ms: number
          failed_jobs: number
          jobs_by_day: Json
          jobs_by_model: Json
          jobs_by_source: Json
          pending_jobs: number
          success_rate: number
          successful_jobs: number
          total_jobs: number
          total_tokens_used: number
        }[]
      }
      get_history_page: {
        Args: {
          p_ai_model?: string
          p_date_from?: string
          p_date_to?: string
          p_organization_id: string
          p_page?: number
          p_page_size?: number
          p_project_id?: string
          p_search?: string
          p_status?: string
        }
        Returns: {
          ai_model: string
          completed_at: string
          created_by: string
          error_message: string
          file_id: string
          file_name: string
          generated_prompt: string
          id: string
          optimized_storage_path: string
          optimized_url: string
          organization_id: string
          original_url: string
          processing_time_sec: number
          project_id: string
          resolution: string
          started_at: string
          status: string
          tokens_used: number
          total_count: number
        }[]
      }
      get_queue_folder_stats: {
        Args: { p_organization_id: string }
        Returns: {
          completed_pct: number
          failed_count: number
          folder_id: string
          folder_path: string
          processing_count: number
          queued_count: number
          total_count: number
        }[]
      }
      get_queue_page: {
        Args: {
          p_folder_path?: string
          p_organization_id: string
          p_page?: number
          p_page_size?: number
          p_project_id?: string
          p_search?: string
          p_status?: string
        }
        Returns: {
          ai_model: string
          batch_id: string
          error_message: string
          file_id: string
          file_name: string
          file_url: string
          folder_id: string
          folder_path: string
          generated_prompt: string
          id: string
          last_updated: string
          organization_id: string
          progress: number
          project_id: string
          project_name: string
          retry_count: number
          started_at: string
          status: string
          task_id: string
          tokens_reserved: number
          total_count: number
        }[]
      }
      get_queue_stats: {
        Args: { p_organization_id: string }
        Returns: {
          failed_count: number
          processing_count: number
          queued_count: number
          total_count: number
        }[]
      }
      get_shopify_job_stats: {
        Args: { p_job_id: string }
        Returns: {
          failed: number
          processing: number
          pushed: number
          queued: number
          ready: number
          total: number
        }[]
      }
      get_user_organization_ids: { Args: never; Returns: string[] }
      get_user_primary_organization: { Args: never; Returns: string }
      increment_project_failed: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      increment_project_processed: {
        Args: { p_project_id: string; p_tokens?: number }
        Returns: undefined
      }
      increment_trial_completed: {
        Args: { p_project_id: string }
        Returns: number
      }
      is_organization_owner: { Args: { org_id: string }; Returns: boolean }
      timeout_stuck_ai_jobs: {
        Args: never
        Returns: {
          ai_model: string
          job_id: string
          old_status: string
        }[]
      }
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
  public: {
    Enums: {},
  },
} as const
