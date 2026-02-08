
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Profile, Role } from './types';
import PortalSelector from './components/PortalSelector';
import StudentLogin from './components/StudentLogin';
import FacultyLogin from './components/FacultyLogin';
import AdminLogin from './components/AdminLogin';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Profile fetch error:", err);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const handlePortalSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleBackToSelect = () => {
    setSelectedRole(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse">Initializing Academic Ecosystem...</p>
      </div>
    );
  }

  // Auth Guard Logic
  if (!session || !profile) {
    if (!selectedRole) {
      return <PortalSelector onSelect={handlePortalSelect} />;
    }
    
    if (selectedRole === 'student') return <StudentLogin onBack={handleBackToSelect} />;
    if (selectedRole === 'teacher') return <FacultyLogin onBack={handleBackToSelect} />;
    if (selectedRole === 'admin') return <AdminLogin onBack={handleBackToSelect} />;
  }

  // Dashboard Rendering Logic
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {profile?.role === 'admin' ? (
          <AdminDashboard />
        ) : profile?.role === 'teacher' ? (
          <TeacherDashboard profile={profile} />
        ) : (
          <StudentDashboard profile={profile} />
        )}
      </main>
    </div>
  );
};

export default App;
