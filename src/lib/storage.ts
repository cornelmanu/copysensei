import { User, Project, Document, ChatMessage, CopyGeneration } from '@/types';

// LocalStorage keys
const KEYS = {
  USER: 'copysensei_user',
  PROJECTS: 'copysensei_projects',
  DOCUMENTS: 'copysensei_documents',
  MESSAGES: 'copysensei_messages',
  GENERATIONS: 'copysensei_generations',
  CURRENT_PROJECT: 'copysensei_current_project',
};

// User operations
export const getUser = (): User | null => {
  const data = localStorage.getItem(KEYS.USER);
  return data ? JSON.parse(data) : null;
};

export const setUser = (user: User): void => {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const updateUserCredits = (credits: number): void => {
  const user = getUser();
  if (user) {
    user.credits = credits;
    setUser(user);
  }
};

export const clearUser = (): void => {
  localStorage.removeItem(KEYS.USER);
};

// Project operations
export const getProjects = (): Project[] => {
  const data = localStorage.getItem(KEYS.PROJECTS);
  return data ? JSON.parse(data) : [];
};

export const getProject = (id: string): Project | undefined => {
  const projects = getProjects();
  return projects.find(p => p.id === id);
};

export const saveProject = (project: Project): void => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
};

export const deleteProject = (id: string): void => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  
  // Clean up related data
  const messages = getMessages().filter(m => m.projectId !== id);
  localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));
  
  const documents = getDocuments().filter(d => d.projectId !== id);
  localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(documents));
};

export const getCurrentProjectId = (): string | null => {
  return localStorage.getItem(KEYS.CURRENT_PROJECT);
};

export const setCurrentProjectId = (id: string): void => {
  localStorage.setItem(KEYS.CURRENT_PROJECT, id);
};

// Document operations
export const getDocuments = (): Document[] => {
  const data = localStorage.getItem(KEYS.DOCUMENTS);
  return data ? JSON.parse(data) : [];
};

export const getProjectDocuments = (projectId: string): Document[] => {
  return getDocuments().filter(d => d.projectId === projectId);
};

export const saveDocument = (document: Document): void => {
  const documents = getDocuments();
  documents.push(document);
  localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(documents));
};

export const deleteDocument = (id: string): void => {
  const documents = getDocuments().filter(d => d.id !== id);
  localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(documents));
};

// Message operations
export const getMessages = (): ChatMessage[] => {
  const data = localStorage.getItem(KEYS.MESSAGES);
  return data ? JSON.parse(data) : [];
};

export const getProjectMessages = (projectId: string): ChatMessage[] => {
  return getMessages().filter(m => m.projectId === projectId);
};

export const saveMessage = (message: ChatMessage): void => {
  const messages = getMessages();
  messages.push(message);
  localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));
};

// Copy generation operations
export const getGenerations = (): CopyGeneration[] => {
  const data = localStorage.getItem(KEYS.GENERATIONS);
  return data ? JSON.parse(data) : [];
};

export const saveGeneration = (generation: CopyGeneration): void => {
  const generations = getGenerations();
  generations.push(generation);
  localStorage.setItem(KEYS.GENERATIONS, JSON.stringify(generations));
};
export const updateUser = (user: User): void => {
  setUser(user);
};
