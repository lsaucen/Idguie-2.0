import { Patient, Task, CalendarEvent, Payment } from "../types";

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Calendar name → keyword mapping for auto-routing events
const PSICOLOGO_CALENDAR_KEYWORDS: { calendarName: string; keywords: string[] }[] = [
  { calendarName: 'Terapias Aurora',               keywords: ['aurora de la oz', 'aurora'] },
  { calendarName: 'Terapia Adolescente (Isabel Ruiz)', keywords: ['isabel ruiz', 'isabel', 'adolescente'] },
  { calendarName: 'Terapia Ana Lucia',             keywords: ['ana lucia', 'ana lucía', 'ana'] },
  { calendarName: 'Terapia Ruth',                  keywords: ['ruth rodriguez', 'ruth rodríguez', 'ruth'] },
  { calendarName: 'Terapia Sexologo',              keywords: ['julio sanchez', 'julio sánchez', 'julio', 'sexologo', 'sexólogo'] },
];

const findCalendarId = (calendarMap: Map<string, string>, targetName: string): string | undefined => {
  const direct = calendarMap.get(targetName);
  if (direct) return direct;
  const normalTarget = normalize(targetName);
  for (const [name, id] of calendarMap) {
    if (normalize(name) === normalTarget) return id;
  }
  return undefined;
};

export const resolveCalendarIdForEvent = (event: CalendarEvent, calendarMap: Map<string, string>): string => {
  const searchText = normalize(`${event.title} ${event.description || ''} ${(event as any).psicologo || ''}`);
  for (const entry of PSICOLOGO_CALENDAR_KEYWORDS) {
    if (entry.keywords.some(kw => searchText.includes(normalize(kw)))) {
      return findCalendarId(calendarMap, entry.calendarName) || 'primary';
    }
  }
  return 'primary';
};

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

// Wait for window.gapi and window.google to be available (loaded via async defer scripts)
const waitForGoogleScripts = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi && window.google) {
      resolve();
      return;
    }
    let attempts = 0;
    const maxAttempts = 100; // up to 10 seconds
    const interval = setInterval(() => {
      attempts++;
      if (window.gapi && window.google) {
        clearInterval(interval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error("Google scripts no cargaron. Recarga la página e intenta de nuevo."));
      }
    }, 100);
  });
};

export const initGoogleServices = async (clientId: string, onInitComplete: (success: boolean) => void) => {
  try {
    await waitForGoogleScripts();
  } catch (error) {
    console.error(error);
    onInitComplete(false);
    return;
  }

  // Reset flags to allow re-initialization when Client ID changes
  gapiInited = false;
  gisInited = false;

  window.gapi.load('client', async () => {
    try {
      await window.gapi.client.init({
        discoveryDocs: DISCOVERY_DOCS,
      });
      gapiInited = true;
      checkInit();
    } catch (error) {
      console.error("Error initializing GAPI client", error);
      onInitComplete(false);
    }
  });

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: '',
    });
    gisInited = true;
    checkInit();
  } catch (error) {
    console.error("Error initializing GIS token client", error);
    onInitComplete(false);
  }

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
          return;
        }
        // Ensure we pass an object with access_token property
        window.gapi.client.setToken({ access_token: resp.access_token });
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
    window.gapi.client.setToken(null);
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
      range: 'Pacientes!A:H', // Assuming generic Sheet1, columns A to H
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

const buildTaskResource = (task: Task) => {
  const resource: any = {
    title: task.date ? `[${task.priority}] ${task.title} — ${task.date} ${task.time || ''}`.trim() : `[${task.priority}] ${task.title}`,
    status: task.isDone ? 'completed' : 'needsAction',
  };
  if (task.date) {
    resource.due = `${task.date}T${task.time || '00:00'}:00.000Z`;
  }
  return resource;
};

