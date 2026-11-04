import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOME_SYNC_DATE = '2099-12-30';
const HOME_SYNC_MARKER = '__NOURISHTHALI_HOME_STATE_V3__';

export type FamilyMemberRole = 'Home Admin' | 'Family Member' | 'Kitchen Lead';

export interface FamilyMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: FamilyMemberRole;
  status: 'Active' | 'Invited via Gmail';
  invitedAt: string;
  avatarInitials: string;
}

export interface FamilyHomeState {
  homeId: string;
  homeName: string;
  inviteCode: string;
  createdByUserId?: string;
  updatedAt: string;
  members: FamilyMember[];
}

interface MultiHomeStore {
  activeHomeId: string;
  homes: FamilyHomeState[];
}

const DEFAULT_HOME_STATE: FamilyHomeState = {
  homeId: '00000000-0000-4000-8000-000000000001',
  homeName: 'Mukhi Family Home (Bikaner)',
  inviteCode: 'MUKHI-2026',
  updatedAt: new Date().toISOString(),
  members: [
    {
      id: 'member-vijay',
      name: 'Vijay Mukhi',
      email: 'vijay.mukhi@gmail.com',
      role: 'Home Admin',
      status: 'Active',
      invitedAt: '2026-11-01T08:00:00.000Z',
      avatarInitials: 'VM',
    },
    {
      id: 'member-heena',
      name: 'Heena Mukhi',
      email: 'heena.mukhi@gmail.com',
      role: 'Kitchen Lead',
      status: 'Active',
      invitedAt: '2026-11-01T08:05:00.000Z',
      avatarInitials: 'HM',
    },
  ],
};

function sanitizeRole(rawRole: string | undefined): FamilyMemberRole {
  if (!rawRole) return 'Family Member';
  if (
    rawRole === 'Home Admin' ||
    rawRole === 'Family Member' ||
    rawRole === 'Kitchen Lead'
  ) {
    return rawRole;
  }
  const lower = rawRole.toLowerCase();
  if (lower.includes('admin') || lower.includes('host') || lower.includes('owner')) {
    return 'Home Admin';
  }
  if (lower.includes('kitchen') || lower.includes('chef') || lower.includes('cook')) {
    return 'Kitchen Lead';
  }
  return 'Family Member';
}

