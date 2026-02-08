
import React, { useState, useEffect } from 'react';
import { supabase, STORAGE_BUCKET } from '../supabaseClient';
import { Profile, Class, Assignment, Submission, Notification } from '../types';
import { getAIFeedback } from '../services/geminiService';

const TeacherDashboard: React.FC<{ profile: Profile | null }> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'assignments' | 'students'>('assignments');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', due_date: '', file: null as File | null });
  const [newClassName, setNewClassName] = useState('');
  
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchInitialData();
    fetchNotifications();

    const interval = setInterval(() => {
      if (!isProcessing) {
        fetchInitialData();
        fetchNotifications();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [profile]);

  useEffect(() => {
    if (selectedClassId) {
      fetchAssignments(selectedClassId);
      fetchEnrolledStudents(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications')
      .select('*')
      .in('receiver_role', ['all', 'teacher'])
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  const fetchInitialData = async () => {
    if (!profile) return;
    try {
      const { data: classesData } = await supabase.from('classes').select('*').eq('teacher_id', profile.id);
      if (classesData) {
        setClasses(classesData);
        if (classesData.length > 0 && !selectedClassId) setSelectedClassId(classesData[0].id);
      }
      const { data: studentsData } = await supabase.from('profiles').select('*').eq('role', 'student');
      if (studentsData) setAllStudents(studentsData);
    } catch (e) {
      console.error("Faculty sync failed:", e);
    }
  };

  const fetchAssignments = async (classId: string) => {
    const { data } = await supabase.from('assignments').select('*').eq('class_id', classId).order('due_date', { ascending: true });
    if (data) setAssignments(data);
  };

  const fetchEnrolledStudents = async (classId: string) => {
    const { data } = await supabase.from('enrollments').select('student_id').eq('class_id', classId);
    if (data) setEnrolledStudentIds(data.map((e: any) => e.student_id));
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newClassName) return;
    setIsProcessing(true);
    const { data } = await supabase.from('classes').insert({
      name: newClassName,
      teacher_id: profile.id
    });
    if (data && data.length > 0) {
      setClasses(prev => [...prev, ...data]);
      if (!selectedClassId) setSelectedClassId(data[0].id);
    }
    setNewClassName('');
    setShowCreateClass(false);
    setIsProcessing(false);
  };

  const handleToggleEnrollment = async (studentId: string) => {
    if (!selectedClassId) return;
    setIsProcessing(true);
    const isEnrolled = enrolledStudentIds.includes(studentId);
    if (isEnrolled) {
      await supabase.from('enrollments').delete().eq('class_id', selectedClassId).eq('student_id', studentId).execute();
      setEnrolledStudentIds(prev => prev.filter(id => id !== studentId));
    } else {
      await supabase.from('enrollments').insert({ class_id: selectedClassId, student_id: studentId });
      setEnrolledStudentIds(prev => [...prev, studentId]);
    }
    setIsProcessing(false);
  };

  const handleSelectAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const { data } = await supabase.from('submissions').select('*').eq('assignment_id', assignment.id).order('submitted_at', { ascending: false });
    if (data) setSubmissions(data);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;
    setIsProcessing(true);
    
    let file_url = '';
    if (newAssignment.file) {
      const fileName = `faculty/${selectedClassId}/${Date.now()}_${newAssignment.file.name}`;
      await supabase.storage.from(STORAGE_BUCKET).upload(fileName, newAssignment.file);
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
      file_url = publicUrl;
    }

    await supabase.from('assignments').insert({
      title: newAssignment.title,
      description: newAssignment.description,
      due_date: newAssignment.due_date,
      class_id: selectedClassId,
      file_url: file_url || undefined
    });

    await fetchAssignments(selectedClassId);
    setShowCreateAssignment(false);
    setNewAssignment({ title: '', description: '', due_date: '', file: null });
    setIsProcessing(false);
  };

  const handleGenerateAI = async () => {
    if (!reviewingSubmission || !selectedAssignment) return;
    setIsGeneratingAI(true);
    const aiFeedback = await getAIFeedback(
      selectedAssignment.title,
      selectedAssignment.description,
      `Submission by student ${reviewingSubmission.profiles?.full_name} (v${reviewingSubmission.version}).`
    );
    setFeedback(aiFeedback);
    setIsGeneratingAI(false);
  };

  const updateSubmissionStatus = async (status: 'approved' | 'rejected' | 'resubmission_requested') => {
    if (!reviewingSubmission) return;
    setIsProcessing(true);
    await supabase.from('submissions').update({ status, feedback }).eq('id', reviewingSubmission.id);
    setReviewingSubmission(null);
    setFeedback('');
    if (selectedAssignment) handleSelectAssignment(selectedAssignment);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 animate-fade-in overflow-x-hidden">
      {/* Notifications Area */}
      {notifications.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {notifications.map(n => (
            <div key={n.id} className="bg-slate-900 text-white px-4 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl flex items-center justify-between animate-slide-up border-l-4 sm:border-l-8 border-blue-600">
               <div className="flex items-center gap-3 sm:gap-4">
                 <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-80">Faculty Alert</p>
                    <p className="font-bold text-xs sm:text-sm tracking-tight">{n.message}</p>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Faculty Hub</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Coordinate modules, manage enrollments, and evaluate work.</p>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => { setActiveTab('assignments'); setSelectedAssignment(null); }}
            className={`flex-1 md:flex-none px-4 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${activeTab === 'assignments' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Curriculum
          </button>
          <button 
            onClick={() => { setActiveTab('students'); setSelectedAssignment(null); }}
            className={`flex-1 md:flex-none px-4 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Directory
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 sm:gap-8 items-start">
        {/* Side Panel */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Class</label>
              <select 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={selectedClassId || ''} 
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.length === 0 ? <option value="">No Classes Found</option> : classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowCreateClass(true)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Create New Class</button>
              {selectedClassId && (
                <button onClick={() => setShowCreateAssignment(true)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md shadow-blue-100 hover:bg-blue-700 transition-all">New Assignment</button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <main className="lg:col-span-3">
          {activeTab === 'assignments' ? (
            !selectedAssignment ? (
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                {assignments.length === 0 ? (
                  <div className="md:col-span-2 py-16 sm:py-20 bg-white border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 font-medium text-xs sm:text-sm">No assignments yet for this class.</div>
                ) : (
                  assignments.map(assignment => (
                    <div key={assignment.id} onClick={() => handleSelectAssignment(assignment)} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[160px] sm:min-h-[180px]">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                           <span className="text-blue-600 bg-blue-50 text-[8px] sm:text-[9px] font-bold uppercase px-2 py-0.5 rounded-md">Assigned</span>
                           <span className="text-slate-300 text-[8px] sm:text-[9px] font-bold tracking-widest">ID: {assignment.id.slice(0,4)}</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{assignment.title}</h3>
                        <p className="text-slate-500 text-xs sm:text-sm line-clamp-2">{assignment.description}</p>
                        {assignment.file_url && (
                          <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] text-blue-500 font-bold uppercase">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            Reference PDF
                          </span>
                        )}
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] sm:text-xs font-bold text-blue-600">Review Deliverables</div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-slide-up bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => setSelectedAssignment(null)} className="text-blue-600 text-[10px] sm:text-xs font-bold hover:underline inline-flex items-center gap-1 mb-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  Back to Modules
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                   <h2 className="text-xl sm:text-2xl font-bold text-slate-900 line-clamp-2">{selectedAssignment.title}</h2>
                   {selectedAssignment.file_url && (
                     <button onClick={() => window.open(selectedAssignment.file_url, '_blank')} className="text-blue-600 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       Guidelines
                     </button>
                   )}
                </div>
                <div className="overflow-x-auto -mx-5 sm:mx-0">
                   <table className="w-full text-left min-w-[500px]">
                     <thead>
                       <tr className="bg-slate-50 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                         <th className="px-5 py-3">Student</th>
                         <th className="px-5 py-3">Status</th>
                         <th className="px-5 py-3 text-right">Action</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {submissions.length === 0 ? (
                         <tr><td colSpan={3} className="px-5 py-12 text-center text-xs sm:text-sm text-slate-400 font-medium italic">No uploads found for this task.</td></tr>
                       ) : (
                         submissions.map(sub => (
                           <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-5 py-4">
                               <p className="font-bold text-slate-900 text-sm">{sub.profiles?.full_name}</p>
                               <p className="text-[9px] sm:text-[10px] text-slate-400">v{sub.version} — {new Date(sub.submitted_at).toLocaleDateString()}</p>
                             </td>
                             <td className="px-5 py-4">
                               <span className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                 sub.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                 sub.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                                 sub.status === 'resubmission_requested' ? 'bg-amber-100 text-amber-600' :
                                 'bg-blue-100 text-blue-600'
                               }`}>{sub.status.replace('_', ' ')}</span>
                             </td>
                             <td className="px-5 py-4 text-right">
                               <button onClick={() => { setReviewingSubmission(sub); setFeedback(sub.feedback || ''); }} className="text-[10px] sm:text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-blue-100">Evaluate</button>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
               <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/50">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">Enrollment Directory</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{enrolledStudentIds.length} Student(s) Tracking</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left min-w-[500px]">
                   <thead>
                     <tr className="bg-slate-50 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                       <th className="px-6 py-4">Identity</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4 text-right">Access Control</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {allStudents.map(student => {
                       const isEnrolled = enrolledStudentIds.includes(student.id);
                       return (
                         <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4">
                             <p className="font-bold text-slate-900 text-sm">{student.full_name}</p>
                             <p className="text-[9px] sm:text-[10px] text-slate-400">{student.email}</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`text-[8px] sm:text-[9px] font-bold uppercase px-2 py-0.5 rounded ${isEnrolled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                {isEnrolled ? 'Active' : 'Not Linked'}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <button 
                               onClick={() => handleToggleEnrollment(student.id)}
                               className={`text-[10px] font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border transition-all ${
                                 isEnrolled ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'
                               }`}
                               disabled={!selectedClassId}
                             >
                               {isEnrolled ? 'Revoke' : 'Link to Class'}
                             </button>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* Class Creation Modal */}
      {showCreateClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-scale-in">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Initialize New Course</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mb-6 sm:mb-8 font-medium leading-relaxed uppercase tracking-widest">Identify class manifest parameters</p>
            <form onSubmit={handleCreateClass} className="space-y-6">
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" placeholder="e.g. Advanced AI Ethics" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowCreateClass(false)} className="flex-1 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">Register Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Deployment Modal */}
      {showCreateAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-scale-in my-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 tracking-tight">Deploy Manifest</h2>
            <p className="text-[10px] text-slate-500 mb-6 sm:mb-8 uppercase font-black tracking-widest">Establish Digital Requirements</p>
            <form onSubmit={handleCreateAssignment} className="space-y-4 sm:space-y-6">
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" placeholder="Title of Task" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} />
              <textarea rows={3} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" placeholder="Describe expectations..." value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Deadline</label>
                  <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={newAssignment.due_date} onChange={e => setNewAssignment({...newAssignment, due_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-1 ml-1">Guidelines (PDF)</label>
                  <input type="file" className="text-[9px] w-full mt-2" onChange={e => setNewAssignment({...newAssignment, file: e.target.files?.[0] || null})} />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowCreateAssignment(false)} className="py-3 text-slate-400 font-bold text-[10px] uppercase">Discard</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-[10px] tracking-widest uppercase shadow-lg shadow-blue-100">Publish Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl sm:rounded-[2rem] w-full max-w-2xl p-6 sm:p-10 shadow-2xl animate-scale-in my-auto border border-slate-100">
             <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-slate-50">
                <div>
                   <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight">Academic Grade</h2>
                   <p className="text-blue-600 font-bold text-[10px] mt-1 uppercase tracking-[0.2em]">{reviewingSubmission.profiles?.full_name} • Asset v{reviewingSubmission.version}</p>
                </div>
                <button onClick={() => window.open(reviewingSubmission.file_url, '_blank')} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   Open Submission
                </button>
             </div>
             
             <div className="space-y-4 mb-8 sm:mb-10">
               <div className="flex justify-between items-center">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assessment Narrative</label>
                  <button 
                    onClick={handleGenerateAI} 
                    disabled={isGeneratingAI}
                    className="text-[9px] sm:text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    {isGeneratingAI ? (
                      <span className="animate-pulse flex items-center gap-1">
                        <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Analyzing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 100-2h-1a1 1 0 100 2h1zM5.05 6.464A1 1 0 103.636 7.879l.707.707a1 1 0 001.414-1.414l-.707-.707zM5 10a1 1 0 100 2H4a1 1 0 100-2h1zM8 16v-1a1 1 0 10-2 0v1a1 1 0 102 0zM12 16v-1a1 1 0 10-2 0v1a1 1 0 102 0zM16.364 12.121a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" /></svg>
                        AI Insight
                      </span>
                    )}
                  </button>
               </div>
               <textarea rows={4} className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Provide feedback to guide the student..." value={feedback} onChange={e => setFeedback(e.target.value)} />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <button onClick={() => setReviewingSubmission(null)} className="py-3 sm:py-4 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase text-slate-400 hover:bg-slate-50 order-4 sm:order-1">Abort</button>
                <button onClick={() => updateSubmissionStatus('rejected')} className="bg-rose-950 text-rose-100 py-3 sm:py-4 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase shadow-lg shadow-rose-900/20 hover:bg-black hover:text-rose-500 transition-all border border-rose-900/50 order-1 sm:order-2">Reject Asset</button>
                <button onClick={() => updateSubmissionStatus('resubmission_requested')} className="bg-amber-500 text-white py-3 sm:py-4 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase shadow-lg shadow-amber-200/50 hover:bg-amber-600 transition-all order-2 sm:order-3">Request Revision</button>
                <button onClick={() => updateSubmissionStatus('approved')} className="bg-slate-900 text-white py-3 sm:py-4 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase shadow-lg shadow-slate-200/50 hover:bg-slate-800 transition-all order-3 sm:order-4">Approve</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
