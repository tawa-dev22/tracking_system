# Fault Tracking System

React (Vite) + Tailwind + Supabase (Auth, Postgres, Storage, Realtime).

## Quick start

1. Install deps:

```bash
npm install
```

2. Create `.env` in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run:

```bash
npm run dev
```

---

## Supabase Setup (REQUIRED)

Run all the SQL below in the **Supabase SQL Editor** (on the Supabase website).

### 1. Create / update the `profiles` table

If you already have a `profiles` table, this will add the missing columns. If not, it creates it:

```sql
-- Create profiles table if it doesn't exist
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  email text,
  full_name text,
  role text default 'user',
  avatar_path text
);

-- Add columns if they don't exist (safe to run multiple times)
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists created_at timestamptz default now();
```

### 2. Sync existing auth.users to profiles (IMPORTANT!)

This copies any existing users from `auth.users` into `profiles` so they appear in the dashboard and can login:

```sql
-- Insert missing profiles for existing auth users
insert into public.profiles (id, email, full_name, role, created_at)
select 
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  coalesce(u.raw_user_meta_data->>'role', 'user'),
  u.created_at
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- Update existing profiles with email if missing
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');
```

### 3. Auto-create profile on new user signup (trigger)

This ensures every new user automatically gets a `profiles` row:

```sql
-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4. RLS policies for profiles (so admins can see all users)

```sql
-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy if not exists "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

-- Admins/superusers can read all profiles
create policy if not exists "Admins can read all profiles"
on public.profiles for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (role = 'admin' or role = 'superuser')
  )
);

-- Users can update their own profile
create policy if not exists "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admins can update any profile
create policy if not exists "Admins can update any profile"
on public.profiles for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and (role = 'admin' or role = 'superuser')
  )
);
```

### 5. Messages table (for admin <-> user chat)

```sql
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz null
);

create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_recipient_idx on public.messages(recipient_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);

alter table public.messages enable row level security;

create policy if not exists "messages_read_own"
on public.messages for select
using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy if not exists "messages_insert_self"
on public.messages for insert
with check (auth.uid() = sender_id);

create policy if not exists "messages_update_recipient"
on public.messages for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);
```

---

## Storage Buckets

In Supabase → **Storage**, create these buckets:

1. **`ticket-docs`** — for uploaded ticket documents
2. **`avatars`** — for profile pictures

Make them **public** (simplest) or configure RLS as needed.

---

## Realtime

In Supabase → **Database → Replication → Realtime**, enable Realtime for these tables:

- `tickets`
- `profiles`
- `audit_logs`
- `messages`

This allows the dashboard to update live when new tickets/users/messages arrive.

---

## Auth Settings

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: Your deployed URL (e.g. `https://your-app.netlify.app`)
- **Redirect URLs**: Add:
  - `https://your-app.netlify.app/change-password`
  - `http://localhost:5173/change-password` (for local dev)

---

## Edge Functions (for admin user management)

The admin UI calls these Edge Functions. Deploy them in Supabase.

### `admin-create-user`

Create file: `supabase/functions/admin-create-user/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin/superuser
    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const role = String(callerProfile?.role || "").toLowerCase();
    if (role !== "admin" && role !== "superuser") {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { email, password, full_name, role: newUserRole } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to create user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "", role: newUserRole || "user" },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The trigger should auto-create the profile, but let's ensure it
    await adminClient.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: full_name || "",
      role: newUserRole || "user",
    });

    return new Response(JSON.stringify({ success: true, user_id: data.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### `admin-reset-password`

Create file: `supabase/functions/admin-reset-password/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin/superuser
    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const role = String(callerProfile?.role || "").toLowerCase();
    if (role !== "admin" && role !== "superuser") {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: "user_id and new_password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Deploy Edge Functions

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-reset-password
```

---

## Summary

After running all the SQL above:
- Existing users in `auth.users` will be copied to `profiles` and visible in the dashboard
- New signups will automatically get a `profiles` row
- Admins can see all users
- Chat messages work between admin and users
- Profile pictures can be uploaded

The app is now ready for deployment!