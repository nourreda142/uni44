import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { exportTimetableToPDF } from '@/lib/pdf-export';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  FileDown,
  Loader2,
  User,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { TimetableEntry, Timetable, Section, Instructor } from '@/lib/types';

export default function MyTimetable() {
  const { user } = useAuth();
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<string>('');
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentSection, setStudentSection] = useState<Section | null>(null);
  const [groupSectionIds, setGroupSectionIds] = useState<string[]>([]);
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedTimetable) {
      fetchEntries(selectedTimetable);
    }
  }, [selectedTimetable]);

  const fetchInitialData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch approved timetables
      const { data: timetablesData } = await supabase
        .from('timetables')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (timetablesData) {
        setTimetables(timetablesData.map(t => ({
          id: t.id,
          name: t.name,
          departmentId: t.department_id,
          fitnessScore: t.fitness_score ? parseFloat(String(t.fitness_score)) : undefined,
          generationCount: t.generation_count || 0,
          isApproved: t.is_approved || false,
          createdBy: t.created_by,
          createdAt: t.created_at,
        })));

        if (timetablesData.length > 0) {
          setSelectedTimetable(timetablesData[0].id);
        }
      }

      // If student, fetch their section
      if (user.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select(`
            *,
            section:sections(*, group:groups(*)),
            group:groups(*)
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (studentData) {
          // Get all sections in the student's group to show group lectures
          if (studentData.group_id) {
            const { data: groupSections } = await supabase
              .from('sections')
              .select('id')
              .eq('group_id', studentData.group_id);
            
            if (groupSections) {
              setGroupSectionIds(groupSections.map(s => s.id));
            }
          }

          if (studentData.section) {
            setStudentSection({
              id: studentData.section.id,
              name: studentData.section.name,
              groupId: studentData.section.group_id,
              group: studentData.section.group ? {
                id: studentData.section.group.id,
                name: studentData.section.group.name,
                departmentId: studentData.section.group.department_id,
              } : undefined,
            });
          }
        }
      }

      // If staff, fetch their instructor record
      if (user.role === 'staff') {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (instructorData) {
          setInstructorId(instructorData.id);
        }
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

  const fetchEntries = async (timetableId: string) => {
    try {
      const { data: entriesData } = await supabase
        .from('timetable_entries')
        .select(`
          *,
          course:courses(*),
          instructor:instructors(*),
          section:sections(*, group:groups(*)),
          room:rooms(*),
          time_slot:time_slots(*)
        `)
        .eq('timetable_id', timetableId);

      if (entriesData) {
        setEntries(entriesData.map(e => ({
          id: e.id,
          timetableId: e.timetable_id,
          courseId: e.course_id,
          instructorId: e.instructor_id,
          sectionId: e.section_id,
          roomId: e.room_id,
          timeSlotId: e.time_slot_id,
          course: e.course ? {
            id: e.course.id,
            name: e.course.name,
            code: e.course.code,
            departmentId: e.course.department_id,
          } : undefined,
          instructor: e.instructor ? {
            id: e.instructor.id,
            fullName: e.instructor.full_name,
            title: e.instructor.title || 'Dr.',
            instructorType: e.instructor.instructor_type as 'doctor' | 'teaching_assistant',
          } : undefined,
          section: e.section ? {
            id: e.section.id,
            name: e.section.name,
            groupId: e.section.group_id,
            group: e.section.group ? {
              id: e.section.group.id,
              name: e.section.group.name,
              departmentId: e.section.group.department_id,
            } : undefined,
          } : undefined,
          room: e.room ? {
            id: e.room.id,
            name: e.room.name,
            capacity: e.room.capacity,
            roomType: e.room.room_type as 'lecture_hall' | 'lab' | 'seminar_room',
          } : undefined,
          timeSlot: e.time_slot ? {
            id: e.time_slot.id,
            day: e.time_slot.day,
            startTime: e.time_slot.start_time,
            endTime: e.time_slot.end_time,
            slotOrder: e.time_slot.slot_order,
          } : undefined,
        })));
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  // Filter entries based on user role
  const filteredEntries = user?.role === 'student' && studentSection
    ? entries.filter(e => e.sectionId === studentSection.id || groupSectionIds.includes(e.sectionId))
    : user?.role === 'staff' && instructorId
    ? entries.filter(e => e.instructorId === instructorId)
    : entries;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              My Timetable
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'student' 
                ? 'Your personalized class schedule'
                : 'Your teaching schedule'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                const currentTimetable = timetables.find(t => t.id === selectedTimetable);
                exportTimetableToPDF({
                  title: currentTimetable?.name || 'My Timetable',
                  subtitle: user?.fullName,
                  entries: filteredEntries,
                });
              }}
              disabled={filteredEntries.length === 0}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* User Info Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{user?.fullName}</span>
              </div>
              <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
              {user?.role === 'student' && studentSection && (
                <>
                  <Badge variant="outline">
                    {studentSection.group?.name}
                  </Badge>
                  <Badge variant="outline">
                    {studentSection.name}
                  </Badge>
                </>
              )}
              {timetables.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Schedule:</span>
                  <Select
                    value={selectedTimetable}
                    onValueChange={setSelectedTimetable}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select timetable" />
                    </SelectTrigger>
                    <SelectContent>
                      {timetables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timetable */}
        {timetables.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No approved timetables</h3>
                <p className="text-muted-foreground">
                  There are no approved timetables available yet. Please check back later.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : user?.role === 'staff' && !instructorId ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-warning mb-4" />
                <h3 className="text-lg font-medium mb-2">Instructor record not linked</h3>
                <p className="text-muted-foreground">
                  Your account is not linked to an instructor record. Please contact your administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : user?.role === 'student' && !studentSection ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-warning mb-4" />
                <h3 className="text-lg font-medium mb-2">Section not assigned</h3>
                <p className="text-muted-foreground">
                  You haven't been assigned to a section yet. Please contact your administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                {filteredEntries.length} lectures scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No lectures found for your schedule.
                </div>
              ) : (
                <TimetableGrid 
                  entries={entries} 
                  filterSection={user?.role === 'student' ? studentSection?.id : undefined}
                  filterInstructor={user?.role === 'staff' ? instructorId || undefined : undefined}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
