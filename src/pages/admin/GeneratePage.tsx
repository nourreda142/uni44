import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Play,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Dna,
  Target,
  Zap,
} from 'lucide-react';
import { runGeneticAlgorithm, defaultGAConfig, InstructorAvailability } from '@/lib/genetic-algorithm';
import { Course, Section, Room, TimeSlot, Department, GAConfig, ConflictInfo } from '@/lib/types';

export default function GeneratePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [instructorAvailability, setInstructorAvailability] = useState<InstructorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    fitness: number;
    conflicts: ConflictInfo[];
    generations: number;
  } | null>(null);
  const [config, setConfig] = useState<GAConfig>(defaultGAConfig);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timetableName, setTimetableName] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentData(selectedDepartment);
    }
  }, [selectedDepartment]);

  const fetchInitialData = async () => {
    try {
      const [deptRes, roomsRes, timeSlotsRes, availabilityRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('rooms').select('*').order('name'),
        supabase.from('time_slots').select('*').order('slot_order'),
        supabase.from('instructor_availability').select('*'),
      ]);

      if (deptRes.data) {
        setDepartments(deptRes.data.map(d => ({
          id: d.id,
          name: d.name,
          code: d.code,
        })));
        if (deptRes.data.length > 0) {
          setSelectedDepartment(deptRes.data[0].id);
        }
      }

      if (roomsRes.data) {
        setRooms(roomsRes.data.map(r => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity,
          roomType: r.room_type as 'lecture_hall' | 'lab' | 'seminar_room',
        })));
      }

      if (timeSlotsRes.data) {
        setTimeSlots(timeSlotsRes.data.map(ts => ({
          id: ts.id,
          day: ts.day,
          startTime: ts.start_time,
          endTime: ts.end_time,
          slotOrder: ts.slot_order,
        })));
      }

      if (availabilityRes.data) {
        setInstructorAvailability(availabilityRes.data.map(a => ({
          instructorId: a.instructor_id,
          timeSlotId: a.time_slot_id,
          isAvailable: a.is_available,
          preferenceLevel: a.preference_level || 1,
        })));
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

  const fetchDepartmentData = async (deptId: string) => {
    try {
      const [coursesRes, groupsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('department_id', deptId),
        supabase.from('groups').select(`
          id, name, department_id,
          sections(id, name, group_id)
        `).eq('department_id', deptId),
      ]);

      if (coursesRes.data) {
        setCourses(coursesRes.data.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          departmentId: c.department_id,
          doctorId: c.doctor_id,
          taId: c.ta_id,
        })));
      }

      if (groupsRes.data) {
        const allSections: Section[] = [];
        groupsRes.data.forEach(group => {
          if (group.sections) {
            (group.sections as any[]).forEach(section => {
              allSections.push({
                id: section.id,
                name: section.name,
                groupId: section.group_id,
                group: {
                  id: group.id,
                  name: group.name,
                  departmentId: group.department_id,
                },
              });
            });
          }
        });
        setSections(allSections);
      }
    } catch (error) {
      console.error('Error fetching department data:', error);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedDepartment || !timetableName.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a department and enter a timetable name',
        variant: 'destructive',
      });
      return;
    }

    if (courses.length === 0 || sections.length === 0 || rooms.length === 0 || timeSlots.length === 0) {
      toast({
        title: 'Error',
        description: 'Please ensure there are courses, sections, rooms, and time slots configured',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setResult(null);

    // Run GA with progress callback
    setTimeout(() => {
      const gaResult = runGeneticAlgorithm(
        courses,
        sections,
        rooms,
        timeSlots,
        config,
        (generation, fitness) => {
          setProgress(Math.min((generation / config.generations) * 100, 100));
        },
        instructorAvailability
      );

      setResult({
        fitness: gaResult.chromosome.fitness,
        conflicts: gaResult.conflicts,
        generations: gaResult.generations,
      });

      // Save to database
      saveTimetable(gaResult);
    }, 100);
  }, [selectedDepartment, timetableName, courses, sections, rooms, timeSlots, config, instructorAvailability]);

  const saveTimetable = async (gaResult: any) => {
    try {
      // Create timetable record
      const { data: timetable, error: timetableError } = await supabase
        .from('timetables')
        .insert({
          name: timetableName,
          department_id: selectedDepartment,
          fitness_score: gaResult.chromosome.fitness,
          generation_count: gaResult.generations,
          is_approved: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (timetableError) throw timetableError;

      // Create timetable entries
      const entries = gaResult.chromosome.genes.map((gene: any) => ({
        timetable_id: timetable.id,
        course_id: gene.courseId,
        instructor_id: gene.instructorId || null,
        section_id: gene.sectionId,
        room_id: gene.roomId,
        time_slot_id: gene.timeSlotId,
      }));

      const { error: entriesError } = await supabase
        .from('timetable_entries')
        .insert(entries);

      if (entriesError) throw entriesError;

      toast({
        title: 'Success!',
        description: `Timetable "${timetableName}" generated and saved successfully`,
      });

      setGenerating(false);
    } catch (error: any) {
      console.error('Error saving timetable:', error);
      toast({
        title: 'Error',
        description: 'Failed to save timetable: ' + error.message,
        variant: 'destructive',
      });
      setGenerating(false);
    }
  };

  const canGenerate = selectedDepartment && timetableName.trim() && 
    courses.length > 0 && sections.length > 0 && 
    rooms.length > 0 && timeSlots.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl lg:text-3xl font-display font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-secondary" />
            Generate Timetable
          </h1>
          <p className="text-muted-foreground mt-1">
            Use the Genetic Algorithm to generate optimized schedules
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Set up generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={selectedDepartment}
                      onValueChange={setSelectedDepartment}
                      disabled={loading || generating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timetable Name</Label>
                    <Input
                      value={timetableName}
                      onChange={(e) => setTimetableName(e.target.value)}
                      placeholder="e.g., Fall 2024 Schedule"
                      disabled={generating}
                    />
                  </div>
                </div>

                {/* Data Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{courses.length}</p>
                    <p className="text-xs text-muted-foreground">Courses</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{sections.length}</p>
                    <p className="text-xs text-muted-foreground">Sections</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{rooms.length}</p>
                    <p className="text-xs text-muted-foreground">Rooms</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{timeSlots.length}</p>
                    <p className="text-xs text-muted-foreground">Time Slots</p>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                  </Button>

                  {showAdvanced && (
                    <div className="grid sm:grid-cols-3 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-xs">Population Size</Label>
                        <Input
                          type="number"
                          min={20}
                          max={500}
                          value={config.populationSize}
                          onChange={(e) => setConfig({
                            ...config,
                            populationSize: parseInt(e.target.value) || 100,
                          })}
                          disabled={generating}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Generations</Label>
                        <Input
                          type="number"
                          min={50}
                          max={2000}
                          value={config.generations}
                          onChange={(e) => setConfig({
                            ...config,
                            generations: parseInt(e.target.value) || 500,
                          })}
                          disabled={generating}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Mutation Rate</Label>
                        <Input
                          type="number"
                          min={0.01}
                          max={0.5}
                          step={0.01}
                          value={config.mutationRate}
                          onChange={(e) => setConfig({
                            ...config,
                            mutationRate: parseFloat(e.target.value) || 0.1,
                          })}
                          disabled={generating}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate Timetable
                </>
              )}
            </Button>

            {/* Progress */}
            {generating && (
              <Card className="animate-scale-in">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dna className="w-5 h-5 text-secondary animate-pulse" />
                        <span className="font-medium">Running Genetic Algorithm...</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Evolving population across {config.generations} generations
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {result && !generating && (
              <Card className="animate-slide-up border-2 border-success/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="w-5 h-5" />
                    Generation Complete!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-success/10 rounded-lg text-center">
                      <Target className="w-6 h-6 mx-auto mb-2 text-success" />
                      <p className="text-2xl font-bold">{result.fitness.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Fitness Score</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <Zap className="w-6 h-6 mx-auto mb-2 text-accent" />
                      <p className="text-2xl font-bold">{result.generations}</p>
                      <p className="text-xs text-muted-foreground">Generations</p>
                    </div>
                    <div className={`p-4 rounded-lg text-center ${
                      result.conflicts.length === 0 ? 'bg-success/10' : 'bg-warning/10'
                    }`}>
                      {result.conflicts.length === 0 ? (
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-success" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-warning" />
                      )}
                      <p className="text-2xl font-bold">{result.conflicts.length}</p>
                      <p className="text-xs text-muted-foreground">Conflicts</p>
                    </div>
                  </div>

                  {result.conflicts.length > 0 && (
                    <div className="p-4 bg-warning/10 rounded-lg">
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        Detected Conflicts
                      </h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {result.conflicts.slice(0, 5).map((conflict, i) => (
                          <li key={i}>• {conflict.description}</li>
                        ))}
                        {result.conflicts.length > 5 && (
                          <li>...and {result.conflicts.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate('/admin/timetables')}
                  >
                    View All Timetables
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dna className="w-5 h-5 text-primary" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">Genetic Algorithm</h4>
                  <p className="text-muted-foreground">
                    The algorithm mimics natural evolution to find optimal timetable configurations.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Hard Constraints</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• No instructor conflicts</li>
                    <li>• No room double-booking</li>
                    <li>• No section overlaps</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Soft Constraints</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Prefer earlier time slots</li>
                    <li>• Balance across days</li>
                    <li>• Minimize gaps</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <Badge variant="outline" className="mr-2">Tip</Badge>
                  Higher population size = better solutions but slower
                </p>
                <p>
                  <Badge variant="outline" className="mr-2">Tip</Badge>
                  More generations help find optimal solutions
                </p>
                <p>
                  <Badge variant="outline" className="mr-2">Tip</Badge>
                  Fitness score of 900+ indicates a conflict-free schedule
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
