"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  Mail,
  UserPlus,
  Users,
  CheckCircle2,
  Copy,
  ExternalLink,
  Calendar,
  Sparkles,
  Trash2,
  Share2,
  ShieldCheck,
  PlusCircle,
  KeyRound,
  ArrowRightLeft,
  Database,
} from "lucide-react";
import type {
  FamilyHomeState,
  FamilyMember,
  FamilyMemberRole,
} from "@/app/api/home/route";
import type { AuthenticatedUserProfile } from "@/components/TopBarScaler";
import {
  DEFAULT_WEEKLY_PLAN,
  TODAY_DAY_INDEX,
  loadWeeklyPlanFromStorage,
  fetchSharedWeeklyPlanFromSupabase,
  type DayPlanRecord,
} from "@/data/weekly-plan-store";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";

export function MyHomeClient() {
  const [homeState, setHomeState] = useState<FamilyHomeState | null>(null);
  const [allHomes, setAllHomes] = useState<FamilyHomeState[]>([]);
  const [weeklyPlan, setWeeklyPlan] =
    useState<DayPlanRecord[]>(DEFAULT_WEEKLY_PLAN);
  const [loading, setLoading] = useState<boolean>(true);
  const [authUser, setAuthUser] = useState<AuthenticatedUserProfile | null>(
    null
  );

  // Create Home form state
  const [newHomeName, setNewHomeName] = useState<string>("");
  const [newHomeCode, setNewHomeCode] = useState<string>("");
  const [creatorName, setCreatorName] = useState<string>("");
  const [creatorEmail, setCreatorEmail] = useState<string>("");
  const [creatingHome, setCreatingHome] = useState<boolean>(false);
  const [createHomeMessage, setCreateHomeMessage] = useState<string | null>(
    null
  );
  const [createHomeError, setCreateHomeError] = useState<string | null>(null);

  // Join Home form state
  const [joinCode, setJoinCode] = useState<string>("");
  const [joinName, setJoinName] = useState<string>("");
  const [joinEmail, setJoinEmail] = useState<string>("");
  const [joiningHome, setJoiningHome] = useState<boolean>(false);
  const [joinHomeMessage, setJoinHomeMessage] = useState<string | null>(null);
  const [joinHomeError, setJoinHomeError] = useState<string | null>(null);

  // Invite form state
  const [inviteName, setInviteName] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteRole, setInviteRole] =
    useState<FamilyMemberRole>("Family Member");
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInvitedMember, setLastInvitedMember] =
    useState<FamilyMember | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  async function loadHomeForUser(
    email?: string | null,
    userId?: string | null
  ) {
    try {
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (userId) params.set("userId", userId);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/home${qs}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.home) {
          setHomeState(data.home);
        }
        if (Array.isArray(data?.homes)) {
          setAllHomes(data.homes);
        }
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setWeeklyPlan(loadWeeklyPlanFromStorage());
    void fetchSharedWeeklyPlanFromSupabase().then((remote) => {
      if (remote) {
        setWeeklyPlan(remote);
      }
    });

    function syncAuthFromStorage() {
      if (typeof window === "undefined") return;
      try {
        const saved = window.localStorage.getItem("nourishthali_auth_user");
        if (saved) {
          const parsed = JSON.parse(saved) as AuthenticatedUserProfile;
          if (parsed?.email) {
            setAuthUser(parsed);
            setCreatorEmail(parsed.email);
            setJoinEmail(parsed.email);
            setCreatorName(parsed.name || "");
            setJoinName(parsed.name || "");
            void loadHomeForUser(parsed.email, parsed.id);
            return;
          }
        }
        setAuthUser(null);
        void loadHomeForUser(null, null);
      } catch {
        void loadHomeForUser(null, null);
      }
    }

    syncAuthFromStorage();
    window.addEventListener("nourishthali-user-changed", syncAuthFromStorage);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get("invite");
      if (inviteParam) {
        setJoinCode(inviteParam.toUpperCase());
      }
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          const fullName =
            (typeof data.user.user_metadata?.full_name === "string" &&
              data.user.user_metadata.full_name) ||
            data.user.email.split("@")[0];
          const profile: AuthenticatedUserProfile = {
            id: data.user.id,
            name: fullName,
            email: data.user.email.toLowerCase(),
            initials: fullName.slice(0, 2).toUpperCase(),
          };
          setAuthUser(profile);
          setCreatorEmail(profile.email);
          setJoinEmail(profile.email);
          setCreatorName(profile.name);
          setJoinName(profile.name);
          void loadHomeForUser(profile.email, profile.id);
        }
      });
    }

    return () => {
      window.removeEventListener(
        "nourishthali-user-changed",
        syncAuthFromStorage
      );
    };
  }, []);

  function buildGmailComposeUrl(email: string, name: string) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const subject = encodeURIComponent(
      `Invitation to join ${homeState?.homeName || "Mukhi Family Home"} on NourishThali`
    );
    const body = encodeURIComponent(
      `Hi ${name || "Family"},\n\nYou have been invited to join our shared ${
        homeState?.homeName || "Mukhi Family Home"
      } on NourishThali!\n\nWith our shared Family Home, all family members can view and edit:\n• Today's Daily Plan (Tuesday, Nov 3): ${origin}/\n• Our Shared Weekly Plan (Mon Nov 2 – Sun Nov 8): ${origin}/weekly-plan\n• Custom Family Keto Recipes: ${origin}/my-recipes\n\nFamily Invite Code: ${
        homeState?.inviteCode || "MUKHI-2026"
      }\n\nClick here to sign in with your Gmail (${email}) and join our Home:\n${origin}/my-home?invite=${
        homeState?.inviteCode || "MUKHI-2026"
      }\n\nWarmly,\n${homeState?.homeName || "Mukhi Family Kitchen"}`
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${subject}&body=${body}`;
  }

  async function handleCreateHomeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateHomeError(null);
    setCreateHomeMessage(null);

    if (!newHomeName.trim()) {
      setCreateHomeError("Please enter a name for your new home.");
      return;
    }

    const effectiveEmail = (authUser?.email || creatorEmail).trim().toLowerCase();
    if (!effectiveEmail) {
      setCreateHomeError(
        "Please sign in with your Gmail account (or enter your Gmail) to create a home."
      );
      return;
    }

    setCreatingHome(true);
    try {
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_home",
          homeName: newHomeName.trim(),
          inviteCode: newHomeCode.trim(),
          creatorName: (authUser?.name || creatorName).trim() || "Home Admin",
          creatorEmail: effectiveEmail,
          creatorUserId: authUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create home");
      }
      setHomeState(data.home);
      if (Array.isArray(data.homes)) setAllHomes(data.homes);
      setCreateHomeMessage(
        `Created "${data.home.homeName}" with Invite Code ${data.home.inviteCode} in Supabase!`
      );
      setNewHomeName("");
      setNewHomeCode("");
    } catch (err) {
      setCreateHomeError(
        err instanceof Error ? err.message : "Failed to create home"
      );
    } finally {
      setCreatingHome(false);
    }
  }

  async function handleJoinHomeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJoinHomeError(null);
    setJoinHomeMessage(null);

    if (!joinCode.trim()) {
      setJoinHomeError(
        "Please enter an Invite Code (for example: MUKHI-2026)."
      );
      return;
    }
    const effectiveEmail = (authUser?.email || joinEmail).trim().toLowerCase();
    if (!effectiveEmail) {
      setJoinHomeError("Please enter your Gmail address.");
      return;
    }

    setJoiningHome(true);
    try {
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join_home",
          inviteCode: joinCode.trim().toUpperCase(),
          name: (authUser?.name || joinName).trim(),
          email: effectiveEmail,
          userId: authUser?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join home");
      }
      setHomeState(data.home);
      if (Array.isArray(data.homes)) setAllHomes(data.homes);
      setJoinHomeMessage(
        `Successfully joined "${data.home.homeName}" (${data.home.inviteCode})!`
      );
      setJoinCode("");
    } catch (err) {
      setJoinHomeError(
        err instanceof Error ? err.message : "Failed to join home"
      );
    } finally {
      setJoiningHome(false);
    }
  }

  async function handleSwitchHome(targetHomeId: string) {
    try {
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch_home",
          homeId: targetHomeId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.home) {
        setHomeState(data.home);
        if (Array.isArray(data.homes)) setAllHomes(data.homes);
      }
    } catch {
      // Ignore
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setLastInvitedMember(null);

    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setInviteError("Please enter a Gmail address.");
      return;
    }

    const finalEmail = trimmedEmail.includes("@")
      ? trimmedEmail
      : `${trimmedEmail}@gmail.com`;

    if (!finalEmail.endsWith("@gmail.com") && !finalEmail.includes("@")) {
      setInviteError(
        "Please enter a valid Gmail address (e.g. name@gmail.com)."
      );
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeId: homeState?.homeId,
          name: inviteName.trim(),
          email: finalEmail,
          role: inviteRole,
          status: "Invited via Gmail",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite family member");
      }
      setHomeState(data.home);
      if (Array.isArray(data.homes)) setAllHomes(data.homes);
      setLastInvitedMember(data.invitedMember);
      setInviteName("");
      setInviteEmail("");
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to invite family member"
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      const res = await fetch("/api/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_member",
          homeId: homeState?.homeId,
          memberId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.home) {
        setHomeState(data.home);
        if (Array.isArray(data.homes)) setAllHomes(data.homes);
      }
    } catch {
      // Ignore
    }
  }

  function handleCopyCode() {
    if (!homeState) return;
    navigator.clipboard?.writeText(homeState.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleCopyInviteLink() {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const url = `${origin}/my-home?invite=${
      homeState?.inviteCode || "MUKHI-2026"
    }`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const todayPlan = weeklyPlan[TODAY_DAY_INDEX] ?? weeklyPlan[1];

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-2">
      {/* Header Banner */}
      <div className="mb-8 rounded-[26px] border border-[#DFD8CA] bg-gradient-to-r from-[#DCE5DC]/75 via-[#EFECE4] to-[#E5D6C3]/65 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#435E47] shadow-xs">
              <Home className="h-3.5 w-3.5 text-[#708C74]" />
              Shared Family Kitchen • Tied to Gmail &amp; Supabase User ID
            </div>
            <h1 className="mt-3 font-serif text-3xl font-normal text-[#232D26] sm:text-4xl">
              {homeState?.homeName || "Mukhi Family Home (Bikaner)"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[#4A524C]">
              Create or join a Family Home and invite family members via Gmail so
              everyone in the household can collaborate on{" "}
              <strong>Today&apos;s Daily Plan (Tuesday, Nov 3)</strong>, the{" "}
              <strong>Monday–Sunday Weekly Plan</strong>, and the{" "}
              <strong>Bikaner Mandi Shopping List</strong> in real time.
            </p>

            {authUser ? (
              <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#C6D6C8] bg-white/90 px-3.5 py-1.5 text-xs text-[#233D29]">
                <ShieldCheck className="h-4 w-4 text-[#527056]" />
                <span>
                  Signed in as <strong>{authUser.name}</strong> (
                  <code>{authUser.email}</code> • User ID:{" "}
                  <code>{authUser.id.slice(0, 8)}...</code>)
                </span>
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E2D5C1] bg-white/85 px-3.5 py-1.5 text-xs text-[#5A554C]">
                <span>
                  Click <strong>Sign in with Google</strong> in the top right to
                  link your Gmail &amp; Supabase User ID to this Home.
                </span>
              </div>
            )}

            {/* Home Switcher Pills if multiple homes exist */}
            {allHomes.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-[#68846C]" />
                  Your Homes:
                </span>
                {allHomes.map((h) => {
                  const isCurrentHome = h.homeId === homeState?.homeId;
                  return (
                    <button
                      key={h.homeId}
                      type="button"
                      onClick={() => handleSwitchHome(h.homeId)}
                      className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                        isCurrentHome
                          ? "bg-[#68846C] text-white shadow-xs"
                          : "border border-[#D8D0C2] bg-white/90 text-[#2E3830] hover:bg-white"
                      }`}
                    >
                      {h.homeName} ({h.inviteCode})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invite Code Card */}
          <div className="flex flex-col items-start sm:items-end gap-2 rounded-2xl border border-[#D8D0C2] bg-white/95 px-5 py-4 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A756C]">
              Family Home Invite Code
            </span>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl font-bold tracking-wider text-[#1E3528]">
                {homeState?.inviteCode || "MUKHI-2026"}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D8D0C2] bg-[#FAF7F2] px-2.5 py-1 text-xs font-semibold text-[#3C463E] hover:bg-[#EFECE4]"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedCode ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E7B62] hover:underline"
            >
              <Share2 className="h-3.5 w-3.5" />
              {copiedLink
                ? "Share link copied to clipboard!"
                : "Copy Family Share Link"}
            </button>
          </div>
        </div>
      </div>

      {/* Create a Home OR Join an Existing Home Section */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1: Create a New Family Home */}
        <section className="rounded-[24px] border border-[#E4DAC8] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F0E8] text-[#4E6952]">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-normal text-[#232D26]">
                Create a New Home
              </h2>
              <p className="text-xs text-[#6B665E]">
                Start a dedicated household kitchen &amp; generate a shareable
                Invite Code
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateHomeSubmit} className="mt-5 space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                  Home Name *
                </label>
                <input
                  type="text"
                  required
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  placeholder="e.g. Mukhi Family Home"
                  className="mt-1 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#232D26] placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                  Custom Invite Code (Optional)
                </label>
                <input
                  type="text"
                  value={newHomeCode}
                  onChange={(e) => setNewHomeCode(e.target.value.toUpperCase())}
                  placeholder="Auto-generated if blank"
                  className="mt-1 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 font-mono text-sm uppercase text-[#232D26] placeholder:font-sans placeholder:normal-case placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                  Your Name
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="e.g. Heena Mukhi"
                  disabled={Boolean(authUser)}
                  className="mt-1 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#232D26] placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none disabled:opacity-75"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                  Your Gmail *
                </label>
                <input
                  type="email"
                  required
                  value={creatorEmail}
                  onChange={(e) => setCreatorEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  disabled={Boolean(authUser)}
                  className="mt-1 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#232D26] placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none disabled:opacity-75"
                />
              </div>
            </div>

            {createHomeError && (
              <p className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2 text-xs font-medium text-[#991B1B]">
                {createHomeError}
              </p>
            )}
            {createHomeMessage && (
              <p className="rounded-xl border border-[#B9D0BC] bg-[#F1F7F1] px-3.5 py-2 text-xs font-semibold text-[#1E3528]">
                {createHomeMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={creatingHome}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#68846C] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#57725B] disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />
              {creatingHome ? "Creating Home..." : "Create Home"}
            </button>
          </form>
        </section>

        {/* Card 2: Join an Existing Family Home */}
        <section className="rounded-[24px] border border-[#E4DAC8] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EBE1] text-[#B86B4B]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-normal text-[#232D26]">
                Join an Existing Home
              </h2>
              <p className="text-xs text-[#6B665E]">
                Enter a Family Invite Code (such as{" "}
                <span className="font-mono font-semibold text-[#232D26]">
                  MUKHI-2026
                </span>
                ) to sync plans
              </p>
            </div>
          </div>

          <form onSubmit={handleJoinHomeSubmit} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                Family Invite Code *
              </label>
              <input
                type="text"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. MUKHI-2026"
                className="mt-1 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-[#232D26] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                  Your Name
                </label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Rohan Mukhi"
                  disabled={Boolean(authUser)}
                  className="mt-1 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#232D26] placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none disabled:opacity-75"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                  Your Gmail *
                </label>
                <input
                  type="email"
                  required
                  value={joinEmail}
                  onChange={(e) => setJoinEmail(e.target.value)}
                  placeholder="family.member@gmail.com"
                  disabled={Boolean(authUser)}
                  className="mt-1 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#232D26] placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none disabled:opacity-75"
                />
              </div>
            </div>

            {joinHomeError && (
              <p className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2 text-xs font-medium text-[#991B1B]">
                {joinHomeError}
              </p>
            )}
            {joinHomeMessage && (
              <p className="rounded-xl border border-[#B9D0BC] bg-[#F1F7F1] px-3.5 py-2 text-xs font-semibold text-[#1E3528]">
                {joinHomeMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={joiningHome}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#68846C] bg-[#F2F7F2] px-5 py-2.5 text-sm font-semibold text-[#233D29] shadow-xs transition-colors hover:bg-[#68846C] hover:text-white disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {joiningHome ? "Joining Home..." : "Join Home with Code"}
            </button>
          </form>
        </section>
      </div>

      {/* Main Two-Column Grid: Left = Invite via Gmail, Right = Family Members */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Invite Family Member via Gmail */}
        <section className="lg:col-span-5 rounded-[24px] border border-[#E4DAC8] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F0E8] text-[#4E6952]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-normal text-[#232D26]">
                Invite Family Member via Gmail
              </h2>
              <p className="text-xs text-[#6B665E]">
                Grant shared access to your Weekly &amp; Daily Plan
              </p>
            </div>
          </div>

          <form onSubmit={handleInviteSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                Family Member Name
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Rohan Mukhi or Priya Mukhi"
                className="mt-1.5 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#232D26] placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                Gmail Address *
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#8C8270]" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="family.member@gmail.com"
                  className="w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] pl-10 pr-3.5 py-2.5 text-sm text-[#232D26] placeholder:text-[#9A948A] focus:border-[#708C74] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A5A52]">
                Family Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as FamilyMemberRole)
                }
                className="mt-1.5 w-full rounded-xl border border-[#D8D0C2] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#232D26] focus:border-[#708C74] focus:bg-white focus:outline-none"
              >
                <option value="Family Member">
                  Family Member (View &amp; Edit Meals + Shopping List)
                </option>
                <option value="Kitchen Lead">
                  Kitchen Lead (Full Kitchen &amp; Recipe Management)
                </option>
                <option value="Home Admin">
                  Home Admin (Manage Home Settings &amp; Invites)
                </option>
              </select>
            </div>

            {inviteError && (
              <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#991B1B]">
                {inviteError}
              </div>
            )}

            <button
              type="submit"
              disabled={inviting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#68846C] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#57725B] disabled:opacity-60"
            >
              <Mail className="h-4 w-4" />
              {inviting
                ? "Adding to Family Home..."
                : "Invite via Gmail & Grant Shared Access"}
            </button>
          </form>

          {lastInvitedMember && (
            <div className="mt-5 rounded-2xl border border-[#B9D0BC] bg-[#F1F7F1] p-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4D7C55] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1E3528]">
                    {lastInvitedMember.name} ({lastInvitedMember.email}) added!
                  </p>
                  <p className="mt-0.5 text-xs text-[#4A5D4E]">
                    When they sign in with{" "}
                    <strong>{lastInvitedMember.email}</strong>, their Supabase
                    User ID will automatically link to this Home. Send them the
                    invite email below:
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={buildGmailComposeUrl(
                        lastInvitedMember.email,
                        lastInvitedMember.name
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1E3528] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2F4B3B]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Gmail Compose to {lastInvitedMember.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#E8E0D2] bg-[#FAF7F2] p-3.5 text-xs text-[#5A554C]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#68846C] mt-0.5" />
            <span>
              Accounts cannot be switched without authenticating. Each member
              signs in with their own <strong>Gmail</strong> and{" "}
              <strong>Supabase User ID</strong>.
            </span>
          </div>
        </section>

        {/* Right Column: Active & Invited Family Members */}
        <section className="lg:col-span-7 rounded-[24px] border border-[#E4DAC8] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EBE1] text-[#B86B4B]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-normal text-[#232D26]">
                  Family Members ({homeState?.members.length || 2})
                </h2>
                <p className="text-xs text-[#6B665E]">
                  Members linked to{" "}
                  <strong>{homeState?.homeName || "Mukhi Family Home"}</strong>{" "}
                  by Gmail &amp; User ID
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl bg-[#F4EFE6]"
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {(homeState?.members || []).map((member) => {
                const isSignedInUser =
                  Boolean(authUser?.email) &&
                  authUser?.email.toLowerCase() === member.email.toLowerCase();
                return (
                  <div
                    key={member.id}
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${
                      isSignedInUser
                        ? "border-[#708C74] bg-[#F4F8F4]"
                        : "border-[#E6DEC8] bg-[#FAF7F2]/60"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#68846C] text-sm font-bold text-white shadow-xs">
                        {member.avatarInitials}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#1E2E23]">
                            {member.name}
                          </span>
                          <span className="rounded-full bg-[#E8EFE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#3B593F]">
                            {member.role}
                          </span>
                          {isSignedInUser && (
                            <span className="rounded-full bg-[#68846C] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                              Signed In (You)
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#635E56]">
                          {member.email} •{" "}
                          <span className="font-medium text-[#527056]">
                            {member.status}
                          </span>
                          {member.userId && (
                            <span className="ml-1.5 font-mono text-[10px] text-[#7A756C]">
                              (ID: {member.userId.slice(0, 8)}...)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={buildGmailComposeUrl(member.email, member.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Send Gmail invite to ${member.email}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D0C2] bg-white px-3 py-1.5 text-xs font-semibold text-[#3C463E] hover:border-[#8C8270] hover:bg-[#FAF7F2]"
                      >
                        <Mail className="h-3.5 w-3.5 text-[#B86B4B]" />
                        Send Gmail Invite
                      </a>

                      {member.id !== "member-vijay" &&
                        member.id !== "member-heena" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            title="Remove member"
                            className="rounded-full p-1.5 text-[#8C8270] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Shared Family Weekly & Daily Plan Live Overview */}
      <section className="mt-10 rounded-[26px] border border-[#E4DAC8] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFE8D8] pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#68846C]">
                <Sparkles className="h-3.5 w-3.5" />
                Shared Across All {homeState?.members.length || 2} Family
                Members
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF3EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#2E5936]">
                <Database className="h-3 w-3" />
                Saved in Supabase (public.meal_plans &amp; public.daily_quotes)
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#232D26]">
              Family Weekly &amp; Daily Plan (Nov 2 – Nov 8)
            </h2>
            <p className="mt-0.5 text-xs text-[#6B665E]">
              Every edit to Brunch or Dinner on the Daily Plan or Weekly Plan is
              automatically persisted to Supabase so all members of{" "}
              <strong>{homeState?.homeName || "your Home"}</strong> see the same
              menu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[#708C74] bg-[#F3F8F3] px-4 py-2 text-xs font-semibold text-[#2E4833] hover:bg-[#E4EFE5]"
            >
              <Calendar className="h-3.5 w-3.5" />
              Open Today&apos;s Plan (Tue, Nov 3)
            </Link>
            <Link
              href="/weekly-plan"
              className="inline-flex items-center gap-2 rounded-full bg-[#68846C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#57725B]"
            >
              Edit Full Weekly Plan &rarr;
            </Link>
          </div>
        </div>

        {/* Today's Highlight Card (Tuesday, Nov 3) */}
        {todayPlan && (
          <div className="mt-6 rounded-2xl border-2 border-[#708C74] bg-[#FAFDF9] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#68846C] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Today&apos;s Family Menu • {todayPlan.dayName},{" "}
                {todayPlan.dateLabel}
              </span>
              <Link
                href="/"
                className="text-xs font-semibold text-[#527056] hover:underline"
              >
                Customize on Daily Plan &rarr;
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "BRUNCH", slot: todayPlan.brunch },
                { label: "DINNER", slot: todayPlan.dinner },
              ].map(({ label, slot }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-xl border border-[#DFD8CA] bg-white p-3.5 shadow-2xs"
                >
                  {slot.aiImageUrl ? (
                    <img
                      src={slot.aiImageUrl}
                      alt={slot.title}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#EBF1EB] text-xs font-bold text-[#4F6A52]">
                      {label}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B86B4B]">
                      {label} • {slot.time}
                    </span>
                    <h3 className="truncate font-serif text-base font-normal text-[#232D26]">
                      {slot.title}
                    </h3>
                    <p className="truncate text-xs text-[#6B665E]">
                      {slot.plate.protein} • {slot.plate.fiber} •{" "}
                      {slot.plate.carb} • {slot.plate.chutney}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-Day Compact Shared Grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weeklyPlan.map((day, idx) => {
            const isToday = idx === TODAY_DAY_INDEX;
            return (
              <div
                key={day.dayIndex}
                className={`rounded-2xl border p-3.5 transition-all ${
                  isToday
                    ? "border-[#708C74] bg-[#F2F7F2] shadow-xs"
                    : "border-[#E6DEC8] bg-[#FAF7F2]/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#232D26]">
                    {day.dayShort}
                  </span>
                  <span className="text-[11px] font-medium text-[#7A756C]">
                    {day.dateLabel}
                  </span>
                </div>
                {isToday && (
                  <span className="mt-1 inline-block rounded-full bg-[#68846C] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    Today
                  </span>
                )}
                <div className="mt-2.5 space-y-2 border-t border-[#E6DEC8] pt-2.5 text-[11px]">
                  <div>
                    <span className="font-bold uppercase text-[#B86B4B]">
                      Brunch:
                    </span>
                    <p className="line-clamp-2 text-[#2E3830]">
                      {day.brunch.plate.protein} + {day.brunch.plate.fiber}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold uppercase text-[#5E7B62]">
                      Dinner:
                    </span>
                    <p className="line-clamp-2 text-[#2E3830]">
                      {day.dinner.plate.protein} + {day.dinner.plate.fiber}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
