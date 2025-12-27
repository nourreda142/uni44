import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AppRole = 'admin' | 'staff' | 'student';

interface CreateUserRequest {
  userCode: string;
  fullName: string;
  password: string;
  role: AppRole;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRole(value: unknown): value is AppRole {
  return value === 'admin' || value === 'staff' || value === 'student';
}

function normalizeUserCode(input: string) {
  return input.trim().toUpperCase();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') ?? `create_user_${Date.now()}`;
  console.log(`[${requestId}] create-user invoked`, { method: req.method, url: req.url });

  try {
    // Get the authorization header to verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { error: 'Missing authorization header' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing backend env vars`, {
        hasUrl: !!supabaseUrl,
        hasAnon: !!supabaseAnonKey,
        hasService: !!supabaseServiceKey,
      });
      return json(500, { error: 'Backend misconfigured' });
    }

    // Create client with user's token to verify they're logged in
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !currentUser) {
      console.warn(`[${requestId}] Unauthorized user`, { userError });
      return json(401, { error: 'Unauthorized' });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: roleData, error: roleCheckError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleCheckError) {
      console.error(`[${requestId}] Role check error`, roleCheckError);
      return json(500, { error: 'Failed to verify permissions' });
    }

    if (!roleData) {
      return json(403, { error: 'Only admins can create users' });
    }

    // Parse request body safely
    let payload: Partial<CreateUserRequest>;
    try {
      payload = (await req.json()) as Partial<CreateUserRequest>;
    } catch (e) {
      console.warn(`[${requestId}] Invalid JSON body`, e);
      return json(400, { error: 'Invalid JSON body' });
    }

    const rawUserCode = typeof payload.userCode === 'string' ? payload.userCode : '';
    const userCode = normalizeUserCode(rawUserCode);
    const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
    const password = typeof payload.password === 'string' ? payload.password : '';
    const role = payload.role;

    // Server-side validation (critical)
    if (!userCode || !fullName || !password || !role) {
      return json(400, { error: 'Missing required fields' });
    }

    if (userCode.length > 50 || !/^[A-Z0-9]+$/.test(userCode)) {
      return json(400, { error: 'Invalid user code' });
    }

    if (fullName.length > 200) {
      return json(400, { error: 'Full name is too long' });
    }

    if (password.length < 6 || password.length > 100) {
      return json(400, { error: 'Password must be 6-100 characters' });
    }

    if (!isRole(role)) {
      return json(400, { error: 'Invalid role' });
    }

    const email = `${userCode.toLowerCase()}@bsnu.edu`;

    console.log(`[${requestId}] Creating user`, { userCode, role, email });

    // Check if user code already exists (profiles)
    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('user_code', userCode)
      .maybeSingle();

    if (existingProfileError) {
      console.error(`[${requestId}] existing profile check error`, existingProfileError);
      return json(500, { error: 'Failed to validate user code' });
    }

    if (existingProfile) {
      return json(400, { error: 'User code already exists' });
    }

    // Create user in auth system
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`[${requestId}] Auth createUser error`, authError);
      return json(400, { error: authError.message });
    }

    if (!authData.user) {
      return json(500, { error: 'Failed to create user' });
    }

    const newUserId = authData.user.id;

    // Create profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      user_id: newUserId,
      user_code: userCode,
      full_name: fullName,
      role: role,
    });

    if (profileError) {
      console.error(`[${requestId}] Profile insert error`, profileError);
      await adminClient.auth.admin.deleteUser(newUserId);
      return json(500, { error: 'Failed to create profile' });
    }

    // Create user_roles entry (treat as required for security)
    const { error: newRoleError } = await adminClient.from('user_roles').insert({
      user_id: newUserId,
      role: role,
    });

    if (newRoleError) {
      console.error(`[${requestId}] user_roles insert error`, newRoleError);
      await adminClient.from('profiles').delete().eq('user_id', newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return json(500, { error: 'Failed to assign role' });
    }

    // If student, create student record (required if role is student)
    if (role === 'student') {
      const { error: studentError } = await adminClient.from('students').insert({
        user_id: newUserId,
      });

      if (studentError) {
        console.error(`[${requestId}] students insert error`, studentError);
        await adminClient.from('user_roles').delete().eq('user_id', newUserId);
        await adminClient.from('profiles').delete().eq('user_id', newUserId);
        await adminClient.auth.admin.deleteUser(newUserId);
        return json(500, { error: 'Failed to create student record' });
      }
    }

    console.log(`[${requestId}] create-user success`, { userId: newUserId });

    return json(200, {
      success: true,
      userId: newUserId,
      message: `User ${fullName} created successfully`,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return json(500, { error: 'Internal server error' });
  }
});
