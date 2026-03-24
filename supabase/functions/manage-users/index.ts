import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { action, userData } = await req.json()

    if (action === 'create_user') {
      const { email, password, full_name, company_id } = userData
      
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (authError) throw authError

      // 2. Crear perfil en la tabla de perfiles
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email,
          full_name,
          company_id,
          role: 'user'
        }])

      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'update_password') {
      const { userId, newPassword } = userData
      const { error } = await supabaseClient.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'toggle_block') {
      const { userId, isBlocked } = userData
      const { error } = await supabaseClient
        .from('profiles')
        .update({ is_blocked: isBlocked })
        .eq('id', userId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Action not supported')
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
