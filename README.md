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

## Supabase setup (required for profile pictures + conversations)

In the Supabase SQL editor (on the website), run this SQL against your Postgres database:

```sql
-- 1) Profile avatar support
alter table public.profiles
  add column if not exists avatar_path text;

-- 2) Messages (admin <-> user conversations)
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

-- 3) RLS policies
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

Create Storage buckets:

- `ticket-docs` (already used by ticket uploads)
- `avatars` (used by profile pictures)

## Admin user management (Edge Functions)

The admin UI calls these Edge Functions:

- `admin-reset-password` (already referenced in the app)
- `admin-create-user` (used by “Create new user”)

These must be deployed on Supabase **using the Service Role key** (never expose it in the frontend).

If `admin-create-user` is not deployed yet, the UI will show an error when you try to create a user — the rest of the admin dashboard will still work.

