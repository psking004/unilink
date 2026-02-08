
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const getAIFeedback = async (assignmentTitle: string, assignmentDesc: string, submissionInfo: string) => {
  try {
    // Initializing Gemini client inside the function to ensure fresh state/API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert academic tutor. A student has submitted work for the assignment "${assignmentTitle}".
      Assignment Description: ${assignmentDesc}
      Submission Context: ${submissionInfo}
      
      Generate a professional, constructive, and helpful feedback message for the student. 
      Limit to 3-4 sentences. Mention what they likely did well and where they can improve.`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      },
    });

    // Directly access the text property as per the latest SDK guidelines
    return response.text || "Great effort on this assignment. I have reviewed your work.";
  } catch (error) {
    console.error("Gemini AI Feedback Error:", error);
    return "Great effort on this assignment. Continue focusing on the core concepts discussed in class.";
  }
};
