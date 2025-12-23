import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  Pencil,
  Loader2,
  Search,
  Users,
  Plus,
  Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StudentProfile {
  id: string;
  visibleId: string; // from students table
  userId: string;
  userCode: string;
  fullName: string;
  email: string;
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
  groupName: string;
  departmentId: string;
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

interface StudentFormData {
  fullName: string;
  email: string;
  userCode: string;
  departmentId: string;
  groupId: string;
  sectionId: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    fullName: '',
    email: '',
    userCode: '',
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
  const filteredGroups = formData.departmentId
    ? groups.filter(g => g.departmentId === formData.departmentId)
    : groups;

  // Filter sections based on selected group
  const filteredSections = formData.groupId
    ? sections.filter(s => s.groupId === formData.groupId)
    : [];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch departments
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      // Fetch all student profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      // Fetch students table with relations
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          *,
          section:sections(id, name, group_id, group:groups(id, name, department_id)),
          group:groups(id, name, department_id),
          department:departments(id, name, code)
        `);

      // Fetch sections with groups
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('*, group:groups(id, name, department_id)')
        .order('name');

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*, department:departments(id, name)')
        .order('name');

      if (departmentsData) {
        setDepartments(departmentsData.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
        })));
      }

      if (sectionsData) {
        setSections(sectionsData.map(s => ({
          id: s.id,
          name: s.name,
          groupId: s.group_id,
          groupName: s.group?.name || '',
          departmentId: s.group?.department_id || '',
        })));
      }

      if (groupsData) {
        setGroups(groupsData.map(g => ({
          id: g.id,
          name: g.name,
          departmentId: g.department_id,
        })));
      }

      // Merge profiles with student records
      if (profilesData) {
        const studentMap = new Map();
        studentsData?.forEach(s => {
          studentMap.set(s.user_id, s);
        });

        setStudents(profilesData.map(p => {
          const studentRecord = studentMap.get(p.user_id);
          return {
            id: p.id,
            visibleId: studentRecord?.id || '',
            userId: p.user_id,
            userCode: p.user_code,
            fullName: p.full_name,
            email: '', // Will be set from auth if needed
            sectionId: studentRecord?.section_id || null,
            groupId: studentRecord?.group_id || null,
            departmentId: studentRecord?.department_id || null,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingStudent) {
        // Update existing student
        const section = sections.find(s => s.id === formData.sectionId);
        
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            user_code: formData.userCode,
          })
          .eq('id', editingStudent.id);

        if (profileError) throw profileError;

        // Update or insert student record
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', editingStudent.userId)
          .maybeSingle();

        const studentData = {
          department_id: formData.departmentId || null,
          group_id: section?.groupId || formData.groupId || null,
          section_id: formData.sectionId || null,
        };

        if (existingStudent) {
          const { error } = await supabase
            .from('students')
            .update(studentData)
            .eq('user_id', editingStudent.userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('students')
            .insert({ ...studentData, user_id: editingStudent.userId });
          if (error) throw error;
        }

        toast({ title: 'Success', description: 'Student updated successfully' });
      } else {
        // Create new student - first create auth user
        const tempPassword = `Student${Math.random().toString(36).slice(2, 10)}!`;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: tempPassword,
          options: {
            data: {
              full_name: formData.fullName,
              user_code: formData.userCode,
              role: 'student',
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            full_name: formData.fullName,
            user_code: formData.userCode,
            role: 'student',
          });

        if (profileError) throw profileError;

        // Create user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'student',
          });

        if (roleError) throw roleError;

        // Create student record
        const section = sections.find(s => s.id === formData.sectionId);
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: authData.user.id,
            department_id: formData.departmentId || null,
            group_id: section?.groupId || formData.groupId || null,
            section_id: formData.sectionId || null,
          });

        if (studentError) throw studentError;

        toast({
          title: 'Success',
          description: `Student created. Temporary password: ${tempPassword}`,
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save student',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (student: StudentProfile) => {
    if (!confirm(`Are you sure you want to delete "${student.fullName}"?`)) return;

    try {
      // Delete student record
      if (student.visibleId) {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', student.visibleId);
        if (error) throw error;
      }

      // Note: We don't delete the profile or auth user here
      // as that might cause issues. Admin can do that from Supabase dashboard.
      
      toast({ title: 'Success', description: 'Student record deleted' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete student',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (student: StudentProfile) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      email: '',
      userCode: student.userCode,
      departmentId: student.departmentId || '',
      groupId: student.groupId || '',
      sectionId: student.sectionId || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      fullName: '',
      email: '',
      userCode: '',
      departmentId: '',
      groupId: '',
      sectionId: '',
    });
  };

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.userCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-primary" />
              Students Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Register and manage students
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? 'Edit Student' : 'Register New Student'}
                </DialogTitle>
                <DialogDescription>
                  {editingStudent ? 'Update student details and assignments' : 'Add a new student with department, group, and section'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userCode">Student Code *</Label>
                    <Input
                      id="userCode"
                      value={formData.userCode}
                      onChange={(e) => setFormData({ ...formData, userCode: e.target.value })}
                      placeholder="e.g., 20210123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g., Ahmed Mohamed"
                      required
                    />
                  </div>
                </div>

                {!editingStudent && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g., student@university.edu"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      departmentId: value,
                      groupId: '', // Reset group when department changes
                      sectionId: '', // Reset section
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group">Group *</Label>
                    <Select
                      value={formData.groupId}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        groupId: value,
                        sectionId: '', // Reset section when group changes
                      })}
                      disabled={!formData.departmentId}
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
                    <Label htmlFor="section">Section *</Label>
                    <Select
                      value={formData.sectionId}
                      onValueChange={(value) => setFormData({ ...formData, sectionId: value })}
                      disabled={!formData.groupId}
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

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingStudent ? 'Update' : 'Register'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  All Students
                </CardTitle>
                <CardDescription>{students.length} students registered</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
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
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found. Add your first student to get started.
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
                      <TableHead className="w-[100px]">Actions</TableHead>
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(student)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(student)}
                              className="text-destructive hover:text-destructive"
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
      </div>
    </DashboardLayout>
  );
}