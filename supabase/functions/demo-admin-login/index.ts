import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMO_ADMIN_EMAIL = 'demo.admin@smartnotice.local';
const DEMO_ADMIN_PASSWORD = 'DemoAdmin@123';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: usersPage, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;

    let userId = usersPage.users.find((user) => user.email === DEMO_ADMIN_EMAIL)?.id;

    if (!userId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: DEMO_ADMIN_EMAIL,
        password: DEMO_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { name: 'Demo Administrator', role: 'student' },
      });

      if (createError) throw createError;
      userId = created.user?.id;
    } else {
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: DEMO_ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (updateError) throw updateError;
    }

    await admin.from('profiles').upsert({
      id: userId,
      name: 'Demo Administrator',
      email: DEMO_ADMIN_EMAIL,
      department: 'CSE',
    });

    const { data: existingRole } = await admin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await admin.from('user_roles').insert({ user_id: userId, role: 'admin' });
      if (roleError) throw roleError;
    }

    return new Response(JSON.stringify({ email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
