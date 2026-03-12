import React, { useState, useEffect } from 'react';
import { parsePatientData } from '../services/geminiService';
import { appendPatientToSheet } from '../services/googleApiService';
import { Patient, PSICOLOGO_OPTIONS } from '../types';
import { Sparkles, FileSpreadsheet, Trash2, Loader2, Search, ChevronLeft, ChevronRight, UserPlus, UserCheck, CloudUpload, X } from 'lucide-react';

interface PatientManagerProps {
  patients: Patient[];
  onAddPatient: (patient: Patient) => void;
  onDeletePatient: (id: string) => void;
  isAuthenticated: boolean;
  spreadsheetId: string;
}

export const PatientManager: React.FC<PatientManagerProps> = ({ patients, onAddPatient, onDeletePatient, isAuthenticated, spreadsheetId }) => {
  const [inputText, setInputText] = useState('');
  const [selectedPsicologo, setSelectedPsicologo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, patients.length]);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    if (!selectedPsicologo) {
      setStatusMessage({ type: 'error', text: 'Selecciona el psicólogo antes de procesar.' });
      return;
    }
    
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      // 1. Parse with Gemini
      const parsedData = await parsePatientData(inputText);
      
      if (parsedData) {
        const newPatient: Patient = {
          id: crypto.randomUUID(),
          fecha: new Date().toLocaleDateString('es-ES'),
          ...parsedData,
          psicologo: selectedPsicologo, // dropdown always overrides AI
        };

        // 2. Send to Google Sheets if configured
        if (isAuthenticated && spreadsheetId) {
          try {
             await appendPatientToSheet(spreadsheetId, newPatient);
             // 3. Update local UI only if Sheet update was successful (or to reflect optimistic UI)
             onAddPatient(newPatient);
             setInputText('');
             setStatusMessage({ type: 'success', text: 'Paciente registrado en Google Sheets y localmente.' });
          } catch (sheetError) {
             console.error(sheetError);
             setStatusMessage({ type: 'error', text: 'Datos analizados, pero falló al guardar en Google Sheet. Revisa permisos/ID.' });
             // Still add locally so data isn't lost? Let's strictly require Sheet success for "Real Integration" feel, 
             // or add locally and warn. Let's add locally to be safe.
             onAddPatient(newPatient);
          }
        } else {
           // Offline/No-Auth mode
           onAddPatient(newPatient);
           setInputText('');
           setStatusMessage({ type: 'success', text: 'Paciente registrado localmente (Google Sheets no conectado).' });
        }

      } else {
        setStatusMessage({ type: 'error', text: 'No se pudo interpretar la información. Intenta ser más claro.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error al procesar.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Fecha", "Nombre", "Apellido", "Edad", "Documento", "Descripción", "Psicólogo", "Tipo"];
    const rows = patients.map(p => [
      p.fecha,
      p.nombre,
      p.apellido,
      p.edad,
      p.documentoIdentidad,
      `"${p.descripcion}"`,
      p.psicologo,
      p.tipo
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "matriz_pacientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Estás segura de que quieres eliminar a este paciente de la vista local?")) {
      onDeletePatient(id);
    }
  };

  const filteredPatients = patients.filter(patient => {
    const term = searchTerm.toLowerCase();
    const fullName = `${patient.nombre} ${patient.apellido}`.toLowerCase();
    return (
      fullName.includes(term) ||
      patient.fecha.includes(term) ||
      patient.psicologo.toLowerCase().includes(term) ||
      patient.documentoIdentidad.includes(term) ||
      patient.tipo.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Matriz de Pacientes</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-gray-500 dark:text-gray-400">Registra pacientes en tu Google Sheet.</p>
             {isAuthenticated && spreadsheetId ? (
               <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <CloudUpload size={10} /> Conectado a Sheets
               </span>
             ) : (
               <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">Modo Local</span>
             )}
          </div>
        </div>
        <button 
          onClick={exportToCSV}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <FileSpreadsheet size={18} />
          Exportar CSV
        </button>
      </header>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Psicólogo <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPsicologo}
            onChange={(e) => setSelectedPsicologo(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="">— Selecciona un psicólogo —</option>
            {PSICOLOGO_OPTIONS.map(p => (
              <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Entrada Rápida
        </label>
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ej: Laura nunez, 32, 40200564348, separacion, Dra Aurora (primera vez)"
            className="w-full h-32 p-4 bg-gray-800 dark:bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none text-white placeholder-gray-400 pb-16"
          />
          <button
            onClick={handleProcess}
            disabled={isProcessing || !inputText}
            className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all ${
              isProcessing || !inputText 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span className="hidden sm:inline">Procesando...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span className="hidden sm:inline">Procesar y Guardar</span>
                <span className="sm:hidden">Procesar</span>
              </>
            )}
          </button>
        </div>
        {statusMessage && (
          <p className={`text-sm mt-2 ${statusMessage.type === 'error' ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {statusMessage.text}
          </p>
        )}
      </div>

      {/* Filter & Table Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm shadow-sm"
            placeholder="Buscar por nombre, fecha o psicólogo..."
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Nombre Completo</th>
                  <th className="px-6 py-4">Edad</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Motivo</th>
                  <th className="px-6 py-4">Psicólogo</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      {searchTerm ? <span>No se encontraron resultados para "{searchTerm}".</span> : <span>No hay pacientes registrados.</span>}
                    </td>
                  </tr>
                ) : (
                  displayedPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{patient.fecha}</td>
                      <td className="px-6 py-4 font-bold text-base text-gray-900 dark:text-white whitespace-nowrap">
                        {patient.nombre} {patient.apellido}
                      </td>
                      <td className="px-6 py-4">{patient.edad}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">{patient.documentoIdentidad}</td>
                      <td className="px-6 py-4 max-w-xs truncate text-gray-500 dark:text-gray-400" title={patient.descripcion}>
                        {patient.descripcion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                          {patient.psicologo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          patient.tipo === 'Nuevo' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {patient.tipo === 'Nuevo' ? <UserPlus size={12} /> : <UserCheck size={12} />}
                          {patient.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(patient.id)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredPatients.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-750 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredPatients.length)}</span> de <span className="font-medium">{filteredPatients.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border border-gray-300 dark:border-gray-600 transition-all ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">/ {totalPages || 1}</span>
                </div>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`p-2 rounded-lg border border-gray-300 dark:border-gray-600 transition-all ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};