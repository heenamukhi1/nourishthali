# NourishThali

A collaborative Next.js 15 application for families and caregivers to plan balanced, low-glycemic, low-sodium wholesome Thalis with **Senior Low-Vision & High-Legibility WCAG AAA Accessibility** built in for parents.

## Core Accessibility Architecture

1. **Typography Floor**:
   - Base body text: `20px` (`text-xl`) with `1.6` line-height (`leading-[1.6]`).
   - Card titles: `26px–28px` (`text-[27px]`).
   - Page headers: `34px–40px` (`text-[36px]` to `text-[40px]`).
   - Secondary labels minimum `18px` (`text-lg font-medium`); `text-xs` and `text-sm` are strictly forbidden across the codebase.
2. **Persistent Top-Bar Text Scaler**:
   - 1-tap toggle button group in the sticky header (`A: 100% / 20px`, `A+: 115% / 23px`, `A++: 130% / 26px`) that dynamically updates root `<html>` rem sizing and persists the choice in `localStorage` (`nourishthali_text_scale`).
3. **WCAG AAA Contrast & Card Hierarchy**:
   - Deep Charcoal/Forest text (`#14241B`) on Warm Cream (`#FAF7F2` / `#F2ECE1`) surfaces with `2px` solid borders (`#2D4A3E`) and zero faint gray text.
4. **Oversized Touch Targets**:
   - All buttons, filter chips, and interactive grocery/wellness cards enforce a minimum height of `56px` (`min-h-[56px] px-6`) with `28px` Lucide icons (`h-7 w-7`) and explicit text labels.
5. **Supabase SSR, Google OAuth SSO & 9-Table Relational Schema**:
   - Server/client/middleware helpers using `@supabase/ssr` in `src/utils/supabase/`.
   - Google OAuth SSO PKCE callback route in `src/app/auth/callback/route.ts`.
   - Complete 9-table DDL migration (`homes`, `home_members`, `recipes`, `plate_formula_items`, `plates`, `meal_plans`, `favorites`, `shopping_items`, `daily_quotes`) and 2 Supabase Storage buckets (`ai-plate-images`, `user-plate-uploads`) in `supabase/migrations/001_nourishthali_schema.sql`.
   - Automatic local fallback to `nourishthali-seed-data.json` when `.env.local` is not yet connected.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Supabase (Optional for Local Seed Mode)**:
   Copy `.env.example` to `.env.local` and add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then apply `supabase/migrations/001_nourishthali_schema.sql` in the Supabase SQL Editor.

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
