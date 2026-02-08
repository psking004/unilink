
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Role } from '../types';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [portal, setPortal] = useState<Role>('student');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        // Sign up with specific role
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: portal } }
        });

        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: portal
          });
        }
        alert(`Account created successfully! You can now log into the ${portal === 'teacher' ? 'Professor' : 'Student'} portal.`);
        setIsRegistering(false);
      } else {
        // Log in and verify role
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (loginError) throw loginError;

        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            await supabase.auth.signOut();
            throw new Error("Academic profile not found. Please register as a student or faculty.");
          }

          // Strict Role Check: Ensure user is at the correct login portal
          if (profile.role !== portal) {
            await supabase.auth.signOut();
            const roleName = profile.role === 'teacher' ? 'Faculty' : 'Student';
            const portalName = portal === 'teacher' ? 'Professor' : 'Student';
            throw new Error(`Unauthorized access: You are identified as ${roleName}. Please use the ${roleName} login portal.`);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = portal === 'teacher';
  const portalTheme = isTeacher ? 'from-slate-900 to-blue-950' : 'from-indigo-600 to-indigo-800';
  const accentColor = isTeacher ? 'bg-blue-600' : 'bg-indigo-600';
  const ringColor = isTeacher ? 'focus:ring-blue-500' : 'focus:ring-indigo-500';

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${portalTheme} p-4 transition-all duration-700`}>
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${accentColor} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl ring-4 ring-white/10`}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">UniLink</h1>
          <p className="text-slate-500 font-medium mt-1">University Academic Portal</p>
        </div>

        {!isRegistering && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200">
            <button
              onClick={() => { setPortal('student'); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${portal === 'student' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Student Access
            </button>
            <button
              onClick={() => { setPortal('teacher'); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${portal === 'teacher' ? 'bg-white shadow-md text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Faculty Access
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input
                type="text" required placeholder="Dr. Julian Vane"
                className={`w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ${ringColor} transition`}
                value={fullName} onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">University Email</label>
            <input
              type="email" required placeholder="id@university.edu"
              className={`w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ${ringColor} transition`}
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Secure Password</label>
            <input
              type="password" required placeholder="••••••••"
              className={`w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ${ringColor} transition`}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p className="text-red-700 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className={`w-full ${accentColor} text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Register Academic Account' : `Sign In as ${isTeacher ? 'Faculty' : 'Student'}`}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold transition"
          >
            {isRegistering ? 'Back to Portal Login' : "First time? Join UniLink College Portal"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
