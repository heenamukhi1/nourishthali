-- =============================================================================
-- NourishThali: Comprehensive Database DDL Specification (9 Tables + Buckets)
-- Integrative Oncology Meal Planner & Family Workspace
-- =============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- 1. Family Homes
create table if not exists public.homes (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Mukhi Family Home',
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 2. Home Memberships & RBAC
create table if not exists public.home_members (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references public.homes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  unique(home_id, user_id)
);

-- 3. Recipe Repository
create table if not exists public.recipes (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  category text not null check (category in (
    'breakfast_chilla', 'nourish_bowl', 'curry_sabzi',
    'soup', 'bread_wrap', 'chutney_dip', 'chakna_snack', 'festive'
  )),
  prep_time_mins int default 15,
  cook_time_mins int default 15,
  visual_plating_cue text,
  image_url text,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  source_name text,
  source_url text,
  diet_type text default 'keto' check (diet_type in ('keto', 'low-carb')),
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- 4. Plate Formula Items
create table if not exists public.plate_formula_items (
  id uuid primary key default uuid_generate_v4(),
  row_number int not null,
  column_type text not null check (column_type in (
    'protein', 'fiber_veg_soup', 'roti_rice_wrap', 'condiment_chutney'
  )),
  name text not null,
  portion_note text,
  linked_recipe_id uuid references public.recipes(id) on delete set null,
  default_ingredients jsonb default '[]'::jsonb
);

-- 5. Individual Assembled Plates
create table if not exists public.plates (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references public.homes(id) on delete cascade,
  title text,
  protein_item_id uuid references public.plate_formula_items(id),
  fiber_item_id uuid references public.plate_formula_items(id),
  carb_swap_item_id uuid references public.plate_formula_items(id),
  condiment_item_id uuid references public.plate_formula_items(id),
  ai_image_url text,
  user_uploaded_image_url text,
  is_favorite boolean default false,
  created_at timestamptz default now()
);

-- 6. Longitudinal Meal Plans
create table if not exists public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references public.homes(id) on delete cascade,
  plan_date date not null,
  brunch_plate_id uuid references public.plates(id) on delete set null,
  dinner_plate_id uuid references public.plates(id) on delete set null,
  chakna_recipe_id uuid references public.recipes(id) on delete set null,
  tea_choice text default 'Blue Pea Flower Elixir',
  rituals_completed jsonb default '{"morning_water": false, "nut_ritual": false, "sunlight": false, "protein_shake": false}'::jsonb,
  notes text,
  unique(home_id, plan_date)
);

-- 7. Favorites Registry
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references public.homes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  plate_id uuid references public.plates(id) on delete cascade,
  created_at timestamptz default now()
);

-- 8. Dynamic Shopping & Inventory Registry
create table if not exists public.shopping_items (
  id uuid primary key default uuid_generate_v4(),
  home_id uuid references public.homes(id) on delete cascade,
  week_start_date date,
  item_name text not null,
  quantity_label text,
  category text not null check (category in (
    'produce', 'protein_curd', 'nuts_seeds', 'keto_flours', 'masala_staple'
  )),
  is_kitchen_staple boolean default false,
  is_checked boolean default false
);

-- 9. Daily Curated Clinical Insights
create table if not exists public.daily_quotes (
  quote_date date primary key default current_date,
  quote_text text not null,
  ayurvedic_or_metabolic_tip text not null
);

-- Storage Buckets Configuration
insert into storage.buckets (id, name, public)
values
  ('ai-plate-images', 'ai-plate-images', true),
  ('user-plate-uploads', 'user-plate-uploads', true)
on conflict (id) do nothing;
