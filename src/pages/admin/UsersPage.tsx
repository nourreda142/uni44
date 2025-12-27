import { useState, useEffect } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { userCreateSchema, userUpdateSchema, validateForm } from '@/lib/validation-schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Key,
  Loader2,
  Search,
  Shield,
  GraduationCap,
  UserCog,
  Building2,
} from 'lucide-react';

interface UserProfile {
  id: string;
  userId: string;
  userCode: string;
  fullName: string;
  role: 'admin' | 'staff' | 'student';
  createdAt: string | null;
}

interface StudentAssignment {
  id: string;
  visibleId: string;
  userId: string;
  userCode: string;
  fullName: string;
  sectionId: string | null;
  groupId: string | null;
  departmentId: string | null;
  sectionName?: string;
  groupName?: string;
  departmentName?: string;
}

interface Section {
  id: string;
  name: string;
  groupId: string;
}

interface Group {
  id: string;
  name: string;
  departmentId: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<StudentAssignment[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentAssignment | null>(null);
  const [formData, setFormData] = useState({
    userCode: '',
    fullName: '',
    password: '',
    role: 'student' as 'admin' | 'staff' | 'student',
  });
  const [assignmentData, setAssignmentData] = useState({
    departmentId: '',
    groupId: '',
    sectionId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  // Filter groups based on selected department
  const filteredGroups = assignmentData.departmentId
    ? groups.filter(g => g.departmentId === assignmentData.departmentId)
    : groups;

  // Filter sections based on selected group
  const filteredSections = assignmentData.groupId
    ? sections.filter(s => s.groupId === assignmentData.groupId)
    : [];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      if (usersData) {
        setUsers(usersData.map(u => ({
          id: u.id,
          userId: u.user_id,
          userCode: u.user_code,
          fullName: u.full_name,
          role: u.role as 'admin' | 'staff' | 'student',
          createdAt: u.created_at ?? null,
        })));
      }

      // Fetch departments
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (departmentsData) {
        setDepartments(departmentsData.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
        })));
      }

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .order('name');

      if (groupsData) {
        setGroups(groupsData.map(g => ({
          id: g.id,
          name: g.name,
          departmentId: g.department_id,
        })));
      }

      // Fetch sections
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('*')
        .order('name');

      if (sectionsData) {
        setSections(sectionsData.map(s => ({
          id: s.id,
          name: s.name,
          groupId: s.group_id,
        })));
      }

