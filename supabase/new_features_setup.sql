-- 1. Update tickets table to match the new single-form interface
-- If the table doesn't exist, create it. If it does, add missing columns.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
        CREATE TABLE public.tickets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            date DATE DEFAULT CURRENT_DATE,
            client_number TEXT,
            order_number TEXT,
            olt_exchange TEXT,
            job_received_by TEXT,
            received_from TEXT,
            done_by TEXT,
            faults_type TEXT,
            installation_migration TEXT,
            time_taken TEXT
        );
    ELSE
        -- Add missing columns to existing tickets table
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS username TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS order_number TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS olt_exchange TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS job_received_by TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS received_from TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS done_by TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS faults_type TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS installation_migration TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS time_taken TEXT;
    END IF;
END $$;

-- 2. Create Exports Tracking Table
CREATE TABLE IF NOT EXISTS public.report_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type TEXT DEFAULT 'PDF',
    filters JSONB,
    file_name TEXT
);

-- 3. Enable RLS on new table
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for report_exports
CREATE POLICY "Users can view their own exports" ON public.report_exports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all exports" ON public.report_exports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser')
        )
    );

CREATE POLICY "Users can log their own exports" ON public.report_exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Useful Queries for Filtering (Examples)

-- Filter tickets by date range
-- SELECT * FROM tickets WHERE date >= '2024-01-01' AND date <= '2024-12-31';

-- Search tickets by username
-- SELECT * FROM tickets WHERE username ILIKE '%search_term%';

-- Admin query for PDF extraction (joining with profiles)
-- SELECT t.*, p.full_name, p.email 
-- FROM tickets t 
-- JOIN profiles p ON t.created_by = p.id 
-- WHERE p.full_name ILIKE '%user_name%' 
-- AND t.date BETWEEN '2024-01-01' AND '2024-12-31';

-- 6. Audit Log for User Management Actions (if not already present)
-- Assuming audit_logs table exists from previous analysis
-- INSERT INTO audit_logs (actor, action, entity, entity_id) VALUES (auth.uid(), 'UPDATE_USER_ROLE', 'profiles', 'target_user_id');
