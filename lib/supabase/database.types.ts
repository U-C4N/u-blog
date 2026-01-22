export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      buildings: {
        Row: {
          created_at: string | null
          description: string
          external: boolean | null
          id: string
          order_index: number | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          external?: boolean | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          external?: boolean | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      github_repos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          repo_name: string
          repo_url: string
          selected: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          repo_name: string
          repo_url: string
          selected?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          repo_name?: string
          repo_url?: string
          selected?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          canonical_url: string | null
          content: string | null
          created_at: string
          id: string
          language_code: string
          meta_description: string | null
          meta_title: string | null
          noindex: boolean | null
          og_image_url: string | null
          published: boolean | null
          slug: string
          tags: string[] | null
          title: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          language_code?: string
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean | null
          og_image_url?: string | null
          published?: boolean | null
          slug: string
          tags?: string[] | null
          title: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          language_code?: string
          meta_description?: string | null
          meta_title?: string | null
          noindex?: boolean | null
          og_image_url?: string | null
          published?: boolean | null
          slug?: string
          tags?: string[] | null
          title?: string
          translations?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          github_token: string | null
          github_username: string | null
          id: string
          job_title: string | null
          location: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          name: string
          og_image_url: string | null
          present_text: string[]
          social_links: Json | null
          subtitle: string
          title: string
          twitter_card_type: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          github_token?: string | null
          github_username?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          name: string
          og_image_url?: string | null
          present_text?: string[]
          social_links?: Json | null
          subtitle: string
          title: string
          twitter_card_type?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          github_token?: string | null
          github_username?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          name?: string
          og_image_url?: string | null
          present_text?: string[]
          social_links?: Json | null
          subtitle?: string
          title?: string
          twitter_card_type?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      prompts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          id: string
          pathname: string | null
          visited_at: string | null
        }
        Insert: {
          id?: string
          pathname?: string | null
          visited_at?: string | null
        }
        Update: {
          id?: string
          pathname?: string | null
          visited_at?: string | null
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
}

export const Constants = {
  public: {
    Enums: {},
  },
} as const
