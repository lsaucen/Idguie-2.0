import { GoogleGenAI, Type } from "@google/genai";
import { NotebookAnalysisResult, Patient } from "../types";

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set it in the Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

export const parsePatientData = async (inputText: string): Promise<Omit<Patient, 'id' | 'fecha'> | null> => {
  try {
    const ai = getAiClient();
    const modelId = "gemini-2.0-flash";

    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Extract patient information from the following text to populate a spreadsheet. 
      The input text is likely unstructured like "Laura nunez, 32, 40200564348, separacion, aurora".
      
      Input Text: "${inputText}"
      
      Rules:
      - Split names into 'nombre' and 'apellido' if possible.
      - 'documentoIdentidad' is the ID number.
      - 'descripcion' is the reason for consultation or problem.
      - 'psicologo' is the name of the doctor/therapist.
      - 'tipo': Determine if the patient is 'Nuevo' (New) or 'Regular' (Regular). If context implies first time (e.g., 'primera vez', 'evaluación', 'apertura'), use 'Nuevo'. If context implies follow-up (e.g., 'control', 'seguimiento', 'cita semanal'), use 'Regular'. Default to 'Nuevo' if unsure.
      - If a field is missing, return an empty string or 0.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nombre: { type: Type.STRING },
            apellido: { type: Type.STRING },
            edad: { type: Type.NUMBER },
            documentoIdentidad: { type: Type.STRING },
            descripcion: { type: Type.STRING },
            psicologo: { type: Type.STRING },
            tipo: { type: Type.STRING, enum: ["Nuevo", "Regular"] },
          },
          required: ["nombre", "apellido", "edad", "documentoIdentidad", "descripcion", "psicologo", "tipo"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Omit<Patient, 'id' | 'fecha'>;
    }
    return null;
  } catch (error) {
    console.error("Error parsing patient data:", error);
    throw error;
  }
};

export const parseNotebookEntry = async (inputText: string): Promise<NotebookAnalysisResult | null> => {
  try {
    const ai = getAiClient();
    const modelId = "gemini-2.0-flash";

    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayISO = new Date().toISOString().split('T')[0];

    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Eres un asistente de secretaría de un centro de psicología.
      Analiza la siguiente nota del usuario y extrae tareas (tasks) y eventos (events).
      
      Lista de psicólogos con sus calendarios exactos:
      - Aurora de la Oz       -> "Terapias Aurora"
      - Isabel Ruiz           -> "Terapia Adolescente (Isabel Ruiz)"
      - Ana Lucía             -> "Terapia Ana Lucia"
      - Ruth Rodríguez        -> "Terapia Ruth"
      - Julio Sánchez         -> "Terapia Sexologo"
      
      Fecha de hoy: ${today} (${todayISO})
      
      Reglas:
      - events: citas con fecha y hora. Si hay psicólogo, ponerlo en campo 'psicologo'. Default fecha = hoy (${todayISO}), default hora = "09:00".
      - tasks: pendientes. Extraer date/time si se mencionan, sino dejar "".
      - Prioridad: High=urgente, Low=rutinario, Medium=por defecto.
      
      Nota del usuario: "${inputText}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  date: { type: Type.STRING, description: "YYYY-MM-DD o vacío" },
                  time: { type: Type.STRING, description: "HH:MM o vacío" }
                }
              }
            },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  date: { type: Type.STRING, description: "YYYY-MM-DD format" },
                  time: { type: Type.STRING, description: "HH:MM format" },
                  description: { type: Type.STRING },
                  psicologo: { type: Type.STRING, description: "Nombre del psicólogo o vacío" }
                }
              }
            }
          }
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as NotebookAnalysisResult;
    }
    return null;
  } catch (error) {
    console.error("Error analyzing notebook:", error);
    throw error;
  }
};