
import React from 'react';
import { supabase, isMock } from '../supabaseClient';
import { Profile } from '../types';

interface NavbarProps {
  profile: Profile | null;
}

const Navbar: React.FC<NavbarProps> = ({ profile }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const role = profile?.role;
  const brandColor = 
    role === 'admin' ? 'bg-rose-700' : 
    role === 'teacher' ? 'bg-blue-600' : 'bg-indigo-600';

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`${brandColor} p-2 rounded-xl shadow-lg transition-colors`}>
               <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
            </div>
            <div className="flex flex-col -gap-1">
              <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter uppercase">UniLink</span>
              {isMock && (
                <span className="text-[7px] sm:text-[8px] font-black text-rose-600 tracking-widest uppercase">Virtual</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-right hidden xs:block">
              <p className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 max-w-[120px] sm:max-w-none">{profile?.full_name || 'Administrator'}</p>
              <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {role === 'admin' ? 'Root' : role === 'teacher' ? 'Faculty' : 'Student'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-sm font-bold text-slate-500 hover:text-red-500 border border-slate-100 rounded-lg sm:rounded-xl hover:bg-red-50 transition-all duration-200"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
