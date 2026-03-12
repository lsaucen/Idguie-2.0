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
  date?: string;
  time?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description?: string;
}

export interface Payment {
  id: string;
  fecha: string;
  paciente: string;
  monto: number;
  metodo: string;
  comprobanteUrl: string;
  driveFileId: string;
}

export interface WaitingListEntry {
  id: string;
  nombre: string;
  telefono: string;
  preferenciaHoraria: string;
  notas: string;
  fechaAgregado: number;
}

export interface NotebookAnalysisResult {
  tasks: Array<{ title: string; priority: 'High' | 'Medium' | 'Low'; date?: string; time?: string }>;
  events: Array<{ title: string; date: string; time: string; description: string; psicologo?: string }>;
}

export interface AppSettings {
  googleClientId: string;
  spreadsheetId: string;
  paymentsSpreadsheetId: string;
  financeFolderId: string;
  taskListId: string;
  theme: 'light' | 'dark';
}

export const PSICOLOGO_OPTIONS: { nombre: string; calendario: string }[] = [
  { nombre: 'Aurora de la Oz',  calendario: 'Terapias Aurora' },
  { nombre: 'Isabel Ruiz',      calendario: 'Terapia Adolescente (Isabel Ruiz)' },
  { nombre: 'Ana Lucía',        calendario: 'Terapia Ana Lucía' },
  { nombre: 'Ruth Rodríguez',   calendario: 'Terapia Ruth' },
  { nombre: 'Julio Sánchez',    calendario: 'Terapia Sexólogo' },
];

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  PATIENTS = 'PATIENTS',
  NOTEBOOK = 'NOTEBOOK',
  FINANCE = 'FINANCE',
  WAITING_LIST = 'WAITING_LIST',
  SETTINGS = 'SETTINGS'
}
