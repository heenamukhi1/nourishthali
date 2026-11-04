import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKER_SYNC_DATE = "2099-12-28";
const TRACKER_SYNC_MARKER = "__NOURISHTHALI_DAILY_TRACKER_V2__";

const DAY_NAME_TO_DATE: Record<string, string> = {
  monday: "2026-11-02",
  tuesday: "2026-11-03",
  wednesday: "2026-11-04",
  thursday: "2026-11-05",
  friday: "2026-11-06",
  saturday: "2026-11-07",
  sunday: "2026-11-08",
};

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

/**
 * GET /api/daily-tracker?day=tuesday
 * Loads the saved Daily Tracker state (Water intake, Supplements, Fiber boosts) from Supabase.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dayKey = (searchParams.get("day") || "tuesday").toLowerCase();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ tracker: null, source: "local" });
  }

  try {
    // 1. Check public.daily_quotes multi-day tracker map
    const { data } = await supabase
      .from("daily_quotes")
      .select("quote_text, ayurvedic_or_metabolic_tip")
      .eq("quote_date", TRACKER_SYNC_DATE)
      .maybeSingle();

    if (
      data?.quote_text === TRACKER_SYNC_MARKER &&
      data?.ayurvedic_or_metabolic_tip
    ) {
      const allDays = JSON.parse(data.ayurvedic_or_metabolic_tip) as Record<
        string,
        unknown
      >;
      if (allDays && allDays[dayKey]) {
        return NextResponse.json({
          tracker: allDays[dayKey],
          source: "supabase",
        });
      }
    }
  } catch {
    // Fallback
  }

  return NextResponse.json({ tracker: null, source: "default" });
}

/**
 * PUT /api/daily-tracker
 * Saves the Daily Tracker state (Water intake, Supplements, Fiber boosts) to Supabase:
 * 1) Updates `public.meal_plans.rituals_completed` (JSONB) for that day's date (`2026-11-02`..`2026-11-08`)
 * 2) Updates `public.daily_quotes` (`quote_date = '2099-12-28'`) for instant multi-day lookup
 */
export async function PUT(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await request.json();
    const dayKey = String(body.day || "tuesday").toLowerCase();
    const tracker = body.tracker;

    if (!tracker) {
      return NextResponse.json(
        { error: "Missing tracker payload" },
        { status: 400 }
      );
    }

    if (supabase) {
      // 1. Read existing map and update dayKey in public.daily_quotes
      let existingMap: Record<string, unknown> = {};
      const { data: existingRow } = await supabase
        .from("daily_quotes")
        .select("ayurvedic_or_metabolic_tip")
        .eq("quote_date", TRACKER_SYNC_DATE)
        .maybeSingle();

      if (existingRow?.ayurvedic_or_metabolic_tip) {
        try {
          existingMap = JSON.parse(existingRow.ayurvedic_or_metabolic_tip);
        } catch {
          existingMap = {};
        }
      }

      existingMap[dayKey] = tracker;

      await supabase.from("daily_quotes").upsert(
        {
          quote_date: TRACKER_SYNC_DATE,
          quote_text: TRACKER_SYNC_MARKER,
          ayurvedic_or_metabolic_tip: JSON.stringify(existingMap),
        },
        { onConflict: "quote_date" }
      );

      // 2. Also save into public.meal_plans.rituals_completed (JSONB) for that date
      const planDate = DAY_NAME_TO_DATE[dayKey] || "2026-11-03";
      const { data: homeRow } = await supabase
        .from("homes")
        .select("id")
        .eq("invite_code", "MUKHI-2026")
        .maybeSingle();

      if (homeRow?.id) {
        await supabase.from("meal_plans").upsert(
          {
            home_id: homeRow.id,
            plan_date: planDate,
            rituals_completed: tracker,
          },
          { onConflict: "home_id,plan_date" }
        );
      }
    }

    return NextResponse.json({ success: true, source: "supabase" });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to save daily tracker",
      },
      { status: 500 }
    );
  }
}

