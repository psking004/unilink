
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface AdminLoginProps {
  onBack: () => void;
}

const MASTER_ACCESS_KEY = 'UNILINK-ROOT-GATEWAY-8822';

const AdminLogin: React.FC<AdminLoginProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. STRICT MASTER KEY VERIFICATION
      if (accessKey.trim() !== MASTER_ACCESS_KEY) {
        throw new Error("Access Denied: Invalid Master Access Key.");
      }

      const emailLower = email.toLowerCase();

      // 2. ATTEMPT SIGN IN
      let { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password
      });
      
      // 3. HANDLE MISSING ACCOUNT (AUTO-REGISTER IF MASTER KEY IS CORRECT)
      if (loginError && loginError.message.includes("recognized")) {
        console.log("Admin account not found. Provisioning identity since Master Key is valid...");
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: emailLower,
          password,
          options: { 
            data: { 
              full_name: emailLower.split('@')[0].toUpperCase() + " (ADMIN)", 
              role: 'admin' 
            } 
          }
        });

        if (signUpError) throw signUpError;

        // If sign up successful, log in immediately
        const { data: secondLoginData, error: secondLoginError } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password
        });

        if (secondLoginError) throw secondLoginError;
        data = secondLoginData;
      } else if (loginError) {
        // This covers "Password mismatch" and other real errors
        throw loginError;
      }

    } catch (err: any) {
      console.error("Administrative Auth Failure:", err);
      setError(err.message || "Security protocols blocked access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-950 p-4 transition-all duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md animate-scale-in border border-rose-900/10">
        <button onClick={onBack} className="text-slate-400 hover:text-rose-700 mb-8 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Portal Overview
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-rose-700 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-xl">
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Root Access</h1>
          <p className="text-rose-700 font-bold text-xs uppercase tracking-widest mt-1">Administrative Gateway</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Admin Email</label>
            <input
              type="email" required placeholder="admin@unilink.edu"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition font-medium"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input
              type="password" required placeholder="••••••••"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition font-medium"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              Master Access Key
            </label>
            <input
              type="text" required placeholder="UNILINK-XXXX-XXXX"
              className="w-full px-5 py-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition font-black tracking-widest text-rose-900 placeholder:text-rose-200 text-sm"
              value={accessKey} onChange={(e) => setAccessKey(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl mt-2">
              <p className="text-rose-700 text-[10px] font-bold leading-tight">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-rose-700 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-rose-900/20 disabled:opacity-50 uppercase tracking-widest text-xs mt-4"
          >
            {loading ? 'Verifying Gateway...' : 'Authorize Root Session'}
          </button>
        </form>
        
        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Secure Academic Infrastructure
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
