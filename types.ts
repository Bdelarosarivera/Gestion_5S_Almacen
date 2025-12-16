export enum Rating {
  SI = 'SI',
  NO = 'NO',
  PARCIAL = 'PARCIAL',
  NA = 'N/A'
}

export interface Question {
  id: number;
  text: string;
}

export interface Answer {
  questionId: number;
  rating: Rating;
}

export interface AuditRecord {
  id: string;
  area: string;
  auditor: string;
  responsable?: string; // Person in charge of the area
  date: string; // ISO string
  answers: Answer[];
  score: number; // 0-100
}

export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'CLOSED';

export interface ActionItem {
  id: string;
  auditId: string;
  area: string;
  questionId: number;
  questionText: string;
  issueType: 'NO' | 'PARCIAL'; // Why was it created?
  suggestedAction: string;
  responsable: string;
  dueDate: string; // ISO string
  status: ActionStatus;
  comments?: string;
  createdAt: string;
}

export interface AppConfig {
  areas: string[];
  responsables: { name: string; area?: string }[];
  questions: Question[];
}

export type ViewState = 'home' | 'form' | 'dashboard' | 'history' | 'ai-editor' | 'consolidated' | 'actions' | 'settings';
