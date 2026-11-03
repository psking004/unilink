// AI feedback for faculty reviews.
// The Gemini API key never reaches the browser: this calls the FastAPI backend,
// which holds GEMINI_API_KEY and talks to Gemini server-side (POST /ai/feedback).

const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const FALLBACK_FEEDBACK =
  'Great effort on this assignment. Continue focusing on the core concepts discussed in class.';

export const getAIFeedback = async (
  assignmentTitle: string,
  assignmentDesc: string,
  submissionInfo: string
): Promise<string> => {
  try {
    const res = await fetch(`${API_URL}/ai/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_title: assignmentTitle,
        assignment_description: assignmentDesc,
        submission_info: submissionInfo,
      }),
    });
    if (!res.ok) throw new Error(`AI feedback request failed (${res.status})`);
    const data: { feedback?: string } = await res.json();
    return data.feedback || FALLBACK_FEEDBACK;
  } catch (error) {
    console.error('AI feedback error:', error);
    return FALLBACK_FEEDBACK;
  }
};
