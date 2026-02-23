# Supabase Configuration Guide

This document provides a comprehensive guide to the Supabase setup for the Tracking System, including database schemas, SQL migrations, and Edge Functions configuration.

## Table of Contents

1. [Database Schema](#database-schema)
2. [SQL Migrations](#sql-migrations)
3. [Edge Functions](#edge-functions)
4. [Row-Level Security (RLS)](#row-level-security-rls)
5. [Storage Configuration](#storage-configuration)
6. [Realtime Subscriptions](#realtime-subscriptions)

---

## Database Schema

The Tracking System uses the following core tables:

### Profiles Table

The `profiles` table stores user information and is automatically created when a new user signs up via Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references `auth.users(id)` |
| `email` | TEXT | User email address (unique) |
| `full_name` | TEXT | User's full name |
| `role` | TEXT | User role: `user`, `admin`, or `superuser` |
| `avatar_path` | TEXT | Path to user's profile picture in storage |
| `created_at` | TIMESTAMP | Account creation timestamp |

### Tickets Table

The `tickets` table stores fault tracking tickets created by users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `created_by` | UUID | References `profiles(id)` |
| `date_received` | DATE | Date the fault was reported |
| `time_received` | TIME | Time the fault was reported |
| `faults_man` | TEXT | Name of the person reporting the fault |
| `tel_no` | TEXT | Telephone number |
| `order_no` | TEXT | Order number |
| `spv` | TEXT | Supervisor information |
| `status` | TEXT | Ticket status: `open`, `in_progress`, `resolved`, `closed` |
| `created_at` | TIMESTAMP | Ticket creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Audit Logs Table

The `audit_logs` table tracks all system actions for compliance and debugging.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `actor` | UUID | User ID who performed the action |
| `action` | TEXT | Action performed (e.g., `CREATE`, `UPDATE`, `DELETE`) |
| `entity` | TEXT | Entity type (e.g., `ticket`, `user`, `profile`) |
| `entity_id` | UUID | ID of the affected entity |
| `details` | JSONB | Additional action details |
| `created_at` | TIMESTAMP | Action timestamp |

### Ticket Documents Table

The `ticket_documents` table stores metadata for files attached to tickets.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `ticket_id` | UUID | References `tickets(id)` |
| `uploaded_by` | UUID | References `profiles(id)` |
| `file_path` | TEXT | Path in storage bucket |
| `file_name` | TEXT | Original filename |
| `mime_type` | TEXT | File MIME type |
| `created_at` | TIMESTAMP | Upload timestamp |

---

## SQL Migrations

### 1. Create Profiles Table with Trigger

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  avatar_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Public profiles are viewable by everyone
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user creation via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.email LIKE '%@admin.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Create Tickets Table

```sql
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  date_received DATE,
  time_received TIME,
  faults_man TEXT,
  tel_no TEXT,
  order_no TEXT,
  spv TEXT,
  muxy_card_port TEXT,
  strip TEXT,
  adsl_port TEXT,
  exchange TEXT,
  
  -- TRACE/RECOVER/RUN fields
  trace_spv TEXT,
  trace_strip TEXT,
  trace_alcatel_port TEXT,
  trace_remarks TEXT,
  
  recover_spv TEXT,
  recover_strip TEXT,
  recover_alcatel_port TEXT,
  recover_remarks TEXT,
  
  run_spv TEXT,
  run_strip TEXT,
  run_alcatel_port TEXT,
  run_remarks TEXT,
  
  -- Process times (JSONB)
  process_provide_details JSONB,
  process_mdf_in_tray JSONB,
  process_job_execution JSONB,
  process_mdf_log_book JSONB,
  process_records_update JSONB,
  process_records_filing JSONB,
  process_total_time_taken JSONB,
  
  -- Customer info
  customer_name TEXT,
  customer_address TEXT,
  cabinet_name TEXT,
  cabinet_in TEXT,
  cabinet_out TEXT,
  dp_name TEXT,
  dp_pair TEXT,
  
  -- Checkboxes
  transfer BOOLEAN DEFAULT false,
  tr BOOLEAN DEFAULT false,
  adsl BOOLEAN DEFAULT false,
  voice BOOLEAN DEFAULT false,
  
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON tickets
  FOR SELECT USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superuser')
  ));

-- Policy: Users can create tickets
CREATE POLICY "Users can create tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own tickets
CREATE POLICY "Users can update own tickets" ON tickets
  FOR UPDATE USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superuser')
  ));
```

### 3. Create Audit Logs Table

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superuser')
  ));

-- Function to log actions
CREATE OR REPLACE FUNCTION public.log_action(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (actor, action, entity, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Create Ticket Documents Table

```sql
CREATE TABLE IF NOT EXISTS ticket_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on ticket documents
ALTER TABLE ticket_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for their tickets
CREATE POLICY "Users can view ticket documents" ON ticket_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tickets WHERE id = ticket_id AND created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superuser')
  ));

-- Policy: Users can upload documents to their tickets
CREATE POLICY "Users can upload documents" ON ticket_documents
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by AND EXISTS (
    SELECT 1 FROM tickets WHERE id = ticket_id AND created_by = auth.uid()
  ));
```

---

## Edge Functions

Edge Functions are serverless functions deployed on Supabase that handle admin operations. All Edge Functions are written in JavaScript using Deno.

### 1. Admin Create User Function

**File:** `supabase/functions/admin-create-user/index.ts`

This function creates a new user with a specified role. Only accessible to admin users.

```javascript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { email, password, full_name, role } = await req.json()

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create profile with specified role
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: full_name || '',
          role: role || 'user'
        }
      ])

    if (profileError) {
      // Rollback user creation if profile creation fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create profile: ' + profileError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Log the action
    await supabaseClient
      .from('audit_logs')
      .insert([
        {
          action: 'CREATE',
          entity: 'user',
          entity_id: authData.user.id,
          details: { email, role }
        }
      ])

    return new Response(
      JSON.stringify({ 
        message: 'User created successfully',
        user_id: authData.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

### 2. Admin Reset Password Function

**File:** `supabase/functions/admin-reset-password/index.ts`

This function resets a user's password. Only accessible to admin users.

```javascript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, new_password } = await req.json()

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'user_id and new_password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update user password
    const { error } = await supabaseClient.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    )

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Log the action
    await supabaseClient
      .from('audit_logs')
      .insert([
        {
          action: 'UPDATE',
          entity: 'user_password',
          entity_id: user_id,
          details: { action: 'password_reset' }
        }
      ])

    return new Response(
      JSON.stringify({ message: 'Password reset successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

### 3. Handle New User Function

**File:** `supabase/functions/handle-new-user/index.ts`

This function is triggered automatically when a new user signs up via Auth.

```javascript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()
    
    // Determine role based on email domain or other criteria
    let role = 'user'
    if (record.email.endsWith('@admin.com')) {
      role = 'admin'
    }

    // Create profile entry
    const { error } = await supabaseClient
      .from('profiles')
      .insert([
        { 
          id: record.id, 
          email: record.email, 
          full_name: record.raw_user_meta_data?.full_name || '',
          role: role
        }
      ])

    if (error) {
      throw error
    }

    // Log the action
    await supabaseClient
      .from('audit_logs')
      .insert([
        {
          action: 'CREATE',
          entity: 'user',
          entity_id: record.id,
          details: { email: record.email, role }
        }
      ])

    return new Response(
      JSON.stringify({ message: 'Profile created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

## Row-Level Security (RLS)

Row-Level Security ensures that users can only access data they are authorized to view. The system implements the following RLS policies:

### Profiles Table

- **SELECT:** All profiles are publicly viewable (for user lookups)
- **INSERT:** Users can only insert their own profile
- **UPDATE:** Users can only update their own profile

### Tickets Table

- **SELECT:** Users can view their own tickets; admins can view all tickets
- **INSERT:** Users can create tickets
- **UPDATE:** Users can update their own tickets; admins can update any ticket

### Audit Logs Table

- **SELECT:** Only admins and superusers can view audit logs
- **INSERT:** System can insert logs (via Edge Functions)

### Ticket Documents Table

- **SELECT:** Users can view documents for their own tickets; admins can view all
- **INSERT:** Users can upload documents to their own tickets

---

## Storage Configuration

The system uses two storage buckets in Supabase Storage:

### 1. Avatars Bucket

- **Purpose:** Store user profile pictures
- **Path Format:** `{user_id}/{timestamp}.{extension}`
- **Access:** Public read, authenticated write
- **Max Size:** 5MB per file

### 2. Ticket Documents Bucket

- **Purpose:** Store files attached to tickets
- **Path Format:** `{user_id}/{ticket_id}/{timestamp}-{filename}`
- **Access:** Authenticated read/write
- **Max Size:** 50MB per file

**Storage Policies:**

```sql
-- Avatars bucket policies
CREATE POLICY "Public avatars are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Ticket documents bucket policies
CREATE POLICY "Users can upload ticket documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ticket-docs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view ticket documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ticket-docs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Realtime Subscriptions

The system uses Supabase Realtime to provide live updates for:

### Ticket Updates

```javascript
// Subscribe to ticket changes
const channel = supabase
  .channel('tickets')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tickets' },
    (payload) => {
      console.log('Ticket changed:', payload)
    }
  )
  .subscribe()
```

### Profile Updates

```javascript
// Subscribe to profile changes (for user management)
const channel = supabase
  .channel('profiles')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'profiles' },
    (payload) => {
      console.log('Profile changed:', payload)
    }
  )
  .subscribe()
```

### Audit Logs

```javascript
// Subscribe to new audit logs (admin only)
const channel = supabase
  .channel('audit_logs')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'audit_logs' },
    (payload) => {
      console.log('New audit log:', payload)
    }
  )
  .subscribe()
```

---

## Deployment Checklist

Before deploying to production, ensure:

- [ ] All SQL migrations have been executed
- [ ] Edge Functions are deployed and tested
- [ ] RLS policies are enabled on all tables
- [ ] Storage buckets are created and policies are configured
- [ ] Environment variables are set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Realtime subscriptions are working
- [ ] Backup strategy is in place
- [ ] SSL is enabled for all connections

---

## Troubleshooting

### Common Issues

**Issue:** "Permission denied" errors when accessing tables

**Solution:** Ensure RLS policies are correctly configured and the user has the appropriate role.

**Issue:** Edge Functions returning 404

**Solution:** Verify that the Edge Function is deployed and the function name matches the endpoint URL.

**Issue:** Storage uploads failing

**Solution:** Check that the bucket exists, policies are configured, and the user has write permissions.

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Deno Runtime Documentation](https://deno.land/manual)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
