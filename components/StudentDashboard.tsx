
import React, { useState, useEffect } from 'react';
import { supabase, STORAGE_BUCKET } from '../supabaseClient';
import { Profile, Assignment, Submission, Class, Notification } from '../types';

const StudentDashboard: React.FC<{ profile: Profile | null }> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'my_courses' | 'catalog'>('my_courses');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<string, Submission>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [uploadingAssignment, setUploadingAssignment] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAllClasses();
    fetchNotifications();

    const interval = setInterval(() => {
      if (!uploadingAssignment && !isUploading) {
        fetchData();
        fetchNotifications();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [profile, activeTab]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications')
      .select('*')
      .in('receiver_role', ['all', 'student'])
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  const fetchAllClasses = async () => {
    const { data } = await supabase.from('classes').select('*');
    if (data) setAllClasses(data);
  };

  const fetchData = async () => {
    if (!profile) return;
    
    const { data: enrollmentData } = await supabase.from('enrollments').select('class_id').eq('student_id', profile.id);
    const enrolledIds = enrollmentData?.map((e: any) => String(e.class_id)) || [];
    setEnrolledClassIds(enrolledIds);

    if (enrolledIds.length > 0) {
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .in('class_id', enrolledIds)
        .order('due_date', { ascending: true });
      if (assignmentsData) setAssignments(assignmentsData);
    } else {
      setAssignments([]);
    }

    const { data: subsData } = await supabase.from('submissions').select('*').eq('student_id', profile.id);
    if (subsData) {
      const subMap: Record<string, Submission> = {};
      subsData.forEach(sub => {
        if (!subMap[sub.assignment_id] || sub.version > subMap[sub.assignment_id].version) {
          subMap[sub.assignment_id] = sub;
        }
      });
      setMySubmissions(subMap);
    }
  };

  const handleEnroll = async (classId: string) => {
    if (!profile) return;
    await supabase.from('enrollments').insert({ class_id: classId, student_id: profile.id });
    await fetchData();
    setActiveTab('my_courses');
  };

  const handleUnenroll = async (classId: string) => {
    if (!profile || !confirm("Dropping this module will remove access to its tasks. Continue?")) return;
    await supabase.from('enrollments').delete().eq('class_id', classId).eq('student_id', profile.id).execute();
    await fetchData();
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !uploadingAssignment || !profile) return;
    setIsUploading(true);
    try {
      const nextVersion = (mySubmissions[uploadingAssignment.id]?.version || 0) + 1;
      const fileName = `students/${uploadingAssignment.id}/${profile.id}_v${nextVersion}_${selectedFile.name}`;
      
      await supabase.storage.from(STORAGE_BUCKET).upload(fileName, selectedFile);
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
      
      await supabase.from('submissions').insert({
        assignment_id: uploadingAssignment.id, 
        student_id: profile.id, 
        file_url: publicUrl, 
        status: 'pending', 
        version: nextVersion
      });
      
      setUploadingAssignment(null);
      setSelectedFile(null);
      await fetchData();
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setIsUploading(false); 
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 animate-fade-in overflow-x-hidden">
      {/* Notifications Area */}
      {notifications.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {notifications.map(n => (
            <div key={n.id} className="bg-indigo-600 text-white px-4 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl flex items-center justify-between animate-slide-up border-l-4 sm:border-l-8 border-indigo-400">
               <div className="flex items-center gap-3 sm:gap-4">
                 <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-80">University Broadcast</p>
                    <p className="font-bold text-xs sm:text-sm tracking-tight">{n.message}</p>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-indigo-50/50 rounded-bl-full -mr-6 -mt-6 sm:-mr-8 sm:-mt-8"></div>
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Student Workspace</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Academic nodes synced • Live Updates</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl sm:rounded-2xl relative z-10 w-full md:w-auto">
          <button onClick={() => setActiveTab('my_courses')} className={`flex-1 md:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all ${activeTab === 'my_courses' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>My Modules</button>
          <button onClick={() => setActiveTab('catalog')} className={`flex-1 md:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Enrollments</button>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
             <h2 className="text-base sm:text-lg font-bold text-slate-900">Module Catalog</h2>
             <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Select a class to link identity</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {allClasses.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No institutional courses cataloged.</div>
            ) : (
              allClasses.map(c => {
                const isEnrolled = enrolledClassIds.includes(String(c.id));
                return (
                  <div key={c.id} className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[160px] sm:min-h-[180px] hover:border-indigo-100 transition-all group">
                    <div className="space-y-2">
                      <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest">Academic Module</span>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{c.name}</h3>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {c.profiles?.full_name || 'Faculty'}
                      </p>
                    </div>
                    <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-50">
                      {isEnrolled ? (
                        <button onClick={() => handleUnenroll(c.id)} className="w-full py-2.5 sm:py-3 bg-rose-50 text-rose-600 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all">Revoke Enrollment</button>
                      ) : (
                        <button onClick={() => handleEnroll(c.id)} className="w-full py-2.5 sm:py-3 bg-slate-900 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">Link ID to Course</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           {assignments.length === 0 ? (
             <div className="bg-white p-12 sm:p-24 rounded-2xl sm:rounded-[3rem] border border-dashed border-slate-200 text-center">
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-6">Manifest empty. Join a class to begin.</p>
               <button onClick={() => setActiveTab('catalog')} className="text-indigo-600 font-black text-xs uppercase tracking-widest underline underline-offset-8">Browse Modules</button>
             </div>
           ) : (
             assignments.map((assignment) => {
               const submission = mySubmissions[assignment.id];
               const isLate = new Date(assignment.due_date) < new Date();
               const isRevisionRequired = submission?.status === 'resubmission_requested';

               return (
                 <div key={assignment.id} className={`bg-white rounded-2xl sm:rounded-[2rem] border shadow-sm transition-all overflow-hidden flex flex-col group ${isRevisionRequired ? 'border-amber-400 ring-4 ring-amber-500/10' : 'border-slate-100 hover:border-indigo-100'}`}>
                   {isRevisionRequired && (
                     <div className="bg-amber-500 text-white px-6 sm:px-8 py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-between animate-pulse">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          Action Required: Resubmission Requested
                        </span>
                     </div>
                   )}

                   <div className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                       <div className="space-y-1">
                         <span className="text-[8px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest">{assignment.classes?.name || 'Academic Module'}</span>
                         <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{assignment.title}</h3>
                       </div>
                       <span className={`text-[9px] sm:text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-center inline-block w-fit shadow-sm border ${
                         submission?.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         submission?.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                         isRevisionRequired ? 'bg-amber-50 text-amber-600 border-amber-200' :
                         submission ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                       }`}>
                         {submission ? submission.status.replace('_', ' ') : 'Not Started'}
                       </span>
                     </div>
                     
                     <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-4xl font-medium">{assignment.description}</p>
                     
                     <div className="flex flex-wrap gap-3 pt-2">
                        {assignment.file_url && (
                          <button onClick={() => window.open(assignment.file_url, '_blank')} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100">
                            Task PDF
                          </button>
                        )}
                        {submission && (
                          <button onClick={() => window.open(submission.file_url, '_blank')} className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100">
                             Deliverable (v{submission.version})
                          </button>
                        )}
                     </div>

                     {submission?.feedback && (
                        <div className={`p-5 sm:p-6 rounded-2xl shadow-lg relative overflow-hidden ${isRevisionRequired ? 'bg-amber-600' : 'bg-slate-900'}`}>
                           <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-2 ${isRevisionRequired ? 'text-amber-100' : 'text-indigo-400'}`}>Faculty Assessment Note</p>
                           <p className="text-white text-xs sm:text-sm font-medium leading-relaxed italic opacity-95">"{submission.feedback}"</p>
                        </div>
                     )}
                   </div>

                   <div className="px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End Date:</span>
                       <span className={`text-xs sm:text-sm font-black ${isLate && !submission ? 'text-rose-600' : 'text-slate-700'}`}>
                         {new Date(assignment.due_date).toLocaleDateString()}
                       </span>
                     </div>
                     {(!submission || submission.status === 'resubmission_requested' || submission.status === 'rejected') && (
                       <button 
                        onClick={() => setUploadingAssignment(assignment)} 
                        className={`w-full md:w-auto px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                          isRevisionRequired ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200/50' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-200'
                        }`}
                       >
                         {isRevisionRequired ? 'Resubmit Asset' : submission?.status === 'rejected' ? 'New Submission' : 'Upload Deliverable'}
                       </button>
                     )}
                   </div>
                 </div>
               );
             })
           )}
        </div>
      )}

      {/* Upload Modal */}
      {uploadingAssignment && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl p-8 sm:p-10 shadow-2xl animate-scale-in my-auto border border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">Deploy Asset</h2>
            <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest mb-8">{uploadingAssignment.title}</p>
            
            <div className="group border-2 border-dashed border-slate-100 rounded-[2rem] p-8 sm:p-16 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer mb-8 relative">
              <input type="file" id="asset-upload" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
              <label htmlFor="asset-upload" className="cursor-pointer space-y-4 block">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-xl group-hover:text-indigo-600 transition-all">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <div className="space-y-1">
                   <p className="text-slate-900 font-black text-xs sm:text-sm">{selectedFile ? selectedFile.name : 'Select Institutional File'}</p>
                   <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Digital Asset (PDF/DOCX)</p>
                </div>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setUploadingAssignment(null); setSelectedFile(null); }} className="py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cancel</button>
              <button disabled={!selectedFile || isUploading} onClick={handleFileUpload} className="bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {isUploading ? 'Transferring...' : 'Finalize Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
