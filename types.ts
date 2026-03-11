export interface Patient {
  id: string;
  fecha: string;
  nombre: string;
  apellido: string;
  edad: number | string;
  documentoIdentidad: string;
  descripcion: string;
  psicologo: string;
  tipo: 'Nuevo' | 'Regular';
}

export interface Task {
  id: string;
  title: string;
  isDone: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string or human readable
  time: string;
  description?: string;
}

export interface Payment {
  id: string;
  fecha: string;
  paciente: string;
  monto: number;
  metodo: string; // Yape, Plin, Transferencia, Efectivo
  comprobanteUrl: string;
  driveFileId: string;
}

export interface WaitingListEntry {
  id: string;
  nombre: string;
  telefono: string;
  preferenciaHoraria: string; // ej: "Tardes", "Lunes", "Urgente"
  notas: string;
  fechaAgregado: number; // Timestamp for sorting
}

export interface NotebookAnalysisResult {
  tasks: Array<{ title: string; priority: 'High' | 'Medium' | 'Low' }>;
  events: Array<{ title: string; date: string; time: string; description: string }>;
}

export interface AppSettings {
  googleClientId: string;
  spreadsheetId: string;
  financeFolderId: string; // New: Folder ID for receipts
  theme: 'light' | 'dark';
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  PATIENTS = 'PATIENTS',
  NOTEBOOK = 'NOTEBOOK',
  FINANCE = 'FINANCE',
  WAITING_LIST = 'WAITING_LIST',
  SETTINGS = 'SETTINGS'
}