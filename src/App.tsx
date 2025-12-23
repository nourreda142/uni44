import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MyTimetable from "./pages/MyTimetable";
import MyAvailability from "./pages/MyAvailability";
import CoursesPage from "./pages/admin/CoursesPage";
import InstructorsPage from "./pages/admin/InstructorsPage";
import RoomsPage from "./pages/admin/RoomsPage";
import TimeSlotsPage from "./pages/admin/TimeSlotsPage";
import GeneratePage from "./pages/admin/GeneratePage";
import TimetablesPage from "./pages/admin/TimetablesPage";
import TimetableViewPage from "./pages/admin/TimetableViewPage";
import UsersPage from "./pages/admin/UsersPage";
import StudentsPage from "./pages/admin/StudentsPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Auth route wrapper (redirects to dashboard if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={
        <AuthRoute>
          <Auth />
        </AuthRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/timetable" element={
        <ProtectedRoute allowedRoles={['staff', 'student']}>
          <MyTimetable />
        </ProtectedRoute>
      } />
      
      <Route path="/my-availability" element={
        <ProtectedRoute allowedRoles={['staff']}>
          <MyAvailability />
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin/courses" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <CoursesPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/instructors" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <InstructorsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/rooms" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <RoomsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/timeslots" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TimeSlotsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/generate" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <GeneratePage />
        </ProtectedRoute>
      } />
      <Route path="/admin/timetables" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TimetablesPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/timetables/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TimetableViewPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <UsersPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <StudentsPage />
        </ProtectedRoute>
      } />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
