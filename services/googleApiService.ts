import { Patient, Task, CalendarEvent, Payment } from "../types";

// Declare globals for Google Scripts loaded in HTML
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Added drive scope and userinfo scopes
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

const DISCOVERY_DOCS = [
  "https://sheets.googleapis.com/$discovery/rest?version=v4",
  "https://tasks.googleapis.com/$discovery/rest?version=v1",
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  "https://www.googleapis.com/discovery/v1/apis/oauth2/v1/rest"
];

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleServices = (clientId: string, onInitComplete: (success: boolean) => void) => {
  if (!window.gapi || !window.google) {
    console.error("Google scripts not loaded");
    return;
  }

  window.gapi.load('client', async () => {
    try {
      await window.gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
      });
      gapiInited = true;
      checkInit();
    } catch (error) {
      console.error("Error initializing GAPI client", error);
    }
  });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: '', // defined at request time
  });
  gisInited = true;
  checkInit();

  function checkInit() {
    if (gapiInited && gisInited) {
      onInitComplete(true);
    }
  }
};

export const handleLogin = async (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
        }
        resolve(true);
      };

      if (window.gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
      }
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
};

export const handleLogout = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
};

export const getUserProfile = async () => {
  try {
    const response = await window.gapi.client.oauth2.userinfo.get();
    return response.result;
  } catch (error) {
    console.error("Error fetching user profile", error);
    return null;
  }
};

// --- Google Sheets API ---

export const appendPatientToSheet = async (spreadsheetId: string, patient: Patient) => {
  if (!spreadsheetId) throw new Error("ID de hoja de cálculo no configurado");
  
  const values = [
    [
      patient.fecha,
      patient.nombre,
      patient.apellido,
      patient.edad,
      patient.documentoIdentidad,
      patient.descripcion,
      patient.psicologo,
      patient.tipo
    ]
  ];

  const body = {
    values: values,
  };

  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'Sheet1!A:H', // Assuming generic Sheet1, columns A to H
      valueInputOption: 'USER_ENTERED',
      resource: body,
    });
    return response.result;
  } catch (error) {
    console.error("Error adding to sheet", error);
    throw error;
  }
};

export const appendPaymentToSheet = async (spreadsheetId: string, payment: Payment) => {
  if (!spreadsheetId) throw new Error("ID de hoja de cálculo no configurado");

  // We assume a specific sheet named 'Pagos' exists or needs to be created.
  // For simplicity, we try to append to 'Pagos!A:E'.
  const values = [
    [
      payment.fecha,
      payment.paciente,
      payment.monto,
      payment.metodo,
      payment.comprobanteUrl
    ]
  ];

  const body = {
    values: values,
  };

  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'Pagos!A:E', 
      valueInputOption: 'USER_ENTERED',
      resource: body,
    });
    return response.result;
  } catch (error) {
    console.error("Error adding payment to sheet", error);
    throw error;
  }
};

// --- Google Drive API (File Upload) ---

export const uploadFileToDrive = async (file: File, folderId: string): Promise<{ id: string; webViewLink: string }> => {
  const accessToken = window.gapi.client.getToken().access_token;

  const metadata = {
    name: `Comprobante_${new Date().toISOString().split('T')[0]}_${file.name}`,
    mimeType: file.type,
    parents: folderId ? [folderId] : [] // If no folder ID, uploads to root
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  try {
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Drive Upload Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data; // returns { id, webViewLink }
  } catch (error) {
    console.error("Error uploading to Drive", error);
    throw error;
  }
};

// --- Google Tasks API ---

export const createGoogleTask = async (task: Task) => {
  try {
    const response = await window.gapi.client.tasks.tasks.insert({
      tasklist: '@default',
      resource: {
        title: `[${task.priority}] ${task.title}`,
        notes: "Creado desde Wellness Assistant Pro"
      }
    });
    return response.result;
  } catch (error) {
    console.error("Error creating task", error);
    throw error;
  }
};

// --- Google Calendar API ---

export const createGoogleCalendarEvent = async (event: CalendarEvent) => {
  // Construct ISO datetime strings
  // Assuming 'date' is YYYY-MM-DD and 'time' is HH:MM
  const startDateTime = new Date(`${event.date}T${event.time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

  const resource = {
    summary: event.title,
    description: event.description || "Agendado vía Wellness Assistant",
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  try {
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: resource,
    });
    return response.result;
  } catch (error) {
    console.error("Error creating event", error);
    throw error;
  }
};