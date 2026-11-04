import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "your-supabase-service-role-key") return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * POST /api/auth/gmail
 * Ensures a real Supabase auth.users record exists (with email_confirm: true)
 * so the client can sign in via supabase.auth.signInWithPassword({ email, password })
 * and receive a real Supabase session tied to user.id (UUID) and user.email (Gmail).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailRaw = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "").trim();
    const fullName = String(body.fullName || "").trim();

    if (!emailRaw || !emailRaw.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid Gmail address." },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase Service Role Key is not configured." },
        { status: 500 }
      );
    }

    const displayName =
      fullName ||
      emailRaw
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

    // Check if user already exists in auth.users
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === emailRaw
    );

    if (!existingUser) {
      // Create a confirmed Supabase auth.users record so they can sign in immediately
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: emailRaw,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: displayName,
          },
        });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        created: true,
        userId: created.user?.id,
        email: emailRaw,
        fullName: displayName,
      });
    }

    // If user exists but wasn't email-confirmed yet, confirm them
    if (!existingUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
      });
    }

    return NextResponse.json({
      success: true,
      created: false,
      userId: existingUser.id,
      email: existingUser.email,
      fullName:
        existingUser.user_metadata?.full_name || displayName,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to provision Gmail user",
      },
      { status: 500 }
    );
  }
}

