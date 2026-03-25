import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.46.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const byteHeader = req.headers.get('content-length');
    if (byteHeader === '0' || !req.body) {
       return new Response(JSON.stringify({ error: 'Empty body' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
       });
    }

    const body = await req.json();
    console.log("Received action:", body.action);
    const { action, userData } = body;

    if (action === 'create_user') {
      const { email, password, full_name, company_id } = userData;
      
      console.log("Creating user format for:", email);
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (authError) {
        console.error("Auth Error:", authError);
        throw authError; // We will catch it below
      }

      console.log("User created in Auth, inserting profile for:", authData.user.id);
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email,
          full_name,
          company_id,
          role: 'user'
        }]);

      if (profileError) {
        console.error("Profile Error:", profileError);
        // Note: if there's a trigger that creates the profile automatically,
        // this might fail with a unique constraint violation.
        // We log it so we can see what's happening.
        throw profileError;
      }

      return new Response(JSON.stringify({ success: true, user: authData.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (action === 'update_password') {
      const { userId, newPassword } = userData;
      const { error } = await supabaseClient.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (action === 'toggle_block') {
      const { userId, isBlocked } = userData;
      const { error } = await supabaseClient
        .from('profiles')
        .update({ is_blocked: isBlocked })
        .eq('id', userId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Action not supported');
  } catch (error: any) {
    console.error("Manage-Users Catch Error:", error);
    return new Response(JSON.stringify({ error: error.message || error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
