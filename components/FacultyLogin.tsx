
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface FacultyLoginProps {
  onBack: () => void;
}

const FacultyLogin: React.FC<FacultyLoginProps> = ({ onBack }) => {
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
          options: { data: { full_name: fullName, role: 'teacher' } }
        });

        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: 'teacher',
            is_approved: false // Faculty MUST be approved by admin
          });
        }
        alert(`Faculty account created! Access is pending administrator verification. You will be able to log in once approved.`);
        setIsRegistering(false);
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (loginError) throw loginError;

        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('role, is_approved').eq('id', data.user.id).single();
          
          if (profile?.role !== 'teacher') {
            await supabase.auth.signOut();
            throw new Error("Credentials mismatch. Use the correct Portal gateway.");
          }

          if (profile.is_approved === false) {
            await supabase.auth.signOut();
            throw new Error("Your account is pending administrator approval. Please contact the IT department.");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 transition-all duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md animate-scale-in border border-white/10">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 mb-8 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Return to Portal Select
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Professor Portal</h1>
          <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">Faculty Academic System</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Professor Name</label>
              <input
                type="text" required placeholder="Name"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition font-medium"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Faculty Email</label>
            <input
              type="email" required placeholder="id@university.edu"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition font-medium"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input
              type="password" required placeholder="••••••••"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition font-medium"
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
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-slate-200 shadow-slate-900/10 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Submit Verification Request' : 'Sign In to Faculty Dashboard'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
            className="text-slate-500 hover:text-slate-900 text-xs font-black uppercase tracking-widest transition"
          >
            {isRegistering ? 'Registered Faculty? Sign In' : "New Faculty? Register Credentials"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacultyLogin;
