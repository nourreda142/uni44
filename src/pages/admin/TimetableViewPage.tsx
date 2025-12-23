import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import {
  Calendar,
  ArrowLeft,
  Check,
  FileDown,
  Loader2,
  Target,
  Clock,
} from 'lucide-react';
import { Timetable, TimetableEntry, Course, Instructor, Section, Room, TimeSlot } from '@/lib/types';

export default function TimetableViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchTimetable(id);
    }
  }, [id]);

  const fetchTimetable = async (timetableId: string) => {
    setLoading(true);
    try {
      const [timetableRes, entriesRes] = await Promise.all([
        supabase.from('timetables').select('*').eq('id', timetableId).maybeSingle(),
        supabase.from('timetable_entries').select(`
          *,
          course:courses(*),
          instructor:instructors(*),
          section:sections(*, group:groups(*)),
          room:rooms(*),
          time_slot:time_slots(*)
        `).eq('timetable_id', timetableId),
      ]);

      if (timetableRes.data) {
        setTimetable({
          id: timetableRes.data.id,
          name: timetableRes.data.name,
          departmentId: timetableRes.data.department_id,
          fitnessScore: timetableRes.data.fitness_score ? parseFloat(String(timetableRes.data.fitness_score)) : undefined,
          generationCount: timetableRes.data.generation_count || 0,
          isApproved: timetableRes.data.is_approved || false,
          createdBy: timetableRes.data.created_by,
          createdAt: timetableRes.data.created_at,
        });
      }

      if (entriesRes.data) {
        setEntries(entriesRes.data.map(e => ({
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
      console.error('Error fetching timetable:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timetable',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!timetable) return;

    try {
      const { error } = await supabase
        .from('timetables')
        .update({ is_approved: true })
        .eq('id', timetable.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Timetable approved successfully' });
      setTimetable({ ...timetable, isApproved: true });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve timetable',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!timetable) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-medium mb-2">Timetable not found</h2>
          <Button variant="outline" onClick={() => navigate('/admin/timetables')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Timetables
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/timetables')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold">{timetable.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {timetable.isApproved ? (
                  <Badge variant="default" className="bg-success">
                    <Check className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Fitness: {timetable.fitnessScore?.toFixed(2) || '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!timetable.isApproved && (
              <Button variant="success" onClick={handleApprove}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            <Button variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Timetable Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Weekly Schedule
            </CardTitle>
            <CardDescription>
              {entries.length} lectures scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TimetableGrid entries={entries} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
