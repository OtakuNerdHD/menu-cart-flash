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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          name: string
          value: string | null
        }
        Insert: {
          name: string
          value?: string | null
        }
        Update: {
          name?: string
          value?: string | null
        }
        Relationships: []
      }
      app_super_admins: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          available: boolean | null
          content_id: string
          data_generation: string | null
          description: string | null
          id: number
          name: string
          size: number | null
        }
        Insert: {
          available?: boolean | null
          content_id: string
          data_generation?: string | null
          description?: string | null
          id?: number
          name: string
          size?: number | null
        }
        Update: {
          available?: boolean | null
          content_id?: string
          data_generation?: string | null
          description?: string | null
          id?: number
          name?: string
          size?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: number
          is_default: boolean
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_default?: boolean
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: number
          is_default?: boolean
          name?: string
          team_id?: string
        }
        Relationships: []
      }
      combo_categories: {
        Row: {
          category_id: number
          combo_id: number
          created_at: string
          team_id: string
        }
        Insert: {
          category_id: number
          combo_id: number
          created_at?: string
          team_id: string
        }
        Update: {
          category_id?: number
          combo_id?: number
          created_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_categories_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_items_custom: {
        Row: {
          combo_id: number
          description: string
          id: number
          position: number
          team_id: string
        }
        Insert: {
          combo_id: number
          description: string
          id?: number
          position?: number
          team_id: string
        }
        Update: {
          combo_id?: number
          description?: string
          id?: number
          position?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_custom_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_products: {
        Row: {
          combo_id: number
          position: number
          product_id: number
          team_id: string
        }
        Insert: {
          combo_id: number
          position?: number
          product_id: number
          team_id: string
        }
        Update: {
          combo_id?: number
          position?: number
          product_id?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_products_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          category: string | null
          combo_type: string
          created_at: string
          description: string | null
          highlight_combos: boolean
          highlight_full: boolean
          highlight_homepage: boolean
          id: number
          images: string[] | null
          is_published: boolean
          perks: string[] | null
          price_label: string | null
          savings: string | null
          serves: string | null
          status: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          combo_type?: string
          created_at?: string
          description?: string | null
          highlight_combos?: boolean
          highlight_full?: boolean
          highlight_homepage?: boolean
          id?: number
          images?: string[] | null
          is_published?: boolean
          perks?: string[] | null
          price_label?: string | null
          savings?: string | null
          serves?: string | null
          status?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          combo_type?: string
          created_at?: string
          description?: string | null
          highlight_combos?: boolean
          highlight_full?: boolean
          highlight_homepage?: boolean
          id?: number
          images?: string[] | null
          is_published?: boolean
          perks?: string[] | null
          price_label?: string | null
          savings?: string | null
          serves?: string | null
          status?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: number
          order_id: number | null
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          order_id?: number | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          order_id?: number | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: number
          notes: string | null
          options: Json | null
          order_id: number
          price: number
          product_id: number
          quantity: number
          team_id: string | null
        }
        Insert: {
          id?: number
          notes?: string | null
          options?: Json | null
          order_id: number
          price: number
          product_id: number
          quantity: number
          team_id?: string | null
        }
        Update: {
          id?: number
          notes?: string | null
          options?: Json | null
          order_id?: number
          price?: number
          product_id?: number
          quantity?: number
          team_id?: string | null
        }
        Relationships: []
      }
      order_tracking: {
        Row: {
          created_at: string | null
          current_location: Json | null
          destination_location: Json
          driver_name: string | null
          driver_photo: string | null
          estimation_minutes: number | null
          expires_at: string | null
          id: string
          order_id: number | null
          snapshot: Json | null
          snapshot_created: boolean | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_location?: Json | null
          destination_location: Json
          driver_name?: string | null
          driver_photo?: string | null
          estimation_minutes?: number | null
          expires_at?: string | null
          id?: string
          order_id?: number | null
          snapshot?: Json | null
          snapshot_created?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_location?: Json | null
          destination_location?: Json
          driver_name?: string | null
          driver_photo?: string | null
          estimation_minutes?: number | null
          expires_at?: string | null
          id?: string
          order_id?: number | null
          snapshot?: Json | null
          snapshot_created?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: Json | null
          assigned_to: string | null
          client_token: string | null
          created_at: string | null
          created_by: string | null
          delivery_person_id: number | null
          delivery_type: string
          id: number
          items_json: Json | null
          kitchen_status: string | null
          order_number: number | null
          order_type: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          restaurant_id: number | null
          status: string
          table_id: number | null
          table_name: string | null
          team_id: string | null
          total: number
          total_amount: number | null
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          address?: Json | null
          assigned_to?: string | null
          client_token?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_person_id?: number | null
          delivery_type: string
          id?: number
          items_json?: Json | null
          kitchen_status?: string | null
          order_number?: number | null
          order_type?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id?: number | null
          status?: string
          table_id?: number | null
          table_name?: string | null
          team_id?: string | null
          total: number
          total_amount?: number | null
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          address?: Json | null
          assigned_to?: string | null
          client_token?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_person_id?: number | null
          delivery_type?: string
          id?: number
          items_json?: Json | null
          kitchen_status?: string | null
          order_number?: number | null
          order_type?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id?: number | null
          status?: string
          table_id?: number | null
          table_name?: string | null
          team_id?: string | null
          total?: number
          total_amount?: number | null
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          payload: Json
          team_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload: Json
          team_id: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_last_four: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          is_default: boolean | null
          method_type: string
          nickname: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_default?: boolean | null
          method_type: string
          nickname: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_default?: boolean | null
          method_type?: string
          nickname?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_preferences: {
        Row: {
          created_at: string
          external_reference: string | null
          init_point: string | null
          preference_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          external_reference?: string | null
          init_point?: string | null
          preference_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          external_reference?: string | null
          init_point?: string | null
          preference_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_preferences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: number
          created_at: string
          product_id: number
          team_id: string
        }
        Insert: {
          category_id: number
          created_at?: string
          product_id: number
          team_id: string
        }
        Update: {
          category_id?: number
          created_at?: string
          product_id?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          product_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          product_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          id: number
          name: string
          price: number
          product_id: number
          team_id: string | null
        }
        Insert: {
          id?: number
          name: string
          price: number
          product_id: number
          team_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          price?: number
          product_id?: number
          team_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          available: boolean
          category: string | null
          description: string | null
          featured: boolean
          gallery: string[] | null
          id: number
          image_url: string | null
          images: string[] | null
          ingredients: string | null
          is_published: boolean
          name: string | null
          note_hint: string | null
          nutritional_info: Json | null
          price: number
          restaurant_id: number | null
          team_id: string | null
          thumbnail: string | null
          updated_at: string | null
        }
        Insert: {
          available?: boolean
          category?: string | null
          description?: string | null
          featured?: boolean
          gallery?: string[] | null
          id?: number
          image_url?: string | null
          images?: string[] | null
          ingredients?: string | null
          is_published?: boolean
          name?: string | null
          note_hint?: string | null
          nutritional_info?: Json | null
          price?: number
          restaurant_id?: number | null
          team_id?: string | null
          thumbnail?: string | null
          updated_at?: string | null
        }
        Update: {
          available?: boolean
          category?: string | null
          description?: string | null
          featured?: boolean
          gallery?: string[] | null
          id?: number
          image_url?: string | null
          images?: string[] | null
          ingredients?: string | null
          is_published?: boolean
          name?: string | null
          note_hint?: string | null
          nutritional_info?: Json | null
          price?: number
          restaurant_id?: number | null
          team_id?: string | null
          thumbnail?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string
          created_at: string | null
          descricao: string | null
          destaque: boolean | null
          id: string
          imagem: string | null
          nome: string
          preco: number
        }
        Insert: {
          categoria: string
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          imagem?: string | null
          nome: string
          preco: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          id?: string
          imagem?: string | null
          nome?: string
          preco?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_name: string | null
          phone1: string | null
          phone2: string | null
          role: string | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          phone1?: string | null
          phone2?: string | null
          role?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          phone1?: string | null
          phone2?: string | null
          role?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string | null
          categories: string[] | null
          created_at: string | null
          description: string | null
          id: number
          location: unknown
          logo_url: string | null
          name: string
          opening_hours: Json | null
          owner_id: string | null
          team_id: string | null
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: number
          location?: unknown
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          owner_id?: string | null
          team_id?: string | null
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: number
          location?: unknown
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address: string | null
          allow_delivery: boolean | null
          allow_instore_payment: boolean | null
          city: string | null
          created_at: string | null
          delivery_fee_per_km: number | null
          delivery_min_fee: number | null
          delivery_radius: number | null
          fixed_delivery_fee: number | null
          freight_enabled: boolean
          freight_type: string | null
          id: number
          latitude: number | null
          longitude: number | null
          order_min_amount: number | null
          payment_provider: string | null
          state: string | null
          store_name: string | null
          team_id: string | null
          updated_at: string | null
          zipcode: string | null
        }
        Insert: {
          address?: string | null
          allow_delivery?: boolean | null
          allow_instore_payment?: boolean | null
          city?: string | null
          created_at?: string | null
          delivery_fee_per_km?: number | null
          delivery_min_fee?: number | null
          delivery_radius?: number | null
          fixed_delivery_fee?: number | null
          freight_enabled?: boolean
          freight_type?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          order_min_amount?: number | null
          payment_provider?: string | null
          state?: string | null
          store_name?: string | null
          team_id?: string | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Update: {
          address?: string | null
          allow_delivery?: boolean | null
          allow_instore_payment?: boolean | null
          city?: string | null
          created_at?: string | null
          delivery_fee_per_km?: number | null
          delivery_min_fee?: number | null
          delivery_radius?: number | null
          fixed_delivery_fee?: number | null
          freight_enabled?: boolean
          freight_type?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          order_min_amount?: number | null
          payment_provider?: string | null
          state?: string | null
          store_name?: string | null
          team_id?: string | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      tables: {
        Row: {
          assigned_user_id: string | null
          capacity: number | null
          created_at: string | null
          id: number
          name: string
          qr_code: string | null
          server_id: number | null
          status: string
          team_id: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: number
          name: string
          qr_code?: string | null
          server_id?: number | null
          status?: string
          team_id?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: number
          name?: string
          qr_code?: string | null
          server_id?: number | null
          status?: string
          team_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_payment_credentials: {
        Row: {
          access_token_cipher: string | null
          access_token_iv: string | null
          created_at: string
          id: string
          last_validated_at: string | null
          provider: string
          public_key: string | null
          status: string
          team_id: string
          test_mode: boolean
          updated_at: string
        }
        Insert: {
          access_token_cipher?: string | null
          access_token_iv?: string | null
          created_at?: string
          id?: string
          last_validated_at?: string | null
          provider: string
          public_key?: string | null
          status?: string
          team_id: string
          test_mode?: boolean
          updated_at?: string
        }
        Update: {
          access_token_cipher?: string | null
          access_token_iv?: string | null
          created_at?: string
          id?: string
          last_validated_at?: string | null
          provider?: string
          public_key?: string | null
          status?: string
          team_id?: string
          test_mode?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_payment_credentials_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string | null
          id: string
          neighborhood: string
          number: string
          state: string
          street: string
          user_id: string | null
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string | null
          id?: string
          neighborhood: string
          number: string
          state: string
          street: string
          user_id?: string | null
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string | null
          id?: string
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_switcher_sessions: {
        Row: {
          session_id: string
          updated_at: string | null
          user_data: Json
        }
        Insert: {
          session_id: string
          updated_at?: string | null
          user_data: Json
        }
        Update: {
          session_id?: string
          updated_at?: string | null
          user_data?: Json
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          email: string
          first_name: string
          id: number
          last_name: string
          password: string
          phone: string | null
          photo_url: string | null
          role: string
          state: string | null
          updated_at: string | null
          username: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: number
          last_name: string
          password: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          state?: string | null
          updated_at?: string | null
          username: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: number
          last_name?: string
          password?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          state?: string | null
          updated_at?: string | null
          username?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          phone: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          phone: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      assert_super_admin: { Args: never; Returns: undefined }
      assign_table_to_user: {
        Args: { p_table_id: number; p_user_id: string }
        Returns: {
          assigned_user_id: string | null
          capacity: number | null
          created_at: string | null
          id: number
          name: string
          qr_code: string | null
          server_id: number | null
          status: string
          team_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tables"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_team_admin: {
        Args: {
          p_first_name?: string
          p_last_name?: string
          p_phone1?: string
          p_phone2?: string
          p_tax_id?: string
          set_role?: string
          team_slug: string
          user_email: string
        }
        Returns: Json
      }
      create_table: {
        Args: { table_name: string }
        Returns: {
          assigned_user_id: string | null
          capacity: number | null
          created_at: string | null
          id: number
          name: string
          qr_code: string | null
          server_id: number | null
          status: string
          team_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tables"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_team_as_admin: {
        Args: {
          team_description?: string
          team_name: string
          team_slug: string
        }
        Returns: {
          created_at: string | null
          description: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "teams"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_user_safely: { Args: { user_uuid: string }; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      end_other_sessions_current_scope: {
        Args: { p_keep_session: string }
        Returns: number
      }
      end_session: { Args: { p_session_id: string }; Returns: undefined }
      ensure_default_categories: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      ensure_membership: { Args: { team_slug: string }; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_jwt_claims: { Args: never; Returns: Json }
      get_membership_role_by_slug: {
        Args: { p_team_slug: string }
        Returns: string
      }
      get_membership_role_by_team: {
        Args: { p_team_id: string }
        Returns: string
      }
      get_team_admin_profile: {
        Args: { team_slug: string }
        Returns: {
          email: string
          first_name: string
          last_name: string
          phone1: string
          phone2: string
          role: string
          tax_id: string
          user_id: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      grant_membership: {
        Args: { p_role?: string; p_user_id: string; team_slug: string }
        Returns: undefined
      }
      grant_membership_by_email: {
        Args: { owner_email: string; p_role?: string; team_slug: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_ctx: { Args: never; Returns: boolean }
      is_member_of_current_team: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_member_of_team:
        | {
            Args: { p_team_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_member_of_team(p_team_id => text), public.is_member_of_team(p_team_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_team_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.is_member_of_team(p_team_id => text), public.is_member_of_team(p_team_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      is_same_team: { Args: { p_team_id: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      public_get_combo_by_slug_and_id: {
        Args: { p_id: number; p_slug: string }
        Returns: {
          category: string | null
          combo_type: string
          created_at: string
          description: string | null
          highlight_combos: boolean
          highlight_full: boolean
          highlight_homepage: boolean
          id: number
          images: string[] | null
          is_published: boolean
          perks: string[] | null
          price_label: string | null
          savings: string | null
          serves: string | null
          status: string | null
          team_id: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "combos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_get_product_by_slug_and_id: {
        Args: { p_id: number; p_slug: string }
        Returns: {
          available: boolean
          category: string | null
          description: string | null
          featured: boolean
          gallery: string[] | null
          id: number
          image_url: string | null
          images: string[] | null
          ingredients: string | null
          is_published: boolean
          name: string | null
          note_hint: string | null
          nutritional_info: Json | null
          price: number
          restaurant_id: number | null
          team_id: string | null
          thumbnail: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_list_categories_by_slug: {
        Args: { p_slug: string }
        Returns: {
          created_at: string
          id: number
          is_default: boolean
          name: string
          team_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "categories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_list_combo_items_custom_by_slug: {
        Args: { p_combo_id: number; p_slug: string }
        Returns: {
          description: string
          pos: number
        }[]
      }
      public_list_combo_products_by_slug: {
        Args: { p_combo_id: number; p_slug: string }
        Returns: {
          pos: number
          product_id: number
        }[]
      }
      public_list_combos_by_slug: {
        Args: { p_only_combos?: boolean; p_only_home?: boolean; p_slug: string }
        Returns: {
          category: string | null
          combo_type: string
          created_at: string
          description: string | null
          highlight_combos: boolean
          highlight_full: boolean
          highlight_homepage: boolean
          id: number
          images: string[] | null
          is_published: boolean
          perks: string[] | null
          price_label: string | null
          savings: string | null
          serves: string | null
          status: string | null
          team_id: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "combos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_list_nonempty_categories_by_slug: {
        Args: { p_kind: string; p_slug: string }
        Returns: {
          name: string
        }[]
      }
      public_list_products_by_slug: {
        Args: { p_category?: string; p_restaurant_id?: number; p_slug: string }
        Returns: {
          available: boolean
          category: string | null
          description: string | null
          featured: boolean
          gallery: string[] | null
          id: number
          image_url: string | null
          images: string[] | null
          ingredients: string | null
          is_published: boolean
          name: string | null
          note_hint: string | null
          nutritional_info: Json | null
          price: number
          restaurant_id: number | null
          team_id: string | null
          thumbnail: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_list_products_min_by_ids_slug: {
        Args: { p_ids: number[]; p_slug: string }
        Returns: {
          id: number
          name: string
        }[]
      }
      saas_register_owner: {
        Args: { owner_email: string; team_slug: string }
        Returns: string
      }
      set_app_config: {
        Args: { config_name: string; config_value: string }
        Returns: undefined
      }
      set_config: {
        Args: { parameter: string; value: string }
        Returns: undefined
      }
      set_current_team_id: { Args: { team_id: string }; Returns: undefined }
      share_team_with: { Args: { p_target_user_id: string }; Returns: boolean }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      start_session: {
        Args: {
          p_fingerprint?: string
          p_ip?: unknown
          p_role_at_login: string
          p_user_agent?: string
        }
        Returns: string
      }
      touch_session: { Args: { p_session_id: string }; Returns: undefined }
      unassign_table: {
        Args: { p_table_id: number }
        Returns: {
          assigned_user_id: string | null
          capacity: number | null
          created_at: string | null
          id: number
          name: string
          qr_code: string | null
          server_id: number | null
          status: string
          team_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tables"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_team_admin_profile: {
        Args: {
          p_first_name: string
          p_last_name: string
          p_phone1: string
          p_phone2: string
          p_tax_id: string
          p_user_id: string
          set_role?: string
          team_slug: string
        }
        Returns: Json
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_user: {
        Args: {
          user_avatar_url?: string
          user_email: string
          user_id: string
          user_role?: string
          user_username: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "restaurant_owner"
        | "manager"
        | "waiter"
        | "chef"
        | "delivery_person"
        | "customer"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
    Enums: {
      app_role: [
        "admin",
        "restaurant_owner",
        "manager",
        "waiter",
        "chef",
        "delivery_person",
        "customer",
      ],
    },
  },
} as const
