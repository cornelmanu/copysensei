export interface User {
  id: string;
  email: string;
  credits: number;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  websiteUrl: string;
  toneOfVoice: ToneOfVoice;
  researchData: any;
  strategyBrief: string | null; // NEW: The synthesized strategy brief
  customNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type ToneOfVoice = 'professional' | 'casual' | 'friendly' | 'authoritative' | 'playful';

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  content: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType: 'chat' | 'copy_generation' | 'database_update';
  creditsUsed: number;
  createdAt: string;
}

export interface CopyGeneration {
  id: string;
  projectId: string;
  prompt: string;
  generatedCopy: string;
  creditsUsed: number;
  createdAt: string;
}
