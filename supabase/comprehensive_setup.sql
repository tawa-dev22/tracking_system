-- ============================================================================
-- COMPREHENSIVE DATABASE SETUP FOR TRACKING SYSTEM
-- ============================================================================
-- This script includes all necessary tables, policies, and queries
-- for the ticket tracking system with reports and admin management.
-- ============================================================================

-- 1. TICKETS TABLE (Core)
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
        CREATE TABLE public.tickets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            
            -- Ticket Fields
            date DATE DEFAULT CURRENT_DATE,
            username TEXT NOT NULL,
            order_number TEXT NOT NULL,
            olt_exchange TEXT NOT NULL,
            job_received_by TEXT NOT NULL,
            received_from TEXT NOT NULL,
            done_by TEXT NOT NULL,
            faults_type TEXT NOT NULL,
            installation_migration TEXT NOT NULL,
            time_taken TEXT NOT NULL,
            
            -- Legacy fields (for backward compatibility)
            customer_name TEXT,
            customer_address TEXT,
            order_no TEXT,
            tel_no TEXT,
            faults_man TEXT,
            date_received DATE,
            time_received TIME,
            exchange TEXT,
            spv TEXT,
            cabinet_name TEXT,
            dp_name TEXT,
            
            -- Additional metadata
            status TEXT DEFAULT 'submitted',
            notes TEXT
        );
        
        CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
        CREATE INDEX idx_tickets_date ON public.tickets(date);
        CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
        CREATE INDEX idx_tickets_username ON public.tickets(username);
        CREATE INDEX idx_tickets_order_number ON public.tickets(order_number);
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
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Create indexes if they don't exist
        CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
        CREATE INDEX IF NOT EXISTS idx_tickets_date ON public.tickets(date);
        CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);
        CREATE INDEX IF NOT EXISTS idx_tickets_username ON public.tickets(username);
        CREATE INDEX IF NOT EXISTS idx_tickets_order_number ON public.tickets(order_number);
    END IF;
END $$;

-- 2. REPORT EXPORTS TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    report_type TEXT DEFAULT 'PDF',
    filters JSONB,
    record_count INTEGER DEFAULT 0,
    file_name TEXT,
    file_size INTEGER,
    export_status TEXT DEFAULT 'completed'
);

CREATE INDEX IF NOT EXISTS idx_report_exports_user_id ON public.report_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON public.report_exports(created_at);
CREATE INDEX IF NOT EXISTS idx_report_exports_exported_by ON public.report_exports(exported_by);

-- 3. TICKET DOCUMENTS TABLE (for file uploads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ticket_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ticket_documents_ticket_id ON public.ticket_documents(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_documents_uploaded_by ON public.ticket_documents(uploaded_by);

-- 4. AUDIT LOGS TABLE (if not already present)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. ROW LEVEL SECURITY POLICIES FOR TICKETS
-- ============================================================================

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING (auth.uid() = created_by);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets" ON public.tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser')
        )
    );

-- Users can insert their own tickets
CREATE POLICY "Users can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Admins can update any ticket
CREATE POLICY "Admins can update tickets" ON public.tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser')
        )
    );

-- 7. ROW LEVEL SECURITY POLICIES FOR REPORT EXPORTS
-- ============================================================================

-- Users can view their own exports
CREATE POLICY "Users can view own exports" ON public.report_exports
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all exports
CREATE POLICY "Admins can view all exports" ON public.report_exports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser')
        )
    );

-- Users can log their own exports
CREATE POLICY "Users can create exports" ON public.report_exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. ROW LEVEL SECURITY POLICIES FOR TICKET DOCUMENTS
-- ============================================================================

-- Users can view documents for their own tickets
CREATE POLICY "Users can view own documents" ON public.ticket_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE tickets.id = ticket_documents.ticket_id AND tickets.created_by = auth.uid()
        )
    );

-- Admins can view all documents
CREATE POLICY "Admins can view all documents" ON public.ticket_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser')
        )
    );

-- 9. ROW LEVEL SECURITY POLICIES FOR AUDIT LOGS
-- ============================================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superuser')
        )
    );

