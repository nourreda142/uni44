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
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StudentProfile {
  id: string;
  userId: string;
  userCode: string;
  fullName: string;
  sectionId: string | null;
  groupId: string | null;
  departmentId: string | null;
  sectionName?: string;
  groupName?: string;
}

interface Section {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
}

interface Group {
  id: string;
  name: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [formData, setFormData] = useState({
    sectionId: '',
    groupId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all student profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      // Fetch students table (links)
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          *,
          section:sections(id, name, group_id, group:groups(id, name)),
          group:groups(id, name)
        `);

      // Fetch sections with groups
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('*, group:groups(id, name)')
        .order('name');

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .order('name');

      if (sectionsData) {
        setSections(sectionsData.map(s => ({
          id: s.id,
          name: s.name,
          groupId: s.group_id,
          groupName: s.group?.name || '',
        })));
      }

      if (groupsData) {
        setGroups(groupsData.map(g => ({
          id: g.id,
          name: g.name,
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
            userId: p.user_id,
            userCode: p.user_code,
            fullName: p.full_name,
            sectionId: studentRecord?.section_id || null,
            groupId: studentRecord?.group_id || null,
            departmentId: studentRecord?.department_id || null,
            sectionName: studentRecord?.section?.name,
            groupName: studentRecord?.section?.group?.name || studentRecord?.group?.name,
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

  const handleEdit = async () => {
    if (!selectedStudent) return;

    setSubmitting(true);
    try {
      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', selectedStudent.userId)
        .maybeSingle();

      const section = sections.find(s => s.id === formData.sectionId);

      if (existingStudent) {
        // Update existing
        const { error } = await supabase
          .from('students')
          .update({
            section_id: formData.sectionId || null,
            group_id: section?.groupId || formData.groupId || null,
          })
          .eq('user_id', selectedStudent.userId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('students')
          .insert({
            user_id: selectedStudent.userId,
            section_id: formData.sectionId || null,
            group_id: section?.groupId || formData.groupId || null,
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Student section assigned successfully',
      });

      setIsEditOpen(false);
      setSelectedStudent(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update student',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (student: StudentProfile) => {
    setSelectedStudent(student);
    setFormData({
      sectionId: student.sectionId || '',
      groupId: student.groupId || '',
    });
    setIsEditOpen(true);
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
              Assign students to sections and groups
            </p>
          </div>
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
                No students found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Code</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          {student.groupName ? (
                            <Badge variant="outline">{student.groupName}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.sectionName ? (
                            <Badge variant="secondary">{student.sectionName}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(student)}
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

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Section</DialogTitle>
              <DialogDescription>
                Assign {selectedStudent?.fullName} to a section
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Input value={`${selectedStudent?.userCode} - ${selectedStudent?.fullName}`} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Select
                  value={formData.sectionId}
                  onValueChange={(value) => setFormData({ ...formData, sectionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.groupName} - {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
