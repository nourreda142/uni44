import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  email: string;
  password: string;
  userCode: string;
  fullName: string;
  role: 'admin' | 'staff' | 'student';
  instructorType?: 'doctor' | 'ta';
  departmentCode?: string;
  groupName?: string;
  sectionName?: string;
}

// Generate secure random password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  const randomValues = new Uint8Array(12);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 12; i++) {
    password += chars[randomValues[i] % chars.length];
  }
  return password;
}

// Demo user definitions - passwords are generated at runtime
function getDemoUsers(): UserData[] {
  return [
    // Admin
    {
      email: 'qw1290@bsnu.edu',
      password: generateSecurePassword(),
      userCode: 'QW1290',
      fullName: 'Admin User',
      role: 'admin',
    },
    // Instructors
    {
      email: 'hh1234@bsnu.edu',
      password: generateSecurePassword(),
      userCode: 'hh1234',
      fullName: 'Dr. Heba Hamdy',
      role: 'staff',
      instructorType: 'doctor',
      departmentCode: 'AI',
    },
    {
      email: 'ag1234@bsnu.edu',
      password: generateSecurePassword(),
      userCode: 'ag1234',
      fullName: 'Dr. Asmaa Goda',
      role: 'staff',
      instructorType: 'ta',
      departmentCode: 'AI',
    },
    // Students
    {
      email: 'nr2345@bsnu.edu',
      password: generateSecurePassword(),
      userCode: 'nr2345',
      fullName: 'Nour Reda Ramadan',
      role: 'student',
      departmentCode: 'AI',
      groupName: 'G2',
      sectionName: 'Sec4',
    },
    {
      email: 'ms1234@bsnu.edu',
      password: generateSecurePassword(),
      userCode: 'ms1234',
      fullName: 'Mahmoud Sayed Radi',
      role: 'student',
      departmentCode: 'AI',
      groupName: 'G2',
      sectionName: 'Sec3',
    },
    {
      email: 'ad2345@bsnu.edu',
      password: generateSecurePassword(),
      userCode: 'ad2345',
      fullName: 'Adham Ahmed Sabry',
      role: 'student',
      departmentCode: 'AI',
      groupName: 'G1',
      sectionName: 'Sec1',
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Check if running in production - disable seeding in production
    const environment = Deno.env.get('ENVIRONMENT') || 'development';
    if (environment === 'production') {
      console.log('Seed function disabled in production environment');
      return new Response(
        JSON.stringify({ error: 'Seed function is disabled in production for security' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Authentication check - require valid admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Unauthorized: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin authentication required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the token and check admin role
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.log('Unauthorized: Invalid token', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using the user_roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.log('Forbidden: User is not admin', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin role required' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin authenticated:', user.email);

    // Generate users with random passwords at runtime
    const users = getDemoUsers();

    // Idempotency check - prevent re-seeding if demo users already exist
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('user_code')
      .in('user_code', users.map(u => u.userCode));

    if (existingProfiles && existingProfiles.length > 0) {
      console.log('Seed already completed - users exist');
      return new Response(
        JSON.stringify({ 
          error: 'Users already seeded',
          existing: existingProfiles.map(p => p.user_code)
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { user: string; status: string; error?: string; generatedPassword?: string }[] = [];

    // Fetch departments, groups, and sections for linking
    const { data: departments } = await supabaseAdmin.from('departments').select('id, code');
    const { data: groups } = await supabaseAdmin.from('groups').select('id, name, department_id');
    const { data: sections } = await supabaseAdmin.from('sections').select('id, name, group_id');

    console.log('Departments:', departments);
    console.log('Groups:', groups);
    console.log('Sections:', sections);

    for (const userData of users) {
      try {
        console.log(`Creating user: ${userData.fullName} (${userData.email})`);

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
        });

        if (authError) {
          console.error(`Auth error for ${userData.email}:`, authError);
          results.push({ user: userData.fullName, status: 'failed', error: authError.message });
          continue;
        }

        const userId = authData.user.id;
        console.log(`Created auth user with ID: ${userId}`);

        // Create profile
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          user_id: userId,
          user_code: userData.userCode,
          full_name: userData.fullName,
          role: userData.role,
        });

        if (profileError) {
          console.error(`Profile error for ${userData.email}:`, profileError);
          results.push({ user: userData.fullName, status: 'partial', error: `Profile: ${profileError.message}` });
          continue;
        }

        // Create user_role entry
        const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
          user_id: userId,
          role: userData.role,
        });

        if (roleError) {
          console.error(`Role error for ${userData.email}:`, roleError);
        }

        // Handle instructor-specific data
        if (userData.role === 'staff' && departments) {
          const dept = departments.find(d => d.code === userData.departmentCode);
          if (dept) {
            const { error: instructorError } = await supabaseAdmin.from('instructors').insert({
              user_id: userId,
              full_name: userData.fullName,
              instructor_type: userData.instructorType || 'doctor',
              title: userData.instructorType === 'ta' ? 'TA' : 'Dr.',
              department_id: dept.id,
            });

            if (instructorError) {
              console.error(`Instructor error for ${userData.email}:`, instructorError);
            }
          }
        }

        // Handle student-specific data
        if (userData.role === 'student' && departments && groups && sections) {
          const dept = departments.find(d => d.code === userData.departmentCode);
          if (dept) {
            const group = groups.find(g => g.name === userData.groupName && g.department_id === dept.id);
            let sectionId = null;
            
            if (group) {
              const section = sections.find(s => s.name === userData.sectionName && s.group_id === group.id);
              sectionId = section?.id;
            }

            const { error: studentError } = await supabaseAdmin.from('students').insert({
              user_id: userId,
              department_id: dept.id,
              group_id: group?.id,
              section_id: sectionId,
            });

            if (studentError) {
              console.error(`Student error for ${userData.email}:`, studentError);
            }
          }
        }

        // Include generated password in response for admin to share with users
        results.push({ 
          user: userData.fullName, 
          status: 'success',
          generatedPassword: userData.password // Only returned to admin who created the users
        });
      } catch (err) {
        console.error(`Error creating user ${userData.fullName}:`, err);
        results.push({ user: userData.fullName, status: 'failed', error: String(err) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      note: 'Save the generated passwords securely - they cannot be retrieved later!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Seed users error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
