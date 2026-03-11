import React from 'react';
import { Patient, Task, CalendarEvent } from '../types';
import { Users, CheckSquare, CalendarDays, ArrowRight, TrendingUp, Activity } from 'lucide-react';

interface DashboardProps {
  patients: Patient[];
  tasks: Task[];
  events: CalendarEvent[];
  onChangeView: (view: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ patients, tasks, events, onChangeView }) => {
  const pendingTasks = tasks.filter(t => !t.isDone).length;
  const todayPatients = patients.length; 
  // Assuming 'patients' list is from today in this simplified demo context for the card count, 
  // but let's use the actual list length as "Total Registered" for the card to be more impressive in demo.

  // Helper to parse DD/MM/YYYY
  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  };

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Statistics: Top Psychologists (Last 7 days)
  const recentPatients = patients.filter(p => {
    const pDate = parseDate(p.fecha);
    return pDate >= oneWeekAgo && pDate <= now;
  });

  const psychologistCounts: Record<string, number> = {};
  recentPatients.forEach(p => {
    const name = p.psicologo || 'Sin asignar';
    psychologistCounts[name] = (psychologistCounts[name] || 0) + 1;
  });

  const topPsychologists = Object.entries(psychologistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
    
  const maxPsychCount = topPsychologists.length > 0 ? topPsychologists[0][1] : 1;

  // Statistics: Top Reasons (All time)
  const reasonCounts: Record<string, number> = {};
  patients.forEach(p => {
    const reason = (p.descripcion || 'Sin descripción').toLowerCase().trim();
    // Truncate if too long for display
    const cleanReason = reason.length > 20 ? reason.substring(0, 20) + '...' : reason;
    reasonCounts[cleanReason] = (reasonCounts[cleanReason] || 0) + 1;
  });

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Hola, Idguie 💚</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base">Aquí tienes el resumen de tu día en el centro de bienestar.</p>
        </div>
        <div className="text-left md:text-right">
           <p className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Fecha Actual</p>
           <p className="text-lg md:text-xl font-semibold text-gray-700 dark:text-gray-300 capitalize">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pacientes Totales</p>
            <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{todayPatients}</p>
          </div>
          <button onClick={() => onChangeView('PATIENTS')} className="text-teal-600 dark:text-teal-400 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
            Ver Matriz <ArrowRight size={16} />
          </button>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckSquare size={64} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tareas Pendientes</p>
            <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{pendingTasks}</p>
          </div>
          <button onClick={() => onChangeView('NOTEBOOK')} className="text-blue-600 dark:text-blue-400 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
            Ir al Notebook <ArrowRight size={16} />
          </button>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-40 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CalendarDays size={64} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Próximos Eventos</p>
            <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{events.length}</p>
          </div>
           <button onClick={() => onChangeView('NOTEBOOK')} className="text-orange-600 dark:text-orange-400 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
            Ver Calendario <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Statistics Column (New) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-8 order-2 lg:order-1">
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <TrendingUp size={16} className="text-teal-600 dark:text-teal-400"/>
                    Motivos Frecuentes
                </h3>
                <div className="space-y-3">
                    {topReasons.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No hay datos suficientes.</p>
                    ) : (
                        topReasons.map(([reason, count], idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <span className="text-sm text-gray-600 dark:text-gray-300 capitalize group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">{reason}</span>
                                <span className="text-xs font-bold bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full">{count}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

             <div className="pt-6 border-t border-gray-50 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Activity size={16} className="text-blue-600 dark:text-blue-400"/>
                    Psicólogos (7 días)
                </h3>
                <div className="space-y-4">
                    {topPsychologists.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No hay citas recientes.</p>
                    ) : (
                        topPsychologists.map(([name, count], idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{name}</span>
                                    <span className="text-gray-400 dark:text-gray-500">{count} citas</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500" 
                                        style={{ width: `${(count / maxPsychCount) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Recent Activity Column */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-1 order-1 lg:order-2">
           <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
               Actividad Reciente
           </h3>
           <div className="space-y-4">
             {patients.slice(0, 5).map(p => (
               <div key={p.id} className="flex items-center gap-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 transition-colors -mx-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${p.tipo === 'Nuevo' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                    {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.nombre} {p.apellido}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                       {p.psicologo} 
                       <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span> 
                       {p.fecha}
                    </p>
                  </div>
               </div>
             ))}
             {patients.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 italic">No hay actividad reciente.</p>}
           </div>
        </div>

        {/* CTA / Help Column */}
        <div className="bg-gradient-to-br from-teal-600 to-cyan-700 dark:from-teal-800 dark:to-cyan-900 rounded-2xl p-6 md:p-8 text-white flex flex-col justify-center items-start lg:col-span-1 order-3 shadow-md">
           <h3 className="text-xl font-bold mb-2">¿Necesitas ayuda?</h3>
           <p className="text-teal-100 mb-6 text-sm">
             Optimiza tu tiempo. Usa el Notebook Digital para organizar tu día con IA.
           </p>
           <button onClick={() => onChangeView('NOTEBOOK')} className="bg-white text-teal-700 px-6 py-2 rounded-lg font-semibold shadow-lg hover:bg-teal-50 transition-colors w-full sm:w-auto text-center">
             Crear Tarea
           </button>
           
           <div className="mt-8 pt-6 border-t border-white/20 w-full">
             <p className="text-xs text-teal-200 font-medium uppercase mb-2">Tip de Eficiencia</p>
             <p className="text-sm text-white/90 italic">
               "Puedes pegar un texto largo de un correo en la Matriz de Pacientes y la IA extraerá los datos por ti."
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};