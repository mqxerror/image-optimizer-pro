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
      organizations: {
        Row: {
          id: string
          name: string
          owner_id: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_organizations: {
        Row: {
          user_id: string
          organization_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          organization_id: string
          role?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          organization_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          input_folder_url: string | null
          input_folder_id: string | null
          output_folder_url: string | null
          output_folder_id: string | null
          template_id: string | null
          custom_prompt: string | null
          status: string
          resolution: string
          ai_model: string | null
          studio_preset_id: string | null
          prompt_mode: 'template' | 'preset' | 'custom'
          trial_count: number
          trial_completed: number
          total_images: number
          processed_images: number
          failed_images: number
          total_tokens: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          input_folder_url?: string | null
          input_folder_id?: string | null
          output_folder_url?: string | null
          output_folder_id?: string | null
          template_id?: string | null
          custom_prompt?: string | null
          status?: string
          resolution?: string
          ai_model?: string | null
          studio_preset_id?: string | null
          prompt_mode?: 'template' | 'preset' | 'custom'
          trial_count?: number
          trial_completed?: number
          total_images?: number
          processed_images?: number
          failed_images?: number
          total_tokens?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          input_folder_url?: string | null
          input_folder_id?: string | null
          output_folder_url?: string | null
          output_folder_id?: string | null
          template_id?: string | null
          custom_prompt?: string | null
          status?: string
          resolution?: string
          ai_model?: string | null
          studio_preset_id?: string | null
          prompt_mode?: 'template' | 'preset' | 'custom'
          trial_count?: number
          trial_completed?: number
          total_images?: number
          processed_images?: number
          failed_images?: number
          total_tokens?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          }
        ]
      }
      prompt_templates: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          category: string | null
          subcategory: string | null
          base_prompt: string | null
          style: string | null
          background: string | null
          lighting: string | null
          is_system: boolean
          is_active: boolean
          created_by: string | null
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          category?: string | null
          subcategory?: string | null
          base_prompt?: string | null
          style?: string | null
          background?: string | null
          lighting?: string | null
          is_system?: boolean
          is_active?: boolean
          created_by?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          category?: string | null
          subcategory?: string | null
          base_prompt?: string | null
          style?: string | null
          background?: string | null
          lighting?: string | null
          is_system?: boolean
          is_active?: boolean
          created_by?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_templates_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      storage_connections: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          provider: string
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          provider_user_id: string | null
          provider_email: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          provider: string
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          provider_user_id?: string | null
          provider_email?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          provider?: string
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          provider_user_id?: string | null
          provider_email?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_connections_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_connections_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      processing_queue: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          file_id: string
          file_name: string | null
          file_url: string | null
          status: string
          progress: number
          task_id: string | null
          generated_prompt: string | null
          error_message: string | null
          retry_count: number
          tokens_reserved: number
          folder_path: string | null
          folder_id: string | null
          batch_id: string | null
          ai_model: string | null
          started_at: string
          last_updated: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          file_id: string
          file_name?: string | null
          file_url?: string | null
          status?: string
          progress?: number
          task_id?: string | null
          generated_prompt?: string | null
          error_message?: string | null
          retry_count?: number
          tokens_reserved?: number
          folder_path?: string | null
          folder_id?: string | null
          batch_id?: string | null
          ai_model?: string | null
          started_at?: string
          last_updated?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          file_id?: string
          file_name?: string | null
          file_url?: string | null
          status?: string
          progress?: number
          task_id?: string | null
          generated_prompt?: string | null
          error_message?: string | null
          retry_count?: number
          tokens_reserved?: number
          folder_path?: string | null
          folder_id?: string | null
          batch_id?: string | null
          ai_model?: string | null
          started_at?: string
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_queue_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      processing_history: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          file_id: string
          file_name: string | null
          original_url: string | null
          optimized_url: string | null
          optimized_storage_path: string | null
          status: string
          resolution: string | null
          tokens_used: number | null
          processing_time_sec: number | null
          generated_prompt: string | null
          error_message: string | null
          started_at: string | null
          completed_at: string
          created_by: string | null
          parent_id: string | null
          version: number
          ai_model: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          file_id: string
          file_name?: string | null
          original_url?: string | null
          optimized_url?: string | null
          optimized_storage_path?: string | null
          status?: string
          resolution?: string | null
          tokens_used?: number | null
          processing_time_sec?: number | null
          generated_prompt?: string | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string
          created_by?: string | null
          parent_id?: string | null
          version?: number
          ai_model?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          file_id?: string
          file_name?: string | null
          original_url?: string | null
          optimized_url?: string | null
          optimized_storage_path?: string | null
          status?: string
          resolution?: string | null
          tokens_used?: number | null
          processing_time_sec?: number | null
          generated_prompt?: string | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string
          created_by?: string | null
          parent_id?: string | null
          version?: number
          ai_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_history_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_history_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_history_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      token_accounts: {
        Row: {
          id: string
          organization_id: string
          balance: number
          lifetime_purchased: number
          lifetime_used: number
          low_balance_threshold: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          balance?: number
          lifetime_purchased?: number
          lifetime_used?: number
          low_balance_threshold?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          balance?: number
          lifetime_purchased?: number
          lifetime_used?: number
          low_balance_threshold?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_accounts_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      token_transactions: {
        Row: {
          id: string
          account_id: string
          type: string
          amount: number
          balance_before: number | null
          balance_after: number | null
          description: string | null
          reference_type: string | null
          reference_id: string | null
          metadata: Json | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          account_id: string
          type: string
          amount: number
          balance_before?: number | null
          balance_after?: number | null
          description?: string | null
          reference_type?: string | null
          reference_id?: string | null
          metadata?: Json | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          type?: string
          amount?: number
          balance_before?: number | null
          balance_after?: number | null
          description?: string | null
          reference_type?: string | null
          reference_id?: string | null
          metadata?: Json | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_account_id_fkey"
            columns: ["account_id"]
            referencedRelation: "token_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_transactions_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      token_pricing: {
        Row: {
          id: string
          operation: string
          token_cost: number
          display_name: string | null
          description: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          operation: string
          token_cost: number
          display_name?: string | null
          description?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          operation?: string
          token_cost?: number
          display_name?: string | null
          description?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      google_drive_connections: {
        Row: {
          id: string
          organization_id: string
          connected_by: string
          google_email: string
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          scopes: string[]
          is_active: boolean
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          connected_by: string
          google_email: string
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[]
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          connected_by?: string
          google_email?: string
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[]
          is_active?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_connections_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_drive_connections_connected_by_fkey"
            columns: ["connected_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      studio_presets: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          description: string | null
          category: string | null
          is_system: boolean
          is_active: boolean
          thumbnail_url: string | null
          // Camera settings
          camera_lens: string
          camera_aperture: string
          camera_angle: string
          camera_focus: string
          camera_distance: string
          // Lighting settings
          lighting_style: string
          lighting_key_intensity: number
          lighting_fill_intensity: number
          lighting_rim_intensity: number
          lighting_direction: string
          // Background settings
          background_type: string
          background_surface: string
          background_shadow: string
          background_reflection: number
          background_color: string | null
          // Jewelry settings
          jewelry_metal: string
          jewelry_finish: string
          jewelry_sparkle: number
          jewelry_color_pop: number
          jewelry_detail: number
          // Composition settings
          composition_framing: string
          composition_aspect_ratio: string
          composition_padding: number
          // AI model
          ai_model: string
          created_by: string | null
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          category?: string | null
          is_system?: boolean
          is_active?: boolean
          thumbnail_url?: string | null
          camera_lens?: string
          camera_aperture?: string
          camera_angle?: string
          camera_focus?: string
          camera_distance?: string
          lighting_style?: string
          lighting_key_intensity?: number
          lighting_fill_intensity?: number
          lighting_rim_intensity?: number
          lighting_direction?: string
          background_type?: string
          background_surface?: string
          background_shadow?: string
          background_reflection?: number
          background_color?: string | null
          jewelry_metal?: string
          jewelry_finish?: string
          jewelry_sparkle?: number
          jewelry_color_pop?: number
          jewelry_detail?: number
          composition_framing?: string
          composition_aspect_ratio?: string
          composition_padding?: number
          ai_model?: string
          created_by?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          category?: string | null
          is_system?: boolean
          is_active?: boolean
          thumbnail_url?: string | null
          camera_lens?: string
          camera_aperture?: string
          camera_angle?: string
          camera_focus?: string
          camera_distance?: string
          lighting_style?: string
          lighting_key_intensity?: number
          lighting_fill_intensity?: number
          lighting_rim_intensity?: number
          lighting_direction?: string
          background_type?: string
          background_surface?: string
          background_shadow?: string
          background_reflection?: number
          background_color?: string | null
          jewelry_metal?: string
          jewelry_finish?: string
          jewelry_sparkle?: number
          jewelry_color_pop?: number
          jewelry_detail?: number
          composition_framing?: string
          composition_aspect_ratio?: string
          composition_padding?: number
          ai_model?: string
          created_by?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_presets_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_presets_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_primary_organization: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_organization_owner: {
        Args: {
          org_id: string
        }
        Returns: boolean
      }
      get_queue_page: {
        Args: {
          p_organization_id: string
          p_page_size?: number
          p_page?: number
          p_status?: string | null
          p_project_id?: string | null
          p_folder_path?: string | null
          p_search?: string | null
        }
        Returns: {
          id: string
          organization_id: string
          project_id: string | null
          project_name: string | null
          file_id: string
          file_name: string | null
          file_url: string | null
          status: string
          progress: number
          task_id: string | null
          generated_prompt: string | null
          error_message: string | null
          retry_count: number
          tokens_reserved: number
          folder_path: string | null
          folder_id: string | null
          batch_id: string | null
          ai_model: string | null
          started_at: string
          last_updated: string
          total_count: number
        }[]
      }
      get_queue_stats: {
        Args: {
          p_organization_id: string
        }
        Returns: {
          total_count: number
          queued_count: number
          processing_count: number
          failed_count: number
        }[]
      }
      get_queue_folder_stats: {
        Args: {
          p_organization_id: string
        }
        Returns: {
          folder_path: string
          folder_id: string | null
          total_count: number
          queued_count: number
          processing_count: number
          failed_count: number
          completed_pct: number
        }[]
      }
      bulk_insert_queue_items: {
        Args: {
          p_items: Json
        }
        Returns: {
          inserted_count: number
          batch_id: string
        }[]
      }
      get_history_page: {
        Args: {
          p_organization_id: string
          p_project_id?: string | null
          p_page_size?: number
          p_page?: number
          p_status?: string | null
          p_ai_model?: string | null
          p_date_from?: string | null
          p_date_to?: string | null
          p_search?: string | null
        }
        Returns: {
          id: string
          organization_id: string
          project_id: string | null
          file_id: string
          file_name: string | null
          original_url: string | null
          optimized_url: string | null
          optimized_storage_path: string | null
          status: string
          resolution: string | null
          tokens_used: number | null
          processing_time_sec: number | null
          ai_model: string | null
          generated_prompt: string | null
          error_message: string | null
          started_at: string | null
          completed_at: string
          created_by: string | null
          total_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export type UserOrganization = Database['public']['Tables']['user_organizations']['Row']
export type UserOrganizationInsert = Database['public']['Tables']['user_organizations']['Insert']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type PromptTemplate = Database['public']['Tables']['prompt_templates']['Row']
export type PromptTemplateInsert = Database['public']['Tables']['prompt_templates']['Insert']
export type PromptTemplateUpdate = Database['public']['Tables']['prompt_templates']['Update']

export type StorageConnection = Database['public']['Tables']['storage_connections']['Row']
export type StorageConnectionInsert = Database['public']['Tables']['storage_connections']['Insert']
export type StorageConnectionUpdate = Database['public']['Tables']['storage_connections']['Update']

export type ProcessingQueueItem = Database['public']['Tables']['processing_queue']['Row']
export type ProcessingQueueInsert = Database['public']['Tables']['processing_queue']['Insert']
export type ProcessingQueueUpdate = Database['public']['Tables']['processing_queue']['Update']

export type ProcessingHistoryItem = Database['public']['Tables']['processing_history']['Row']
export type ProcessingHistoryInsert = Database['public']['Tables']['processing_history']['Insert']

export type TokenAccount = Database['public']['Tables']['token_accounts']['Row']
export type TokenTransaction = Database['public']['Tables']['token_transactions']['Row']
export type TokenPricing = Database['public']['Tables']['token_pricing']['Row']

// Google Drive connection type
export interface GoogleDriveConnection {
  id: string
  organization_id: string
  connected_by: string
  google_email: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

// Google Drive file type
export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  webViewLink?: string
  size?: string
  modifiedTime?: string
  parents?: string[]
}

// Organization settings type
export interface OrganizationSettings {
  default_resolution?: '2K' | '4K'
  default_template_id?: string
}

// Project status type
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived'

// Processing status types
export type QueueStatus = 'queued' | 'processing' | 'optimizing' | 'failed'
export type HistoryStatus = 'success' | 'failed'

// Storage provider types
export type StorageProvider = 'google_drive' | 'dropbox' | 'supabase_storage'

// User role types
export type UserRole = 'owner' | 'admin' | 'member'

// Token transaction types
export type TokenTransactionType = 'purchase' | 'usage' | 'refund' | 'bonus' | 'coupon' | 'adjustment'

// Template categories
export type TemplateCategory = 'Jewelry' | 'Product' | 'Fashion' | 'Food' | 'Other'
export type TemplateStyle = 'Premium' | 'Elegant' | 'Standard' | 'Lifestyle' | 'Minimal' | 'Classic'
export type TemplateBackground = 'White' | 'Gradient' | 'Transparent' | 'Natural' | 'Custom'

// Studio preset types
export type StudioPreset = Database['public']['Tables']['studio_presets']['Row']
export type StudioPresetInsert = Database['public']['Tables']['studio_presets']['Insert']
export type StudioPresetUpdate = Database['public']['Tables']['studio_presets']['Update']