function sanitizeHome(home: FamilyHomeState): FamilyHomeState {
  return {
    ...home,
    members: (home.members || []).map((m, idx) => ({
      ...m,
      role:
        idx === 0 && sanitizeRole(m.role) === 'Family Member'
          ? 'Home Admin'
          : sanitizeRole(m.role),
    })),
  };
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your-supabase-service-role-key'
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getInitials(name: string, email: string): string {
  const clean = name.trim() || email.split('@')[0] || 'FM';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function generateInviteCode(homeName: string): string {
  const prefix =
    homeName
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 5) || 'HOME';
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${digits}`;
}

function isValidUuid(val: string | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val
  );
}

async function loadMultiHomeStore(): Promise<MultiHomeStore> {
  const supabase = getSupabaseAdmin();
  const fallbackStore: MultiHomeStore = {
    activeHomeId: DEFAULT_HOME_STATE.homeId,
    homes: [DEFAULT_HOME_STATE],
  };
  if (!supabase) return fallbackStore;

  try {
    // Read from public.daily_quotes using the real schema columns (quote_date, quote_text, ayurvedic_or_metabolic_tip)
    const { data, error } = await supabase
      .from('daily_quotes')
      .select('quote_text, ayurvedic_or_metabolic_tip')
      .eq('quote_date', HOME_SYNC_DATE)
      .maybeSingle();

    if (!error && data && data.ayurvedic_or_metabolic_tip) {
      const parsed = JSON.parse(data.ayurvedic_or_metabolic_tip) as MultiHomeStore;
      if (parsed && Array.isArray(parsed.homes) && parsed.homes.length > 0) {
        const sanitizedHomes = parsed.homes.map(sanitizeHome);
        const activeExists = sanitizedHomes.some(
          (h) => h.homeId === parsed.activeHomeId
        );
        return {
          activeHomeId: activeExists
            ? parsed.activeHomeId
            : sanitizedHomes[0].homeId,
          homes: sanitizedHomes,
        };
      }
    }
  } catch {
    // Fallback to default
  }

  // Save default store on first run so public.homes and public.daily_quotes are populated
  await saveMultiHomeStore(fallbackStore);
  return fallbackStore;
}

async function saveMultiHomeStore(store: MultiHomeStore): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Sync to public.homes and public.home_members relational tables
  try {
    for (const h of store.homes) {
      const upsertPayload: Record<string, unknown> = {
        name: h.homeName,
        invite_code: h.inviteCode,
      };
      if (isValidUuid(h.homeId)) {
        upsertPayload.id = h.homeId;
      }
      if (isValidUuid(h.createdByUserId)) {
        upsertPayload.created_by = h.createdByUserId;
      }

      const { data: homeRow } = await supabase
        .from('homes')
        .upsert(upsertPayload, { onConflict: 'invite_code' })
        .select('id')
        .maybeSingle();

      if (homeRow?.id) {
        h.homeId = homeRow.id;
        // Sync any member with a valid Supabase auth.users UUID into public.home_members
        for (const m of h.members) {
          if (isValidUuid(m.userId)) {
            await supabase.from('home_members').upsert(
              {
                home_id: homeRow.id,
                user_id: m.userId,
                display_name: `${m.name} (${m.email})`,
                role: m.role === 'Home Admin' ? 'admin' : 'member',
              },
              { onConflict: 'home_id,user_id' }
            );
          }
        }
      }
    }
  } catch {
    // Non-fatal if RLS or FK constraints differ
  }

  // 2. Save full multi-home state (including pre-invited Gmail members) to public.daily_quotes
  await supabase.from('daily_quotes').upsert(
    {
      quote_date: HOME_SYNC_DATE,
      quote_text: HOME_SYNC_MARKER,
      ayurvedic_or_metabolic_tip: JSON.stringify(store),
    },
    { onConflict: 'quote_date' }
  );
}

function resolveHomeForUser(
  store: MultiHomeStore,
  email?: string | null,
  userId?: string | null
): FamilyHomeState {
  if (userId) {
    const byId = store.homes.find((h) =>
      h.members.some((m) => m.userId && m.userId === userId)
    );
    if (byId) return byId;
  }
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const byEmail = store.homes.find((h) =>
      h.members.some((m) => m.email.toLowerCase() === cleanEmail)
    );
    if (byEmail) return byEmail;
  }
  return (
    store.homes.find((h) => h.homeId === store.activeHomeId) || store.homes[0]
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const userId = searchParams.get('userId');

  const store = await loadMultiHomeStore();

  // If a signed-in user matches an invited Gmail member, automatically mark them Active and link their userId
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    let updated = false;
    for (const h of store.homes) {
      for (const m of h.members) {
        if (m.email.toLowerCase() === cleanEmail) {
          if (m.status !== 'Active') {
            m.status = 'Active';
            updated = true;
          }
          if (userId && isValidUuid(userId) && m.userId !== userId) {
            m.userId = userId;
            updated = true;
          }
        }
      }
    }
    if (updated) {
      await saveMultiHomeStore(store);
    }
  }

  const home = resolveHomeForUser(store, email, userId);
  return NextResponse.json({ home, homes: store.homes });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = await loadMultiHomeStore();
    const activeHome =
      store.homes.find((h) => h.homeId === (body.homeId || store.activeHomeId)) ||
      store.homes[0];

    // 1. Switch active home
    if (body.action === 'switch_home' && body.homeId) {
      const target = store.homes.find((h) => h.homeId === body.homeId);
      if (!target) {
        return NextResponse.json({ error: 'Home not found.' }, { status: 404 });
      }
      const nextStore: MultiHomeStore = {
        ...store,
        activeHomeId: target.homeId,
      };
      await saveMultiHomeStore(nextStore);
      return NextResponse.json({
        success: true,
        home: target,
        homes: nextStore.homes,
      });
    }

    // 2. Create a new home (tied to creator's Gmail & Supabase User ID)
    if (body.action === 'create_home') {
      const homeName = String(body.homeName || '').trim();
      if (!homeName) {
        return NextResponse.json(
          { error: 'Please enter a name for your new Family Home.' },
          { status: 400 }
        );
      }

      const customCode = String(body.inviteCode || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '');
      const inviteCode = customCode || generateInviteCode(homeName);

      const duplicate = store.homes.find(
        (h) => h.inviteCode.toUpperCase() === inviteCode.toUpperCase()
      );
      if (duplicate) {
        return NextResponse.json(
          {
            error: `Invite code "${inviteCode}" is already in use by ${duplicate.homeName}. Try another code or use Join Home.`,
          },
          { status: 400 }
        );
      }

      const creatorEmailRaw = String(body.creatorEmail || '')
        .trim()
        .toLowerCase();
      if (!creatorEmailRaw) {
        return NextResponse.json(
          { error: 'Please sign in with your Gmail account first to create a home.' },
          { status: 400 }
        );
      }
      const creatorEmail = creatorEmailRaw.includes('@')
        ? creatorEmailRaw
        : `${creatorEmailRaw}@gmail.com`;
      const creatorUserId = isValidUuid(body.creatorUserId)
        ? String(body.creatorUserId)
        : undefined;
      const creatorName =
        String(body.creatorName || '').trim() ||
        creatorEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

      const newHome: FamilyHomeState = {
        homeId: crypto.randomUUID(),
        homeName,
        inviteCode,
        createdByUserId: creatorUserId,
        updatedAt: new Date().toISOString(),
        members: [
          {
            id: `member-${Date.now()}`,
            userId: creatorUserId,
            name: creatorName,
            email: creatorEmail,
            role: 'Home Admin',
            status: 'Active',
            invitedAt: new Date().toISOString(),
            avatarInitials: getInitials(creatorName, creatorEmail),
          },
        ],
      };

      const nextStore: MultiHomeStore = {
        activeHomeId: newHome.homeId,
        homes: [...store.homes, newHome],
      };
      await saveMultiHomeStore(nextStore);

      return NextResponse.json({
        success: true,
        home: newHome,
        homes: nextStore.homes,
      });
    }

    // 3. Join an existing home via Invite Code (tied to user's Gmail & Supabase User ID)
    if (body.action === 'join_home') {
      const codeInput = String(body.inviteCode || '')
        .trim()
        .toUpperCase();
      if (!codeInput) {
        return NextResponse.json(
          { error: 'Please enter a Family Home Invite Code (e.g. MUKHI-2026).' },
          { status: 400 }
        );
      }

      const memberEmailRaw = String(body.email || '')
        .trim()
        .toLowerCase();
      if (!memberEmailRaw) {
        return NextResponse.json(
          { error: 'Please sign in or enter your Gmail address to join the home.' },
          { status: 400 }
        );
      }
      const memberEmail = memberEmailRaw.includes('@')
        ? memberEmailRaw
        : `${memberEmailRaw}@gmail.com`;
      const memberUserId = isValidUuid(body.userId)
        ? String(body.userId)
        : undefined;
      const memberName =
        String(body.name || '').trim() ||
        memberEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

      let targetHome = store.homes.find(
        (h) => h.inviteCode.toUpperCase() === codeInput
      );

      if (!targetHome) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { data: dbHome } = await supabase
            .from('homes')
            .select('id, name, invite_code')
            .ilike('invite_code', codeInput)
            .maybeSingle();

          if (dbHome) {
            targetHome = {
              homeId: dbHome.id || crypto.randomUUID(),
              homeName: dbHome.name,
              inviteCode: dbHome.invite_code.toUpperCase(),
              updatedAt: new Date().toISOString(),
              members: [],
            };
            store.homes.push(targetHome);
          }
        }
      }

      if (!targetHome) {
        return NextResponse.json(
          {
            error: `No Family Home found with invite code "${codeInput}". Check the code or create a new home.`,
          },
          { status: 404 }
        );
      }

      const existingIdx = targetHome.members.findIndex(
        (m) => m.email.toLowerCase() === memberEmail.toLowerCase()
      );

      const joinedMember: FamilyMember = {
        id:
          existingIdx >= 0
            ? targetHome.members[existingIdx].id
            : `member-${Date.now()}`,
        userId:
          memberUserId ||
          (existingIdx >= 0 ? targetHome.members[existingIdx].userId : undefined),
        name: memberName,
        email: memberEmail,
        role:
          existingIdx >= 0
            ? targetHome.members[existingIdx].role
            : 'Family Member',
        status: 'Active',
        invitedAt: new Date().toISOString(),
        avatarInitials: getInitials(memberName, memberEmail),
      };

      const updatedMembers = [...targetHome.members];
      if (existingIdx >= 0) {
        updatedMembers[existingIdx] = joinedMember;
      } else {
        updatedMembers.push(joinedMember);
      }

      const updatedHome: FamilyHomeState = {
        ...targetHome,
        updatedAt: new Date().toISOString(),
        members: updatedMembers,
      };

      const nextHomes = store.homes.map((h) =>
        h.homeId === updatedHome.homeId ? updatedHome : h
      );

      const nextStore: MultiHomeStore = {
        activeHomeId: updatedHome.homeId,
        homes: nextHomes,
      };
      await saveMultiHomeStore(nextStore);

      return NextResponse.json({
        success: true,
        joinedMember,
        home: updatedHome,
        homes: nextStore.homes,
      });
    }

    // 4. Remove a member from active home
    if (body.action === 'remove_member' && body.memberId) {
      const filtered = activeHome.members.filter(
        (m) => m.id !== body.memberId
      );
      const updatedHome: FamilyHomeState = {
        ...activeHome,
        updatedAt: new Date().toISOString(),
        members: filtered.length > 0 ? filtered : activeHome.members,
      };
      const nextStore: MultiHomeStore = {
        ...store,
        homes: store.homes.map((h) =>
          h.homeId === updatedHome.homeId ? updatedHome : h
        ),
      };
      await saveMultiHomeStore(nextStore);
      return NextResponse.json({
        success: true,
        home: updatedHome,
        homes: nextStore.homes,
      });
    }

    // 5. Invite a family member via Gmail to the active home
    const emailRaw = String(body.email || '')
      .trim()
      .toLowerCase();
    const nameRaw = String(body.name || '').trim();
    const roleRaw = sanitizeRole(body.role);

    if (!emailRaw || !emailRaw.includes('@')) {
      return NextResponse.json(
        {
          error:
            'Please enter a valid Gmail address (e.g. family.member@gmail.com).',
        },
        { status: 400 }
      );
    }

    const normalizedEmail =
      emailRaw.endsWith('@gmail.com') || emailRaw.includes('@')
        ? emailRaw
        : `${emailRaw}@gmail.com`;

    const displayName =
      nameRaw ||
      normalizedEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const existingIndex = activeHome.members.findIndex(
      (m) => m.email.toLowerCase() === normalizedEmail.toLowerCase()
    );

    const newMember: FamilyMember = {
      id:
        existingIndex >= 0
          ? activeHome.members[existingIndex].id
          : `member-${Date.now()}`,
      userId:
        existingIndex >= 0 ? activeHome.members[existingIndex].userId : undefined,
      name: displayName,
      email: normalizedEmail,
      role: roleRaw,
      status: body.status || 'Invited via Gmail',
      invitedAt: new Date().toISOString(),
      avatarInitials: getInitials(displayName, normalizedEmail),
    };

    const updatedMembers = [...activeHome.members];
    if (existingIndex >= 0) {
      updatedMembers[existingIndex] = newMember;
    } else {
      updatedMembers.push(newMember);
    }

    const updatedHome: FamilyHomeState = {
      ...activeHome,
      homeName: body.homeName
        ? String(body.homeName).trim()
        : activeHome.homeName,
      updatedAt: new Date().toISOString(),
      members: updatedMembers,
    };

    const nextStore: MultiHomeStore = {
      ...store,
      homes: store.homes.map((h) =>
        h.homeId === updatedHome.homeId ? updatedHome : h
      ),
    };

    await saveMultiHomeStore(nextStore);

    return NextResponse.json({
      success: true,
      invitedMember: newMember,
      home: updatedHome,
      homes: nextStore.homes,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to update family home',
      },
      { status: 500 }
    );
  }
}
