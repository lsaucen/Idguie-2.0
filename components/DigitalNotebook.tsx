import React, { useState } from 'react';
import { parseNotebookEntry } from '../services/geminiService';
import { addTaskToTaskList, createGoogleTask, createGoogleCalendarEvent, resolveCalendarIdForEvent } from '../services/googleApiService';
import { Task, CalendarEvent } from '../types';
import { Sparkles, CheckCircle2, Calendar, Clock, Loader2, Flag, Check, Trash2, AlertTriangle, X, CloudOff, Cloud } from 'lucide-react';

interface DigitalNotebookProps {
  tasks: Task[];
  events: CalendarEvent[];
  onAddTasks: (tasks: Task[]) => void;
  onAddEvents: (events: CalendarEvent[]) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  isAuthenticated: boolean;
  taskListId: string;
  calendarIds: Map<string, string>;
}

export const DigitalNotebook: React.FC<DigitalNotebookProps> = ({ 
  tasks, 
  events, 
  onAddTasks, 
  onAddEvents, 
  onToggleTask, 
  onDeleteTask,
  onDeleteEvent,
  isAuthenticated,
  taskListId,
  calendarIds
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualPriority, setManualPriority] = useState<'Auto' | 'High' | 'Medium' | 'Low'>('Auto');
  const [syncResult, setSyncResult] = useState<{ tasks: number; tasksFailed: number; events: number; eventsFailed: number } | null>(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, type: 'task' | 'event', id: string} | null>(null);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    try {
      // 1. Parse with Gemini
      const result = await parseNotebookEntry(inputText);
      
      if (result) {
        const newTasks: Task[] = result.tasks.map(t => ({
          id: crypto.randomUUID(),
          title: t.title,
          isDone: false,
          priority: manualPriority !== 'Auto' ? manualPriority : t.priority,
          date: t.date || undefined,
          time: t.time || undefined,
        }));

        const newEvents: CalendarEvent[] = result.events.map(e => ({
          id: crypto.randomUUID(),
          title: e.title,
          date: e.date,
          time: e.time,
          description: [e.description, e.psicologo ? `Psicólogo: ${e.psicologo}` : ''].filter(Boolean).join(' — ')
        }));

        // 2. Real Integration: Send to Google
        let tasksSynced = 0;
        let tasksFailed = 0;
        let eventsSynced = 0;
        let eventsFailed = 0;

        if (isAuthenticated) {
          for (const task of newTasks) {
            try {
              if (taskListId) {
                await addTaskToTaskList(taskListId, task);
              } else {
                await createGoogleTask(task);
              }
              tasksSynced++;
            } catch (e) {
              console.error("Failed to sync task", e);
              tasksFailed++;
            }
          }
          for (const event of newEvents) {
            try {
              const calId = resolveCalendarIdForEvent(event, calendarIds);
              await createGoogleCalendarEvent(event, calId);
              eventsSynced++;
            } catch (e) {
              console.error("Failed to sync event", e);
              eventsFailed++;
            }
          }
          setSyncResult({ tasks: tasksSynced, tasksFailed, events: eventsSynced, eventsFailed });
          setTimeout(() => setSyncResult(null), 6000);
        }

        // 3. Update Local UI
        onAddTasks(newTasks);
        onAddEvents(newEvents);
        setInputText('');
        setManualPriority('Auto');
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error al procesar la nota:\n${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-500';
      case 'Medium': return 'text-yellow-500';
      case 'Low': return 'text-gray-500';
      default: return 'text-indigo-500';
    }
  };

  const promptDelete = (type: 'task' | 'event', id: string) => {
    setDeleteModal({ isOpen: true, type, id });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    
    if (deleteModal.type === 'task') {
      onDeleteTask(deleteModal.id);
    } else {
      onDeleteEvent(deleteModal.id);
    }
    setDeleteModal(null);
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-auto lg:h-[calc(100vh-8rem)] relative">
      
      {/* Delete Confirmation Modal */}
      {deleteModal && deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 transform transition-all scale-100 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">¿Eliminar elemento?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
              ¿Estás seguro de que quieres eliminar este {deleteModal.type === 'task' ? 'tarea' : 'evento'}?
              Esta acción eliminará el elemento de tu vista local.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-md transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Column */}
      <div className="flex flex-col gap-6 h-full">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notebook Digital</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-gray-500 dark:text-gray-400">Tus notas se sincronizan automáticamente.</p>
             {isAuthenticated ? (
               <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <Check size={10} /> Sync On
               </span>
             ) : (
               <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">Sync Off</span>
             )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-[300px] lg:flex-1 transition-colors">
           <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ej: Tengo que llamar a Juan mañana a las 3pm, pagar la factura de luz y agendar cita con María el viernes..."
            className="w-full flex-1 p-6 bg-gray-800 dark:bg-gray-900 rounded-t-xl focus:outline-none resize-none text-white text-lg placeholder:text-gray-400 min-h-[200px]"
          />
          <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-xl">
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm w-full sm:w-auto">
                  <Flag size={16} className={getPriorityColor(manualPriority)} />
                  <select
                    value={manualPriority}
                    onChange={(e) => setManualPriority(e.target.value as any)}
                    className="bg-transparent text-sm text-gray-700 dark:text-gray-200 font-medium focus:outline-none cursor-pointer w-full sm:w-auto"
                  >
                    <option value="Auto" className="dark:bg-gray-800">Prioridad: Auto (IA)</option>
                    <option value="High" className="dark:bg-gray-800">Prioridad: Alta</option>
                    <option value="Medium" className="dark:bg-gray-800">Prioridad: Media</option>
                    <option value="Low" className="dark:bg-gray-800">Prioridad: Baja</option>
                  </select>
               </div>
             </div>
             
             <button
              onClick={handleProcess}
              disabled={isProcessing || !inputText}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all ${
                isProcessing || !inputText 
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-indigo-200 dark:hover:shadow-none'
              }`}
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Organizar & Sync
            </button>

            {/* Sync result banner */}
            {syncResult && (
              <div className={`flex flex-wrap items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                syncResult.tasksFailed === 0 && syncResult.eventsFailed === 0
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
              }`}>
                <Cloud size={14} className="shrink-0" />
                {syncResult.tasks > 0 && (
                  <span><strong>{syncResult.tasks}</strong> {syncResult.tasks === 1 ? 'tarea' : 'tareas'} → Google Tasks</span>
                )}
                {syncResult.tasks > 0 && syncResult.events > 0 && <span className="opacity-40">·</span>}
                {syncResult.events > 0 && (
                  <span><strong>{syncResult.events}</strong> {syncResult.events === 1 ? 'evento' : 'eventos'} → Google Calendar</span>
                )}
                {syncResult.tasksFailed + syncResult.eventsFailed > 0 && (
                  <span className="text-red-500 dark:text-red-400 ml-1">
                    ({syncResult.tasksFailed + syncResult.eventsFailed} fallaron)
                  </span>
                )}
                {syncResult.tasks === 0 && syncResult.events === 0 && (
                  <span>Sin elementos para sincronizar.</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Output Column */}
      <div className="flex flex-col gap-6 h-full overflow-hidden">
        
        {/* Google Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col max-h-[400px] lg:max-h-none lg:flex-1 overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                 <CheckCircle2 size={18} />
               </div>
               <h3 className="font-semibold text-gray-800 dark:text-white">Tareas (Google Tasks)</h3>
            </div>
            <span className="text-xs font-mono bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-gray-500 dark:text-gray-300">{tasks.filter(t => !t.isDone).length} pendientes</span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-2">
            {tasks.length === 0 && (
              <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">No hay tareas pendientes.</p>
            )}
            {tasks.map(task => (
              <div key={task.id} className="group flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                <button 
                  onClick={() => onToggleTask(task.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.isDone ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 dark:border-gray-500 hover:border-blue-400'
                  }`}
                >
                  {task.isDone && <CheckCircle2 size={12} />}
                </button>
                <span className={`flex-1 text-sm ${task.isDone ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                  {task.title}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                  task.priority === 'High' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300' : 
                  task.priority === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {task.priority}
                </span>
                <button 
                  onClick={() => promptDelete('task', task.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Google Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col max-h-[400px] lg:max-h-none lg:flex-1 overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
               <Calendar size={18} />
             </div>
             <h3 className="font-semibold text-gray-800 dark:text-white">Eventos (Calendar)</h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
             {events.length === 0 && (
              <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">No hay eventos próximos.</p>
            )}
            {events.map(event => (
              <div key={event.id} className="group flex gap-4 p-3 border border-gray-100 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-750 shadow-sm hover:shadow-md transition-shadow relative pr-10">
                <div className="flex-shrink-0 flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg w-14 h-14">
                  <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                  <span className="text-lg font-bold">{new Date(event.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <Clock size={12} />
                    {event.time}
                  </div>
                  {event.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{event.description}</p>
                  )}
                </div>
                <button 
                  onClick={() => promptDelete('event', event.id)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};