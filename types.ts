
export type Role = 'teacher' | 'student' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  is_approved: boolean;
}

export interface Class {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
  // Included to support teacher profile lookup in joined queries (e.g., student catalog)
  profiles?: Profile;
}

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  file_url?: string;
  classes?: { name: string };
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'resubmission_requested';

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  status: SubmissionStatus;
  feedback?: string;
  submitted_at: string;
  version: number;
  profiles?: Profile;
  assignments?: Assignment;
}

export interface Notification {
  id: string;
  sender_id: string;
  receiver_role: 'all' | 'student' | 'teacher';
  message: string;
  created_at: string;
  type: 'alert' | 'info';
}