      // Fetch student profiles with assignments
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          *,
          section:sections(id, name, group_id, group:groups(id, name, department_id)),
          group:groups(id, name, department_id),
          department:departments(id, name, code)
        `);

      if (profilesData) {
        const studentMap = new Map();
        studentsData?.forEach(s => {
          studentMap.set(s.user_id, s);
        });

        setStudents(profilesData.map(p => {
          const studentRecord = studentMap.get(p.user_id);
          
          // Get the correct groupId - either from the student record or from the section
          const sectionGroupId = studentRecord?.section?.group_id;
          const groupId = studentRecord?.group_id || sectionGroupId || null;
          
          // Get the correct departmentId - either from the student record or from the group
          const groupDeptId = studentRecord?.section?.group?.department_id || studentRecord?.group?.department_id;
          const departmentId = studentRecord?.department_id || groupDeptId || null;
          
          return {
            id: p.id,
            visibleId: studentRecord?.id || '',
            userId: p.user_id,
            userCode: p.user_code,
            fullName: p.full_name,
            sectionId: studentRecord?.section_id || null,
            groupId,
            departmentId,
            sectionName: studentRecord?.section?.name,
            groupName: studentRecord?.section?.group?.name || studentRecord?.group?.name,
            departmentName: studentRecord?.department?.name,
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Validate form data
    const validation = validateForm(userCreateSchema, formData);
    if (validation.error) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    const requestId = `create_user_${Date.now()}`;
    console.log(`[${requestId}] create user click`, {
      userCode: validation.data.userCode,
      role: validation.data.role,
    });

    setSubmitting(true);
    try {
      // Get session to ensure we have valid auth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log(`[${requestId}] session`, { hasSession: !!sessionData.session, sessionError });

      if (sessionError || !sessionData.session) {
        throw new Error('You must be logged in to create users');
      }

      // Call backend function to create user (uses admin API)
      const response = await supabase.functions.invoke('create-user', {
        body: {
          userCode: validation.data.userCode,
          fullName: validation.data.fullName,
          password: validation.data.password,
          role: validation.data.role,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'x-request-id': requestId,
        },
      });

      console.log(`[${requestId}] invoke finished`, {
        hasData: !!response.data,
        hasError: !!response.error,
      });

      // Improve error visibility from backend (important for debugging)
      if (response.error) {
        console.error(`[${requestId}] create-user invoke error:`, response.error);

        // If backend returned a non-2xx with JSON body, surface it
        if (response.error instanceof FunctionsHttpError) {
          const body = await response.error.context.json().catch(() => null);
          throw new Error(body?.error || body?.message || response.error.message || 'Failed to create user');
        }

        throw new Error(response.error.message || 'Failed to create user');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Success',
        description: response.data?.message || `User ${validation.data.fullName} created successfully`,
      });

      setIsCreateOpen(false);
      setFormData({ userCode: '', fullName: '', password: '', role: 'student' });
      fetchData();
    } catch (error: any) {
      console.error(`[${requestId}] Error creating user:`, error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;

    // Validate form data
    const validation = validateForm(userUpdateSchema, {
      fullName: formData.fullName,
      role: formData.role,
    });
    if (validation.error) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: validation.data.fullName,
          role: validation.data.role,
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: formData.role })
        .eq('user_id', selectedUser.userId);

      if (roleError) throw roleError;

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      setIsEditOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const email = `${selectedUser.userCode.toLowerCase()}@bsnu.edu`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Email Sent',
        description: `A password reset link has been sent to ${email}`,
      });

      setIsResetOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      // Delete student record if exists
      await supabase
        .from('students')
        .delete()
        .eq('user_id', selectedUser.userId);

      // Delete user_roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.userId);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      setIsDeleteOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedStudent) return;

    setSubmitting(true);
    try {
      // Get the section to derive the group
      const section = sections.find(s => s.id === assignmentData.sectionId);
      // Get the group to derive the department
      const group = groups.find(g => g.id === (section?.groupId || assignmentData.groupId));
      
      const studentData = {
        department_id: group?.departmentId || assignmentData.departmentId || null,
        group_id: section?.groupId || assignmentData.groupId || null,
        section_id: assignmentData.sectionId || null,
      };

      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', selectedStudent.userId)
        .maybeSingle();

      if (existingStudent) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('user_id', selectedStudent.userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .insert({ ...studentData, user_id: selectedStudent.userId });
        if (error) throw error;
      }

      toast({ title: 'Success', description: 'Student assignment updated' });
      setIsAssignOpen(false);
      setSelectedStudent(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save assignment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      userCode: user.userCode,
      fullName: user.fullName,
      password: '',
      role: user.role,
    });
    setIsEditOpen(true);
  };

  const openResetPassword = (user: UserProfile) => {
    setSelectedUser(user);
    setIsResetOpen(true);
  };

  const openDelete = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const openAssign = (student: StudentAssignment) => {
    setSelectedStudent(student);
    
    // Get the correct groupId from section if available
    let groupId = student.groupId || '';
    if (student.sectionId) {
      const section = sections.find(s => s.id === student.sectionId);
      if (section) {
        groupId = section.groupId;
      }
    }
    
    // Get the correct departmentId from group if available
    let departmentId = student.departmentId || '';
    if (groupId && !departmentId) {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        departmentId = group.departmentId;
      }
    }
    
    setAssignmentData({
      departmentId,
      groupId,
      sectionId: student.sectionId || '',
    });
    setIsAssignOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.userCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.userCode.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '—';
    const ms = Date.parse(date);
    if (Number.isNaN(ms)) return '—';
    return new Date(ms).toLocaleDateString();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-destructive"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'staff':
        return <Badge className="bg-primary"><UserCog className="w-3 h-3 mr-1" />Staff</Badge>;
      case 'student':
        return <Badge variant="secondary"><GraduationCap className="w-3 h-3 mr-1" />Student</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Users Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage user accounts, permissions, and student assignments
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="userCode">User Code *</Label>
                  <Input
                    id="userCode"
                    placeholder="e.g., AB1234"
                    value={formData.userCode}
                    onChange={(e) => setFormData({ ...formData, userCode: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used as login ID
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'staff' | 'student') => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="staff">Staff (Doctor/TA)</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all-users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all-users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="student-assignments" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Student Assignments ({students.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>{filteredUsers.length} users</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-9 w-full sm:w-[250px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User Code</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-mono font-medium">
                              {user.userCode}
                            </TableCell>
                            <TableCell>{user.fullName}</TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(user.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(user)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openResetPassword(user)}
                                >
                                  <Key className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openDelete(user)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="student-assignments">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Student Assignments
                    </CardTitle>
                    <CardDescription>
                      Assign students to departments, groups, and sections
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      className="pl-9 w-full sm:w-[250px]"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No students found. Create student users first.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Code</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-mono font-medium">
                              {student.userCode}
                            </TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>
                              {student.departmentName ? (
                                <Badge variant="outline">{student.departmentName}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {student.groupName ? (
                                <Badge variant="secondary">{student.groupName}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {student.sectionName ? (
                                <Badge>{student.sectionName}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAssign(student)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User Code</Label>
                <Input value={formData.userCode} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFullName">Full Name *</Label>
                <Input
                  id="editFullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'staff' | 'student') => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="staff">Staff (Doctor/TA)</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Send password reset email to {selectedUser?.fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                A password reset link will be sent to the user's email address.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Reset Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Student Assignment Dialog */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Student</DialogTitle>
              <DialogDescription>
                Assign {selectedStudent?.fullName} to department, group, and section
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={assignmentData.departmentId}
                  onValueChange={(value) => setAssignmentData({
                    departmentId: value,
                    groupId: '',
                    sectionId: '',
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={assignmentData.groupId}
                  onValueChange={(value) => setAssignmentData({
                    ...assignmentData,
                    groupId: value,
                    sectionId: '',
                  })}
                  disabled={!assignmentData.departmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={assignmentData.sectionId}
                  onValueChange={(value) => setAssignmentData({
                    ...assignmentData,
                    sectionId: value,
                  })}
                  disabled={!assignmentData.groupId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAssignment} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedUser?.fullName}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
