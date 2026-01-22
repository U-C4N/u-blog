export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          published: boolean
          created_at: string
          updated_at: string
          tags: string[] | null
          views: number | null
          meta_title: string | null
          meta_description: string | null
          canonical_url: string | null
          og_image_url: string | null
          noindex: boolean | null
          language_code: string | null
          translations: Json | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          published?: boolean
          created_at?: string
          updated_at?: string
          tags?: string[] | null
          views?: number | null
          meta_title?: string | null
          meta_description?: string | null
          canonical_url?: string | null
          og_image_url?: string | null
          noindex?: boolean | null
          language_code?: string | null
          translations?: Json | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          published?: boolean
          created_at?: string
          updated_at?: string
          tags?: string[] | null
          views?: number | null
          meta_title?: string | null
          meta_description?: string | null
          canonical_url?: string | null
          og_image_url?: string | null
          noindex?: boolean | null
          language_code?: string | null
          translations?: Json | null
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          title: string
          subtitle: string
          present_text: string[]
          social_links: Json | null
          github_token: string | null
          github_username: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          og_image_url: string | null
          twitter_card_type: string | null
          website_url: string | null
          location: string | null
          company: string | null
          job_title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          title: string
          subtitle: string
          present_text: string[]
          social_links?: Json | null
          github_token?: string | null
          github_username?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_image_url?: string | null
          twitter_card_type?: string | null
          website_url?: string | null
          location?: string | null
          company?: string | null
          job_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          title?: string
          subtitle?: string
          present_text?: string[]
          social_links?: Json | null
          github_token?: string | null
          github_username?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_image_url?: string | null
          twitter_card_type?: string | null
          website_url?: string | null
          location?: string | null
          company?: string | null
          job_title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          label: string
          url: string
          description: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          url: string
          description: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          url?: string
          description?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      buildings: {
        Row: {
          id: string
          title: string
          description: string
          external: boolean
          url: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          external?: boolean
          url?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          external?: boolean
          url?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      github_repos: {
        Row: {
          id: string
          repo_name: string
          repo_url: string
          description: string | null
          selected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_name: string
          repo_url: string
          description?: string | null
          selected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_name?: string
          repo_url?: string
          description?: string | null
          selected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      prompts: {
        Row: {
          id: string
          title: string
          content: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}