-- ============================================================================
-- USEFUL QUERIES FOR COMMON OPERATIONS
-- ============================================================================

-- 1. SEARCH TICKETS BY USERNAME
-- SELECT * FROM tickets 
-- WHERE username ILIKE '%search_term%' 
-- ORDER BY created_at DESC;

-- 2. FILTER TICKETS BY DATE RANGE
-- SELECT * FROM tickets 
-- WHERE date >= '2024-01-01' AND date <= '2024-12-31' 
-- ORDER BY date DESC;

-- 3. SEARCH BY USERNAME AND DATE RANGE (Combined)
-- SELECT * FROM tickets 
-- WHERE username ILIKE '%search_term%' 
-- AND date BETWEEN '2024-01-01' AND '2024-12-31'
-- ORDER BY created_at DESC;

-- 4. ADMIN QUERY: GET ALL TICKETS WITH USER INFO
-- SELECT 
--     t.id,
--     t.date,
--     t.username,
--     t.order_number,
--     t.olt_exchange,
--     t.faults_type,
--     t.done_by,
--     t.time_taken,
--     p.full_name as created_by_name,
--     p.email as created_by_email,
--     t.created_at
-- FROM tickets t
-- LEFT JOIN profiles p ON t.created_by = p.id
-- ORDER BY t.created_at DESC;

-- 5. EXPORT QUERY: FILTERED REPORT DATA
-- SELECT 
--     t.username,
--     t.date,
--     t.order_number,
--     t.olt_exchange,
--     t.faults_type,
--     t.time_taken,
--     t.done_by,
--     p.full_name,
--     p.email
-- FROM tickets t
-- LEFT JOIN profiles p ON t.created_by = p.id
-- WHERE p.full_name ILIKE '%user_name%' 
-- AND t.date BETWEEN '2024-01-01' AND '2024-12-31'
-- ORDER BY t.date DESC;

-- 6. COUNT TICKETS BY USER
-- SELECT 
--     p.full_name,
--     COUNT(t.id) as ticket_count
-- FROM tickets t
-- LEFT JOIN profiles p ON t.created_by = p.id
-- GROUP BY p.id, p.full_name
-- ORDER BY ticket_count DESC;

-- 7. COUNT TICKETS BY FAULT TYPE
-- SELECT 
--     faults_type,
--     COUNT(*) as count
-- FROM tickets
-- GROUP BY faults_type
-- ORDER BY count DESC;

-- 8. RECENT TICKET ACTIVITY (Last 30 days)
-- SELECT 
--     t.id,
--     t.date,
--     t.username,
--     t.order_number,
--     p.full_name,
--     t.created_at
-- FROM tickets t
-- LEFT JOIN profiles p ON t.created_by = p.id
-- WHERE t.created_at >= NOW() - INTERVAL '30 days'
-- ORDER BY t.created_at DESC;

-- 9. ADMIN AUDIT: USER MANAGEMENT ACTIONS
-- SELECT 
--     a.id,
--     a.created_at,
--     a.action,
--     a.entity,
--     a.entity_id,
--     p.full_name as actor_name
-- FROM audit_logs a
-- LEFT JOIN profiles p ON a.actor = p.id
-- WHERE a.action IN ('UPDATE_USER_ROLE', 'CREATE_USER', 'DELETE_USER', 'RESET_PASSWORD')
-- ORDER BY a.created_at DESC;

-- 10. ADMIN PERMISSIONS CHECK
-- SELECT 
--     id,
--     full_name,
--     email,
--     role,
--     created_at
-- FROM profiles
-- WHERE role IN ('admin', 'superuser')
-- ORDER BY created_at DESC;

-- ============================================================================
-- FUNCTION: Update ticket updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
DROP TRIGGER IF EXISTS trigger_update_ticket_updated_at ON public.tickets;
CREATE TRIGGER trigger_update_ticket_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ticket_updated_at();

-- ============================================================================
-- FUNCTION: Log audit events
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_actor UUID,
    p_action TEXT,
    p_entity TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.audit_logs (actor, action, entity, entity_id, changes)
    VALUES (p_actor, p_action, p_entity, p_entity_id, p_changes);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF SETUP SCRIPT
-- ============================================================================
