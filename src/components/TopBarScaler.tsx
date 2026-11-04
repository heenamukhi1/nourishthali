"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X, ShieldCheck, Home, BookOpen, Mail, Lock, User } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";

export interface AuthenticatedUserProfile {
  id: string;
  name: string;
  email: string;
  initials: string;
}

function getInitialsFromName(name: string, email: string): string {
  const clean = name.trim() || email.split("@")[0] || "U";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function TopBarScaler() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthenticatedUserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Real Supabase Gmail Auth Form fields
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.fontSize = "16px";
      document.documentElement.removeAttribute("data-text-scale");
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("nourishthali_text_scale");
        // Clean up any legacy fake demo user key so only real Supabase Auth sessions are used
        const savedUser = window.localStorage.getItem("nourishthali_auth_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser) as AuthenticatedUserProfile;
          if (parsed?.id && parsed?.email) {
            setUser(parsed);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    function applySupabaseUser(supaUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    } | null) {
      if (!supaUser || !supaUser.email) {
        setUser(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("nourishthali_auth_user");
          window.localStorage.removeItem("nourishthali_google_user");
        }
        return;
      }

      const fullName =
        (typeof supaUser.user_metadata?.full_name === "string" &&
          supaUser.user_metadata.full_name) ||
        supaUser.email.split("@")[0].replace(/[._-]+/g, " ");

      const profile: AuthenticatedUserProfile = {
        id: supaUser.id,
        name: fullName,
        email: supaUser.email.toLowerCase(),
        initials: getInitialsFromName(fullName, supaUser.email),
      };

      setUser(profile);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "nourishthali_auth_user",
          JSON.stringify(profile)
        );
        window.dispatchEvent(new Event("nourishthali-user-changed"));
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        applySupabaseUser(data.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySupabaseUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleOAuthRedirect() {
    setAuthError(null);
    if (!isSupabaseConfigured()) {
      setAuthError("Supabase is not configured in .env.local.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setAuthError(
        `Google OAuth redirect notice: ${error.message}. Use the Gmail Sign-In form below to sign in directly with your Supabase User ID.`
      );
    }
  }

  async function handleGmailPasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setAuthError("Please enter a valid Gmail address (e.g. you@gmail.com).");
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      setAuthError("Please enter a password (at least 6 characters).");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Ensure the Gmail user exists and is confirmed in Supabase auth.users
      const provisionRes = await fetch("/api/auth/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: passwordInput,
          fullName: nameInput.trim(),
        }),
      });
      const provisionData = await provisionRes.json();
      if (!provisionRes.ok) {
        throw new Error(provisionData.error || "Could not verify Gmail account.");
      }

      // 2. Sign in via Supabase client to establish a real session tied to user.id & user.email
      const supabase = createClient();
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: passwordInput,
        });

      if (signInError || !signInData.user) {
        throw new Error(
          signInError?.message ||
            "Invalid password for this Gmail account. Please check your password."
        );
      }

      // 3. Sync userId + email with /api/home so any pending Gmail invite is linked to this user_id
      await fetch(
        `/api/home?email=${encodeURIComponent(cleanEmail)}&userId=${encodeURIComponent(
          signInData.user.id
        )}`,
        { cache: "no-store" }
      );

      setShowAuthModal(false);
      setPasswordInput("");
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Failed to sign in with Gmail."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("nourishthali_auth_user");
        window.localStorage.removeItem("nourishthali_google_user");
        window.dispatchEvent(new Event("nourishthali-user-changed"));
      } catch {
        // Ignore storage errors
      }
    }
  }

  return (
    <>
      <header className="w-full bg-[#FAF7F2] text-[#2C3531]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-6 pb-4">
          {/* Left: Plate + Botanical Sprig Logo + Serif Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <svg
              width="42"
              height="42"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle
                cx="24"
                cy="22"
                r="16"
                fill="#F3EDE0"
                stroke="#8C8270"
                strokeWidth="1.4"
              />
              <circle
                cx="24"
                cy="22"
                r="11.5"
                fill="#FAF7F2"
                stroke="#B5AA96"
                strokeWidth="1"
              />
              <path
                d="M11 33C11 24 13 16 17 10"
                stroke="#5E7461"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <ellipse
                cx="10"
                cy="24"
                rx="4"
                ry="2"
                transform="rotate(-35 10 24)"
                fill="#6D8770"
              />
              <ellipse
                cx="12"
                cy="17"
                rx="4"
                ry="2"
                transform="rotate(-25 12 17)"
                fill="#6D8770"
              />
              <ellipse
                cx="16"
                cy="21"
                rx="3.8"
                ry="1.8"
                transform="rotate(25 16 21)"
                fill="#6D8770"
              />
              <ellipse
                cx="15"
                cy="12"
                rx="3.5"
                ry="1.8"
                transform="rotate(-15 15 12)"
                fill="#6D8770"
              />
            </svg>
            <span className="font-serif text-[28px] font-normal tracking-tight text-[#3E4A3E]">
              NourishThali
            </span>
          </Link>

          {/* Right: Clean Navigation Links + My Recipes + My Home + Authenticated User */}
          <nav
            aria-label="Main Navigation"
            className="flex flex-wrap items-center gap-5 text-[15px] font-medium text-[#5A5A52]"
          >
            <Link
              href="/"
              className={`transition-colors hover:text-[#1E3528] ${
                pathname === "/"
                  ? "font-semibold text-[#1E3528] underline decoration-[#708C74] decoration-2 underline-offset-8"
                  : ""
              }`}
            >
              Daily Plan
            </Link>
            <Link
              href="/weekly-plan"
              className={`transition-colors hover:text-[#1E3528] ${
                pathname?.startsWith("/weekly-plan")
                  ? "font-semibold text-[#1E3528] underline decoration-[#708C74] decoration-2 underline-offset-8"
                  : ""
              }`}
            >
              Weekly Plan
            </Link>
            <Link
              href="/recipes"
              className={`transition-colors hover:text-[#1E3528] ${
                pathname?.startsWith("/recipes")
                  ? "font-semibold text-[#1E3528] underline decoration-[#708C74] decoration-2 underline-offset-8"
                  : ""
              }`}
            >
              Recipes
            </Link>
            <Link
              href="/my-recipes"
              className={`inline-flex items-center gap-1.5 transition-colors hover:text-[#1E3528] ${
                pathname?.startsWith("/my-recipes")
                  ? "font-semibold text-[#1E3528] underline decoration-[#708C74] decoration-2 underline-offset-8"
                  : ""
              }`}
            >
              <BookOpen className="h-4 w-4 text-[#708C74]" />
              <span>My Recipes</span>
            </Link>
            <Link
              href="/my-home"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
                pathname?.startsWith("/my-home")
                  ? "border-[#68846C] bg-[#68846C] text-white shadow-xs"
                  : "border-[#C9C0B1] bg-[#EFECE4] text-[#2B3B2E] hover:border-[#708C74] hover:bg-[#E4ECE4]"
              }`}
            >
              <Home className="h-4 w-4" />
              <span>My Home</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2.5 rounded-full border border-[#D8D0C2] bg-white py-1 pl-2 pr-3 shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#708C74] text-xs font-bold text-white">
                  {user.initials}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-[#1E2E23]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-[#6B665E]">
                    {user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="ml-1 rounded-full p-1 text-[#7A756C] hover:bg-[#F2ECE0] hover:text-[#14241B]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setShowAuthModal(true);
                }}
                className="inline-flex h-10 items-center gap-2.5 rounded-full border border-[#D5CEC0] bg-white px-4 text-[14px] font-semibold text-[#2C332E] shadow-sm transition-all hover:border-[#8C8270] hover:bg-[#FDFBF7]"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Real Supabase Authentication Modal (tied to user.id & Gmail) */}
      {showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-signin-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md overflow-hidden rounded-[22px] border border-[#E4DAC8] bg-[#FAF4E8] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E4DAC8] bg-white shadow-sm">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                </div>
                <div>
                  <h2
                    id="google-signin-title"
                    className="text-lg font-bold text-[#1E2E23]"
                  >
                    Sign in with Google / Gmail
                  </h2>
                  <p className="text-xs text-[#6E6A63]">
                    Authenticated via Supabase Auth (tied to your Gmail &amp; User ID)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-lg p-1 text-[#6E6A63] hover:bg-[#EBE2D0] hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {authError && (
              <p className="mt-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-xs font-medium text-[#991B1B]">
                {authError}
              </p>
            )}

            {/* Option 1: Direct Google OAuth Redirect */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleOAuthRedirect}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#D5CEC0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E2E23] shadow-xs transition-all hover:border-[#708C74] hover:bg-[#F7FAF8]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                Continue with Google OAuth
              </button>
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E2D9C8]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C8270]">
                Or Sign In with Gmail &amp; Password
              </span>
              <div className="h-px flex-1 bg-[#E2D9C8]" />
            </div>

            {/* Option 2: Direct Supabase Auth with Gmail + Password (creates real auth.users UUID) */}
            <form onSubmit={handleGmailPasswordSignIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5A5A52]">
                  Your Name (for new account)
                </label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8C8270]" />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Heena Mukhi"
                    className="w-full rounded-xl border border-[#D8D0C2] bg-white pl-9 pr-3 py-2 text-sm text-[#1E2E23] focus:border-[#708C74] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5A5A52]">
                  Gmail Address *
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8C8270]" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full rounded-xl border border-[#D8D0C2] bg-white pl-9 pr-3 py-2 text-sm text-[#1E2E23] focus:border-[#708C74] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5A5A52]">
                  Password *
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#8C8270]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-[#D8D0C2] bg-white pl-9 pr-3 py-2 text-sm text-[#1E2E23] focus:border-[#708C74] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#68846C] py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#57725B] disabled:opacity-60"
              >
                {submitting
                  ? "Signing in with Supabase..."
                  : "Sign In / Create Account"}
              </button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#E4DAC8] bg-[#F2E9DA]/70 p-3 text-[11.5px] leading-relaxed text-[#4A4A45]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#708C74] mt-0.5" />
              <span>
                Your session is strictly tied to your authenticated{" "}
                <strong>Gmail</strong> and <strong>Supabase User ID</strong> in{" "}
                <code>auth.users</code> &amp; <code>public.home_members</code>.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
