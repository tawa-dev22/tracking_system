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
    
    // Determine role based on email or other criteria
    // For example, first user or specific domain could be admin
    let role = 'user'
    if (record.email.endsWith('@admin.com')) {
      role = 'admin'
    }

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

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Profile created' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
