import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Stats {
  courses: number;
  instructors: number;
  rooms: number;
  sections: number;
  timetables: number;
  approvedTimetables: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    courses: 0,
    instructors: 0,
    rooms: 0,
    sections: 0,
    timetables: 0,
    approvedTimetables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [
        { count: coursesCount },
        { count: instructorsCount },
        { count: roomsCount },
        { count: sectionsCount },
        { count: timetablesCount },
        { count: approvedCount },
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('instructors').select('*', { count: 'exact', head: true }),
        supabase.from('rooms').select('*', { count: 'exact', head: true }),
        supabase.from('sections').select('*', { count: 'exact', head: true }),
        supabase.from('timetables').select('*', { count: 'exact', head: true }),
        supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      ]);

      setStats({
        courses: coursesCount || 0,
        instructors: instructorsCount || 0,
        rooms: roomsCount || 0,
        sections: sectionsCount || 0,
        timetables: timetablesCount || 0,
        approvedTimetables: approvedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminStats = [
    { label: 'Courses', value: stats.courses, icon: BookOpen, color: 'bg-primary', href: '/admin/courses' },
    { label: 'Instructors', value: stats.instructors, icon: Users, color: 'bg-secondary', href: '/admin/instructors' },
    { label: 'Rooms', value: stats.rooms, icon: Building2, color: 'bg-accent', href: '/admin/rooms' },
    { label: 'Sections', value: stats.sections, icon: Calendar, color: 'bg-info', href: '#' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Welcome back, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'admin' 
              ? 'Manage your university timetable system from here.'
              : user?.role === 'staff'
              ? 'View your teaching schedule and course assignments.'
              : 'View your class schedule and course timetable.'}
          </p>
        </div>

        {/* Admin Dashboard */}
        {user?.role === 'admin' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {adminStats.map((stat, index) => (
                <Link
                  key={stat.label}
                  to={stat.href}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer gradient-card">
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl lg:text-3xl font-bold font-display mt-1">
                            {loading ? '...' : stat.value}
                          </p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center shadow-lg`}>
                          <stat.icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Generate Timetable Card */}
              <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    Generate Timetable
                  </CardTitle>
                  <CardDescription>
                    Use the Genetic Algorithm to automatically generate optimized timetables
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>Automatic conflict resolution</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>Instructor & room optimization</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>Balanced schedule distribution</span>
                    </div>
                    <Button asChild variant="hero" className="w-full mt-4">
                      <Link to="/admin/generate">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Generation
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Timetable Status */}
              <Card className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Timetable Status
                  </CardTitle>
                  <CardDescription>
                    Overview of generated and approved timetables
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-medium">Total Timetables</span>
                      </div>
                      <span className="text-xl font-bold">{stats.timetables}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <span className="font-medium">Approved</span>
                      </div>
                      <span className="text-xl font-bold text-success">{stats.approvedTimetables}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-warning" />
                        <span className="font-medium">Pending Review</span>
                      </div>
                      <span className="text-xl font-bold text-warning">
                        {stats.timetables - stats.approvedTimetables}
                      </span>
                    </div>
                    <Button asChild variant="outline" className="w-full mt-4">
                      <Link to="/admin/timetables">
                        View All Timetables
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Staff/Student View */}
        {(user?.role === 'staff' || user?.role === 'student') && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Your Timetable
                </CardTitle>
                <CardDescription>
                  {user?.role === 'staff' 
                    ? 'View your teaching schedule'
                    : 'View your class schedule'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Access your personalized timetable showing all your scheduled 
                  {user?.role === 'staff' ? ' lectures and classes' : ' classes and lectures'}.
                </p>
                <Button asChild variant="hero">
                  <Link to="/timetable">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Timetable
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  Quick Info
                </CardTitle>
                <CardDescription>
                  Your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-medium">{user?.userCode}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{user?.role}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">Artificial Intelligence</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
