# NourishThali Workspace Instructions & Progress

- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Recommend Required Extensions (No extensions needed)
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project
- [x] Ensure Documentation is Complete

## Project Guidelines
- Maintain Senior Low-Vision & High-Legibility Accessibility (WCAG AAA):
  - Base body text: `20px` (`text-xl`) with `1.6` line-height (`leading-[1.6]`).
  - Card titles: `26px–28px` (`text-[27px]`).
  - Page headers: `34px–40px` (`text-[36px]`–`text-[40px]`).
  - Secondary labels minimum `18px` (`text-lg font-medium`); strictly forbid `text-xs` or `text-sm`.
- Persistent Top-Bar Text Scaler (`A: 100% / 20px`, `A+: 115% / 23px`, `A++: 130% / 26px`) adjusting root HTML rem sizing and persisted in `localStorage`.
- Color & Border Hierarchy: Deep Charcoal/Forest text (`#14241B`) on Warm Cream (`#FAF7F2`) surfaces with prominent `2px` solid borders (`#2D4A3E`).
- Oversized Touch Targets: Minimum height `56px` (`min-h-[56px] px-6`) with `28px` Lucide icons (`h-7 w-7`) and explicit English text labels.
- Supabase SSR (`@supabase/ssr`), `/auth/callback` Google OAuth SSO route, 9-table DDL schema, and storage buckets in `supabase/migrations/001_nourishthali_schema.sql`.
