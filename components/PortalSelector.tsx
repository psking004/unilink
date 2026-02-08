
import React from 'react';
import { Role } from '../types';

interface PortalSelectorProps {
  onSelect: (role: Role) => void;
}

const PortalSelector: React.FC<PortalSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block bg-indigo-600 p-4 rounded-3xl mb-6 shadow-2xl shadow-indigo-200">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-2">UniLink</h1>
          <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Academic Management Ecosystem</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Student Portal Card */}
          <button 
            onClick={() => onSelect('student')}
            className="group relative bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-100 text-left overflow-hidden hover:-translate-y-2"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full transition-all duration-500 group-hover:bg-indigo-600 group-hover:scale-[10]"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:bg-white transition-colors duration-500">
                <svg className="w-7 h-7 text-white group-hover:text-indigo-600 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-white transition-colors duration-500">Student Portal</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed group-hover:text-indigo-100 transition-colors duration-500">
                Access course modules, submit assignments, and track your progress.
              </p>
              <div className="mt-6 flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px] group-hover:text-white transition-colors duration-500">
                Enter Student Gateway
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            </div>
          </button>

          {/* Faculty Portal Card */}
          <button 
            onClick={() => onSelect('teacher')}
            className="group relative bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-100 text-left overflow-hidden hover:-translate-y-2"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full transition-all duration-500 group-hover:bg-slate-900 group-hover:scale-[10]"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:bg-white transition-colors duration-500">
                <svg className="w-7 h-7 text-white group-hover:text-slate-900 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-white transition-colors duration-500">Faculty Portal</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed group-hover:text-slate-300 transition-colors duration-500">
                Manage curriculum, review submissions, and oversee academic excellence.
              </p>
              <div className="mt-6 flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-[10px] group-hover:text-white transition-colors duration-500">
                Enter Professor Gateway
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            </div>
          </button>

          {/* Admin Portal Card */}
          <button 
            onClick={() => onSelect('admin')}
            className="group relative bg-white p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-100 text-left overflow-hidden hover:-translate-y-2"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full transition-all duration-500 group-hover:bg-rose-700 group-hover:scale-[10]"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-rose-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:bg-white transition-colors duration-500">
                <svg className="w-7 h-7 text-white group-hover:text-rose-700 transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-white transition-colors duration-500">Admin Portal</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed group-hover:text-rose-100 transition-colors duration-500">
                Verify academic credentials, approve faculty access, and manage system security.
              </p>
              <div className="mt-6 flex items-center gap-2 text-rose-700 font-black uppercase tracking-widest text-[10px] group-hover:text-white transition-colors duration-500">
                System Administration
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortalSelector;
