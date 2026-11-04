-- =============================================================================
-- Migration 002: Add diet_type ('keto' | 'low-carb') column to public.recipes
-- Run this in the Supabase SQL Editor if you have already executed 001.
-- =============================================================================

-- 1. Add the column with a CHECK constraint allowing 'keto' or 'low-carb'
alter table public.recipes
  add column if not exists diet_type text default 'keto'
  check (diet_type in ('keto', 'low-carb'));

-- 2. Tag every existing recipe as 'keto'
update public.recipes
set diet_type = 'keto';