export const createGoogleTask = async (task: Task) => {
  try {
    const resource = buildTaskResource(task);
    resource.notes = "Creado desde Wellness Assistant Pro";
    
    const response = await window.gapi.client.tasks.tasks.insert({
      tasklist: '@default',
      resource: resource
    });
    return response.result;
  } catch (error) {
    console.error("Error creating task", error);
    throw error;
  }
};

// --- Google Calendar API ---

export const createGoogleCalendarEvent = async (event: CalendarEvent, calendarId: string = 'primary') => {
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
      calendarId: calendarId,
      resource: resource,
    });
    return response.result;
  } catch (error) {
    console.error("Error creating event", error);
    throw error;
  }
};

// --- Auto-Setup Functions ---

export const createSpreadsheet = async (): Promise<string> => {
  const createResponse = await window.gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: { title: 'Idguie - Psicología' },
      sheets: [
        { properties: { title: 'Pacientes' } },
      ],
    },
  });
  const spreadsheetId = createResponse.result.spreadsheetId;
  
  try {
    await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Pacientes!A1:H1', values: [['Fecha', 'Nombre', 'Apellido', 'Edad', 'Documento', 'Descripción', 'Psicólogo', 'Tipo']] },
        ],
      },
    });
  } catch (e) {
    console.warn("Non-fatal error setting headers:", e);
  }
  
  return spreadsheetId;
};

export const createPaymentsSpreadsheet = async (): Promise<string> => {
  const createResponse = await window.gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: { title: 'Matriz de Pagos' },
      sheets: [
        { properties: { title: 'Pagos' } },
      ],
    },
  });
  const spreadsheetId = createResponse.result.spreadsheetId;
  await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Pagos!A1:E1', values: [['Fecha', 'Paciente', 'Monto', 'Método', 'Comprobante URL']] },
      ],
    },
  });
  return spreadsheetId;
};

export const createDriveFolder = async (name: string): Promise<string> => {
  const response = await window.gapi.client.drive.files.create({
    resource: { name, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return response.result.id;
};

export const ensurePagosSheet = async (spreadsheetId: string): Promise<void> => {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId,
    });
    const sheets = response.result.sheets || [];
    const pagosSheetExists = sheets.some((s: any) => s.properties?.title === 'Pagos');

    if (!pagosSheetExists) {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Pagos',
                },
              },
            },
          ],
        },
      });

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Pagos!A1:E1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['Fecha', 'Paciente', 'Monto', 'Método', 'Comprobante URL']],
        },
      });
    }
  } catch (error) {
    console.error("Error ensuring Pagos sheet:", error);
    throw error;
  }
};

export const createTasksList = async (name: string): Promise<string> => {
  const response = await window.gapi.client.tasks.tasklists.insert({
    resource: { title: name },
  });
  return response.result.id;
};

export const addTaskToTaskList = async (taskListId: string, task: Task): Promise<void> => {
  await window.gapi.client.tasks.tasks.insert({
    tasklist: taskListId,
    resource: buildTaskResource(task),
  });
};

export const getCalendarsMap = async (): Promise<Map<string, string>> => {
  const response = await window.gapi.client.calendar.calendarList.list();
  const map = new Map<string, string>();
  for (const cal of response.result.items || []) {
    map.set(cal.summary, cal.id);
  }
  return map;
};

export const syncPatientsToSheet = async (spreadsheetId: string, patients: Patient[]): Promise<void> => {
  if (!patients.length) return;
  const values = patients.map(p => [p.fecha, p.nombre, p.apellido, p.edad, p.documentoIdentidad, p.descripcion, p.psicologo, p.tipo]);
  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Pacientes!A:H',
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
};

export const syncPaymentsToSheet = async (spreadsheetId: string, payments: Payment[]): Promise<void> => {
  if (!payments.length) return;
  const values = payments.map(p => [p.fecha, p.paciente, p.monto, p.metodo, p.comprobanteUrl]);
  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Pagos!A:E',
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
};