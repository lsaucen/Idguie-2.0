import React, { useState } from 'react';
import { WaitingListEntry } from '../types';
import { Hourglass, UserPlus, Phone, Trash2, MessageCircle, Clock, CalendarClock } from 'lucide-react';

interface WaitingListManagerProps {
  waitingList: WaitingListEntry[];
  onAddEntry: (entry: WaitingListEntry) => void;
  onRemoveEntry: (id: string) => void;
}

export const WaitingListManager: React.FC<WaitingListManagerProps> = ({ waitingList, onAddEntry, onRemoveEntry }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preference, setPreference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newEntry: WaitingListEntry = {
      id: crypto.randomUUID(),
      nombre: name,
      telefono: phone,
      preferenciaHoraria: preference,
      notas: notes,
      fechaAgregado: Date.now()
    };

    onAddEntry(newEntry);
    setName('');
    setPhone('');
    setPreference('');
    setNotes('');
  };

  const handleWhatsAppClick = (entry: WaitingListEntry) => {
    // Basic phone cleaning
    const cleanPhone = entry.telefono.replace(/\D/g, ''); 
    
    // Construct message
    const message = `Hola ${entry.nombre}, te escribo del Centro de Bienestar. Se liberó un espacio en la agenda [AGREGAR HORA AQUÍ], ¿te interesa tomarlo?`;
    
    // Open WhatsApp
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Estás segura de que quieres eliminar a este paciente de la lista de espera?")) {
      onRemoveEntry(id);
    }
  };

  const formatWaitTime = (timestamp: number) => {
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Hace 1 día';
    return `Hace ${days} días`;
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      
      {/* Left Column: Form */}
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Hourglass className="text-teal-600 dark:text-teal-400" />
            Lista de Espera
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Registra pacientes interesados para cubrir cancelaciones de último minuto.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Paciente</label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full pl-10 p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                required
              />
            </div>
           </div>

           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono (WhatsApp)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 51999999999"
                className="w-full pl-10 p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                required
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Incluye código de país si es necesario (ej: 51 para Perú).</p>
           </div>

           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferencia Horaria</label>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={preference}
                onChange={(e) => setPreference(e.target.value)}
                placeholder="Ej: Solo mañanas, Martes tardes..."
                className="w-full pl-10 p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>
           </div>

           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas Adicionales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Paciente urgente..."
              className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm resize-none h-20"
            />
           </div>

           <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
           >
             <UserPlus size={18} />
             Agregar a Lista
           </button>
        </form>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
          <p className="font-bold mb-1">💡 Estrategia de Ingresos</p>
          <p>Cuando se libere un espacio, busca aquí a alguien con horario compatible y envíale un WhatsApp al instante.</p>
        </div>
      </div>

      {/* Right Column: List */}
      <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 dark:text-white">Pacientes en Espera ({waitingList.length})</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Ordenado por antigüedad</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {waitingList.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Hourglass size={48} className="mb-4 opacity-20" />
                <p>La lista de espera está vacía.</p>
              </div>
            )}

            {waitingList.map((entry) => (
              <div key={entry.id} className="group bg-white dark:bg-gray-750 border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-4">
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{entry.nombre}</h4>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} /> {formatWaitTime(entry.fechaAgregado)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-2">
                     <span className="font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded text-xs">
                        Pref: {entry.preferenciaHoraria || 'Sin preferencia'}
                     </span>
                     <span className="text-gray-400 dark:text-gray-500">|</span>
                     <span>{entry.telefono}</span>
                  </div>
                  {entry.notas && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">{entry.notas}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:border-l sm:border-gray-100 dark:sm:border-gray-600 sm:pl-4">
                  <button
                    onClick={() => handleWhatsAppClick(entry)}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                    title="Enviar WhatsApp de espacio libre"
                  >
                    <MessageCircle size={18} />
                    <span className="hidden sm:inline">Ofrecer Espacio</span>
                    <span className="sm:hidden">WhatsApp</span>
                  </button>
                  
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Eliminar de la lista"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};