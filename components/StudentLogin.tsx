
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface StudentLoginProps {
  onBack: () => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role: 'student' } }
        });

        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: 'student'
          });
        }
        alert(`Academic account created! Please sign in.`);
        setIsRegistering(false);
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (loginError) throw loginError;

        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
          if (profile?.role !== 'student') {
            await supabase.auth.signOut();
            throw new Error("This is the Student Portal. Faculty members must use the Professor Portal.");
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4 transition-all duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md animate-scale-in">
        <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 mb-8 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Switch Portal
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Student Portal</h1>
          <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mt-1">Undergraduate Services</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input
                type="text" required placeholder="Name"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">University Email</label>
            <input
              type="email" required placeholder="name@university.edu"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input
              type="password" required placeholder="••••••••"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
              <p className="text-red-700 text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-indigo-200 shadow-indigo-100 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {loading ? 'Verifying...' : isRegistering ? 'Register Student ID' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
            className="text-indigo-600 hover:text-indigo-800 text-xs font-black uppercase tracking-widest transition"
          >
            {isRegistering ? 'Already Registered? Sign In' : "New Student? Join UniLink"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
