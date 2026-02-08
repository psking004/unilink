
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, Submission, Notification } from '../types';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'submissions' | 'alerts'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sentAlerts, setSentAlerts] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', role: 'student' as any });
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (!isProcessing) fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, [activeTab, isProcessing]);

  const fetchData = async () => {
    try {
      if (activeTab === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('role', { ascending: true });
        if (data) setProfiles(data);
      } else if (activeTab === 'submissions') {
        const { data } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
        if (data) setSubmissions(data);
      } else if (activeTab === 'alerts') {
        const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
        if (data) setSentAlerts(data);
      }
    } catch (err) {
      console.error("Fetch failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const { error } = await supabase.from('profiles').insert({
      full_name: newUser.full_name,
      email: newUser.email.toLowerCase(),
      role: newUser.role,
      is_approved: true
    });

    if (error) {
      alert("System error during identity provisioning.");
    } else {
      setShowAddUser(false);
      setNewUser({ full_name: '', email: '', role: 'student' });
      await fetchData();
    }
    setIsProcessing(false);
  };

  const handleRemoveUser = async (id: string) => {
    if (!id || !confirm("Are you sure you want to purge this identity?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('purge_user_identity', { target_id: id });
      if (error) {
        await supabase.from('profiles').delete().eq('id', id);
      }
    } catch (err) {
      console.error("Catastrophic Purge Error:", err);
    } finally {
      await fetchData();
      setIsProcessing(false);
    }
  };

  const handleApproveFaculty = async (id: string) => {
    setIsProcessing(true);
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    await fetchData();
    setIsProcessing(false);
  };

  const handleExecuteBroadcast = async () => {
    if (!alertMessage.trim()) return;
    setIsProcessing(true);
    
    try {
      const { error } = await supabase.from('notifications').insert({
        sender_id: 'admin-root',
        receiver_role: 'all',
        message: alertMessage,
        type: 'alert'
      });

      if (error) throw error;
      
      setAlertMessage('');
      await fetchData(); // Refresh local list
      alert('Global Broadcast Deployed to Ecosystem.');
    } catch (err) {
      console.error("Broadcast failure:", err);
      alert("System error: Broadcast could not be dispatched.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-16 animate-fade-in max-w-7xl mx-auto py-4 sm:py-12 px-2">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 sm:gap-8 pb-8 sm:pb-12 border-b border-slate-200 px-2 sm:px-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Root Terminal</div>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none">System Architecture</h1>
          <p className="text-slate-500 font-medium text-base sm:text-lg max-w-lg">Advanced administrative controls for university identity and asset management.</p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-2xl sm:rounded-3xl backdrop-blur-md w-full sm:w-auto">
          {(['users', 'submissions', 'alerts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-4 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-white text-slate-900 shadow-lg sm:shadow-2xl sm:scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'users' && (
        <div className="space-y-6 sm:space-y-10 px-2 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Personnel Directory</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Academic Identities</p>
             </div>
             <button onClick={() => setShowAddUser(true)} className="w-full sm:w-auto bg-slate-900 text-white px-6 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95">Provision Identity</button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {profiles.map(p => (
              <div key={p.id} className="group bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between min-h-[260px] sm:min-h-[320px]">
                <div>
                  <div className="flex justify-between items-start mb-6 sm:mb-8">
                    <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] ${
                      p.role === 'teacher' ? 'bg-blue-50 text-blue-600' : 
                      p.role === 'admin' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.role === 'teacher' ? 'Faculty' : p.role === 'admin' ? 'Root' : 'Undergrad'}
                    </span>
                    {!p.is_approved && p.role === 'teacher' && (
                       <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-1 sm:mb-2 tracking-tight line-clamp-1">{p.full_name}</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold truncate tracking-tight">{p.email}</p>
                </div>
                
                <div className="pt-6 sm:pt-10 mt-6 sm:mt-10 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    {p.role === 'teacher' && !p.is_approved ? (
                      <button onClick={() => handleApproveFaculty(p.id)} className="text-amber-600 text-[9px] font-black uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Authorize Access</button>
                    ) : (
                      <span className="text-emerald-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                         Active
                      </span>
                    )}
                  </div>
                  {p.role !== 'admin' && (
                    <button 
                      onClick={() => handleRemoveUser(p.id)} 
                      className="text-slate-300 hover:text-rose-600 transition-all font-black text-[9px] uppercase tracking-widest px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent hover:border-rose-100 hover:bg-rose-50 rounded-lg sm:rounded-xl"
                    >
                      {isProcessing ? '...' : 'Purge'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-6 sm:space-y-10 px-2 sm:px-0">
          <div className="space-y-1">
             <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Asset Audit</h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Deliverable Monitoring</p>
          </div>
          <div className="bg-white rounded-3xl sm:rounded-[4rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-6 sm:px-12 py-6 sm:py-8">Contributor</th>
                    <th className="px-6 sm:px-12 py-6 sm:py-8">Context</th>
                    <th className="px-6 sm:px-12 py-6 sm:py-8">Status Manifest</th>
                    <th className="px-6 sm:px-12 py-6 sm:py-8 text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.length === 0 ? (
                    <tr><td colSpan={4} className="px-12 py-12 text-center text-slate-400 font-bold uppercase text-[10px]">No academic assets found.</td></tr>
                  ) : (
                    submissions.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/30 transition group">
                        <td className="px-6 sm:px-12 py-6 sm:py-10 font-black text-slate-900 text-base sm:text-lg tracking-tight">{s.profiles?.full_name}</td>
                        <td className="px-6 sm:px-12 py-6 sm:py-10">
                          <div className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider line-clamp-1">{s.assignments?.title || 'Asset'}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1">v.{s.version} — {new Date(s.submitted_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 sm:px-12 py-6 sm:py-10">
                          <span className={`inline-block px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${
                            s.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                            s.status === 'resubmission_requested' ? 'bg-amber-50 text-amber-600' :
                            s.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {s.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 sm:px-12 py-6 sm:py-10 text-right">
                           <button onClick={() => window.open(s.file_url, '_blank')} className="bg-slate-900 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[9px] uppercase tracking-widest sm:opacity-0 group-hover:opacity-100 transition-all">Inspect</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-12">
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl sm:rounded-[4rem] p-8 sm:p-24 shadow-2xl relative overflow-hidden text-center">
            <div className="absolute inset-0 opacity-10">
               <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-indigo-500 rounded-full blur-[80px] sm:blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
               <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-rose-500 rounded-full blur-[80px] sm:blur-[120px] translate-x-1/2 translate-y-1/2"></div>
            </div>
            <div className="relative z-10 space-y-6 sm:space-y-10">
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter">Global Broadcast</h2>
                <p className="text-slate-400 font-medium text-sm sm:text-lg leading-relaxed max-w-lg mx-auto">Deploy a high-priority notification to the entire academic ecosystem.</p>
              </div>
              <textarea
                className="w-full h-40 sm:h-56 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 outline-none focus:ring-4 focus:ring-indigo-500/20 font-medium text-white transition-all text-base sm:text-xl"
                placeholder="Priority message content..."
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
              />
              <button 
                onClick={handleExecuteBroadcast} 
                disabled={isProcessing || !alertMessage.trim()}
                className="w-full sm:w-auto bg-white text-slate-900 px-10 sm:px-16 py-4 sm:py-6 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[9px] sm:text-[10px] hover:bg-indigo-400 hover:text-white transition-all active:scale-95 shadow-2xl disabled:opacity-50"
              >
                {isProcessing ? 'Deploying...' : 'Execute Broadcast'}
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Broadcast Log</h3>
             <div className="space-y-3">
                {sentAlerts.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold uppercase text-[10px] py-10 bg-slate-100/50 rounded-3xl">No broadcast history recorded.</p>
                ) : (
                  sentAlerts.map(alert => (
                    <div key={alert.id} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Sent {new Date(alert.created_at).toLocaleString()}</p>
                          <p className="text-slate-700 font-medium text-sm sm:text-base">{alert.message}</p>
                       </div>
                       <div className="shrink-0">
                          <span className="text-[8px] font-black px-3 py-1 bg-slate-100 text-slate-400 uppercase rounded-full tracking-tighter">System Alert</span>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Provisioning Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl sm:rounded-[4rem] w-full max-w-xl p-8 sm:p-16 shadow-2xl animate-scale-in my-auto">
            <h2 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-4 tracking-tight text-slate-900">Provision Identity</h2>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mb-8 sm:mb-12">Authorized credential creation for university personnel.</p>
            <form onSubmit={handleCreateUser} className="space-y-6 sm:space-y-8">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input required className="w-full px-6 py-4 sm:px-8 sm:py-5 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm sm:text-base" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">University Email</label>
                <input type="email" required className="w-full px-6 py-4 sm:px-8 sm:py-5 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm sm:text-base" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Role</label>
                <select className="w-full px-6 py-4 sm:px-8 sm:py-5 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-black uppercase text-[9px] sm:text-[10px] tracking-widest" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                  <option value="student">Undergraduate</option>
                  <option value="teacher">Faculty Personnel</option>
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-4 sm:gap-6 pt-6 sm:pt-10">
                <button type="button" onClick={() => setShowAddUser(false)} className="py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Abort</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] bg-slate-900 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-200 disabled:opacity-50">
                   {isProcessing ? 'Authorizing...' : 'Finalize Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
