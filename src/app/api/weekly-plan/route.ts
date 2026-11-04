import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_WEEKLY_PLAN,
  type DayPlanRecord,
} from "@/data/weekly-plan-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEEKLY_PLAN_SYNC_DATE = "2099-12-31";
const WEEK_DATES = [
  "2026-11-02", // Mon
  "2026-11-03", // Tue (Today)
  "2026-11-04", // Wed
  "2026-11-05", // Thu
  "2026-11-06", // Fri
  "2026-11-07", // Sat
  "2026-11-08", // Sun
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-supabase-service-role-key"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function persistWeeklyPlanToSupabase(plan: DayPlanRecord[]) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Save full 7-day plan JSON to daily_quotes sync row
  await supabase.from("daily_quotes").upsert(
    {
      quote_date: WEEKLY_PLAN_SYNC_DATE,
      quote_text: "NourishThali Shared Family Weekly Plan State",
      ayurvedic_or_metabolic_tip: JSON.stringify(plan),
    },
    { onConflict: "quote_date" }
  );

  // 2. Also sync all 7 days into public.homes, public.plates, and public.meal_plans tables
  try {
    const { data: homeRow } = await supabase
      .from("homes")
      .upsert(
        {
          name: "Mukhi Family Home (Bikaner)",
          invite_code: "MUKHI-2026",
        },
        { onConflict: "invite_code" }
      )
      .select("id")
      .maybeSingle();

    const homeId = homeRow?.id;
    if (!homeId) return;

    for (let i = 0; i < plan.length; i++) {
      const day = plan[i];
      const planDate = WEEK_DATES[day.dayIndex] || WEEK_DATES[i] || "2026-11-03";

      await supabase.from("meal_plans").upsert(
        {
          home_id: homeId,
          plan_date: planDate,
          tea_choice: "Blue Pea Flower Elixir",
          notes: JSON.stringify({
            dayName: day.dayName,
            dateLabel: day.dateLabel,
            brunch: day.brunch,
            dinner: day.dinner,
          }),
        },
        { onConflict: "home_id,plan_date" }
      );
    }
  } catch {
    // Non-fatal if relational sync encounters RLS constraint
  }
}

/**
 * GET /api/weekly-plan
 * Returns the shared Family Home 7-day meal plan from Supabase so all family members
 * see the same Daily Plan and Weekly Plan. Seeds Supabase if not yet present.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      weeklyPlan: DEFAULT_WEEKLY_PLAN,
      source: "default",
    });
  }

  try {
    const { data, error } = await supabase
      .from("daily_quotes")
      .select("ayurvedic_or_metabolic_tip")
      .eq("quote_date", WEEKLY_PLAN_SYNC_DATE)
      .maybeSingle();

    if (!error && data?.ayurvedic_or_metabolic_tip) {
      const parsed = JSON.parse(
        data.ayurvedic_or_metabolic_tip
      ) as DayPlanRecord[];
      if (Array.isArray(parsed) && parsed.length === 7) {
        return NextResponse.json({
          weeklyPlan: parsed,
          source: "supabase",
        });
      }
    }

    // Seed the default 7-day weekly plan into Supabase on first load
    await persistWeeklyPlanToSupabase(DEFAULT_WEEKLY_PLAN);
    return NextResponse.json({
      weeklyPlan: DEFAULT_WEEKLY_PLAN,
      source: "supabase",
    });
  } catch {
    // Fallback to default plan
  }

  return NextResponse.json({
    weeklyPlan: DEFAULT_WEEKLY_PLAN,
    source: "default",
  });
}

/**
 * PUT /api/weekly-plan
 * Saves the updated 7-day meal plan to Supabase (both public.meal_plans and public.daily_quotes)
 * so all invited family members immediately see the updated Daily Plan and Weekly Plan.
 */
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { weeklyPlan?: DayPlanRecord[] };
    const plan = body.weeklyPlan;
    if (!Array.isArray(plan) || plan.length !== 7) {
      return NextResponse.json(
        { error: "Invalid weeklyPlan payload" },
        { status: 400 }
      );
    }

    await persistWeeklyPlanToSupabase(plan);

    return NextResponse.json({
      success: true,
      source: "supabase",
      weeklyPlan: plan,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save weekly plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
