import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  Building2,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  User,
  Shield,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  roles: ('admin' | 'staff' | 'student')[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'staff', 'student'] },
  { href: '/timetable', label: 'My Timetable', icon: <Calendar className="w-5 h-5" />, roles: ['staff', 'student'] },
  { href: '/admin/timetables', label: 'Timetables', icon: <Calendar className="w-5 h-5" />, roles: ['admin'] },
  { href: '/admin/courses', label: 'Courses', icon: <BookOpen className="w-5 h-5" />, roles: ['admin'] },
  { href: '/admin/instructors', label: 'Instructors', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { href: '/admin/rooms', label: 'Rooms', icon: <Building2 className="w-5 h-5" />, roles: ['admin'] },
  { href: '/admin/timeslots', label: 'Time Slots', icon: <Clock className="w-5 h-5" />, roles: ['admin'] },
  { href: '/admin/generate', label: 'Generate', icon: <Sparkles className="w-5 h-5" />, roles: ['admin'] },
  { href: '/admin/users', label: 'Users', icon: <Shield className="w-5 h-5" />, roles: ['admin'] },
  { href: '/admin/students', label: 'Students', icon: <GraduationCap className="w-5 h-5" />, roles: ['admin'] },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-accent/20 text-accent';
      case 'staff':
        return 'bg-secondary/20 text-secondary';
      default:
        return 'bg-primary/20 text-primary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-secondary flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-sidebar-foreground text-lg leading-none">
                  BSNU
                </h1>
                <p className="text-sidebar-foreground/60 text-xs">Timetable System</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.fullName}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded capitalize",
                        getRoleBadgeClass(user?.role || 'student')
                      )}>
                        {user?.role}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user?.userCode}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-card border-b shadow-sm lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 lg:hidden" />
          
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Faculty of Computers & Information</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
