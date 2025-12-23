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

const users: UserData[] = [
  // Admin
  {
    email: 'qw1290@bsnu.edu',
    password: 'po1234',
    userCode: 'QW1290',
    fullName: 'Admin User',
    role: 'admin',
  },
  // Instructors
  {
    email: 'hh1234@bsnu.edu',
    password: '123456',
    userCode: 'hh1234',
    fullName: 'Dr. Heba Hamdy',
    role: 'staff',
    instructorType: 'doctor',
    departmentCode: 'AI',
  },
  {
    email: 'ag1234@bsnu.edu',
    password: '098765',
    userCode: 'ag1234',
    fullName: 'Dr. Asmaa Goda',
    role: 'staff',
    instructorType: 'ta',
    departmentCode: 'AI',
  },
  // Students
  {
    email: 'nr2345@bsnu.edu',
    password: '142019',
    userCode: 'nr2345',
    fullName: 'Nour Reda Ramadan',
    role: 'student',
    departmentCode: 'AI',
    groupName: 'G2',
    sectionName: 'Sec4',
  },
  {
    email: 'ms1234@bsnu.edu',
    password: '204192',
    userCode: 'ms1234',
    fullName: 'Mahmoud Sayed Radi',
    role: 'student',
    departmentCode: 'AI',
    groupName: 'G2',
    sectionName: 'Sec3',
  },
  {
    email: 'ad2345@bsnu.edu',
    password: '199192',
    userCode: 'ad2345',
    fullName: 'Adham Ahmed Sabry',
    role: 'student',
    departmentCode: 'AI',
    groupName: 'G1',
    sectionName: 'Sec1',
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: { user: string; status: string; error?: string }[] = [];

    // Fetch departments, groups, and sections for linking
    const { data: departments } = await supabase.from('departments').select('id, code');
    const { data: groups } = await supabase.from('groups').select('id, name, department_id');
    const { data: sections } = await supabase.from('sections').select('id, name, group_id');

    console.log('Departments:', departments);
    console.log('Groups:', groups);
    console.log('Sections:', sections);

    for (const userData of users) {
      try {
        console.log(`Creating user: ${userData.fullName} (${userData.email})`);

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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
        const { error: profileError } = await supabase.from('profiles').insert({
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
        const { error: roleError } = await supabase.from('user_roles').insert({
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
            const { error: instructorError } = await supabase.from('instructors').insert({
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

            const { error: studentError } = await supabase.from('students').insert({
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

        results.push({ user: userData.fullName, status: 'success' });
      } catch (err) {
        console.error(`Error creating user ${userData.fullName}:`, err);
        results.push({ user: userData.fullName, status: 'failed', error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
