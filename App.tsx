import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PatientManager } from './components/PatientManager';
import { DigitalNotebook } from './components/DigitalNotebook';
import { FinanceManager } from './components/FinanceManager';
import { WaitingListManager } from './components/WaitingListManager'; // Import new component
import { Dashboard } from './components/Dashboard';
import { Patient, Task, CalendarEvent, ViewState, AppSettings, WaitingListEntry, Payment } from './types';
import {
  initGoogleServices, handleLogin, handleLogout, getUserProfile,
  createSpreadsheet, createPaymentsSpreadsheet, createDriveFolder, createTasksList, addTaskToTaskList,
  getCalendarsMap, syncPatientsToSheet, syncPaymentsToSheet, ensurePagosSheet
} from './services/googleApiService';
import { Settings as SettingsIcon, AlertCircle, Menu, HeartPulse, LogIn, Save, LogOut, Database, Moon, Sun, User, CheckCircle2, Loader2 } from 'lucide-react';

// Data Retention Configuration
const RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RETENTION_MS = RETENTION_DAYS * MS_PER_DAY;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // App State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]); // New State for Payments
  const [dataLoaded, setDataLoaded] = useState(false);

  // Auth & Settings State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // HARDCODED CLIENT ID PROVIDED BY USER
  const DEFAULT_CLIENT_ID = "472482673809-835ddcjiq0feub0kqqbg4r55sk5o3tgv.apps.googleusercontent.com";

  const [settings, setSettings] = useState<AppSettings>({
    googleClientId: localStorage.getItem('googleClientId') || DEFAULT_CLIENT_ID,
    spreadsheetId: localStorage.getItem('spreadsheetId') || '',
    paymentsSpreadsheetId: localStorage.getItem('paymentsSpreadsheetId') || '',
    financeFolderId: localStorage.getItem('financeFolderId') || '',
    taskListId: localStorage.getItem('taskListId') || '',
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  });
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStatus, setSetupStatus] = useState('');
  const [calendarIds, setCalendarIds] = useState<Map<string, string>>(new Map());

  // --- Persistence Logic ---

  // 1. Load data on mount
  useEffect(() => {
    const loadData = (key: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      const stored = localStorage.getItem(`app_data_${key}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const age = Date.now() - parsed.timestamp;
          
          if (age < RETENTION_MS) {
            setter(parsed.data);
          } else {
            console.log(`Data for ${key} expired. Clearing.`);
            localStorage.removeItem(`app_data_${key}`);
          }
        } catch (e) {
          console.error(`Error loading ${key}`, e);
        }
      }
    };

    loadData('patients', setPatients);
    loadData('tasks', setTasks);
    loadData('events', setEvents);
    loadData('waitingList', setWaitingList);
    loadData('payments', setPayments); // Load payments
    setDataLoaded(true);
  }, []);

  // 2. Save data on change
  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('app_data_patients', JSON.stringify({ timestamp: Date.now(), data: patients }));
  }, [patients, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('app_data_tasks', JSON.stringify({ timestamp: Date.now(), data: tasks }));
  }, [tasks, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('app_data_events', JSON.stringify({ timestamp: Date.now(), data: events }));
  }, [events, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('app_data_waitingList', JSON.stringify({ timestamp: Date.now(), data: waitingList }));
  }, [waitingList, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    localStorage.setItem('app_data_payments', JSON.stringify({ timestamp: Date.now(), data: payments }));
  }, [payments, dataLoaded]);

  // --- Theme Logic ---
  useEffect(() => {
    localStorage.setItem('theme', settings.theme);
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // --- End Persistence Logic ---

  useEffect(() => {
    if (settings.googleClientId) {
      initGoogleServices(settings.googleClientId, (success) => {
        setIsGapiReady(success);
      });
    }
  }, [settings.googleClientId]);

  const performFirstLoginSetup = async (currentPatients: Patient[], currentPayments: Payment[], currentTasks: Task[]) => {
    setIsSettingUp(true);
    let sheetId = localStorage.getItem('spreadsheetId') || '';
    let folderId = localStorage.getItem('financeFolderId') || '';
    let tListId = localStorage.getItem('taskListId') || '';
    
    // Paso 1
    if (!sheetId) {
      try {
        setSetupStatus('Creando Google Sheet...');
        sheetId = await createSpreadsheet();
        localStorage.setItem('spreadsheetId', sheetId);
        setSettings(prev => ({ ...prev, spreadsheetId: sheetId }));
      } catch (error) {
        console.error('Error creating spreadsheet:', error);
      }

      if (sheetId && currentPatients.length > 0) {
        try {
          setSetupStatus('Sincronizando pacientes...');
          await syncPatientsToSheet(sheetId, currentPatients);
        } catch (error) {
          console.error('Error syncing patients:', error);
        }
      }

      if (sheetId && currentPayments.length > 0) {
        try {
          setSetupStatus('Sincronizando pagos...');
          await syncPaymentsToSheet(sheetId, currentPayments);
        } catch (error) {
          console.error('Error syncing payments:', error);
        }
      }
    }

    // Paso 1b
    if (sheetId) {
      try {
        setSetupStatus('Asegurando hoja de pagos...');
        await ensurePagosSheet(sheetId);
      } catch (error) {
        console.error('Error ensuring pagos sheet:', error);
      }
    }

    // Paso 2
    if (!folderId) {
      try {
        setSetupStatus('Creando carpeta de comprobantes...');
        folderId = await createDriveFolder('Comprobantes Psicología');
        localStorage.setItem('financeFolderId', folderId);
        setSettings(prev => ({ ...prev, financeFolderId: folderId }));
      } catch (error) {
        console.error('Error creating drive folder:', error);
      }
    }

    // Paso 3
    if (!tListId) {
      try {
        setSetupStatus("Creando lista 'Idguie's task'...");
        tListId = await createTasksList("Idguie's task");
        localStorage.setItem('taskListId', tListId);
        setSettings(prev => ({ ...prev, taskListId: tListId }));
        
        if (currentTasks.length > 0) {
          setSetupStatus('Sincronizando tareas...');
          for (const task of currentTasks) {
            try { await addTaskToTaskList(tListId, task); } catch { /* skip */ }
          }
        }
      } catch (error) {
        console.error('Error creating tasks list:', error);
      }
    }

    // Paso 4
    try {
      setSetupStatus('Cargando calendarios...');
      const calMap = await getCalendarsMap();
      setCalendarIds(calMap);
    } catch (error) {
      console.error('Error loading calendars:', error);
    }

    setSetupStatus('¡Todo listo!');
    setTimeout(() => setIsSettingUp(false), 1200);
  };

  const onLogin = async () => {
    if (!isGapiReady) {
      setCurrentView(ViewState.SETTINGS);
      return;
    }
    try {
      await handleLogin();
      setIsAuthenticated(true);
      const profile = await getUserProfile();
      setUserProfile(profile);
      await performFirstLoginSetup(patients, payments, tasks);
    } catch (error) {
      alert("Fallo al iniciar sesión en Google");
    }
  };

  const onLogout = () => {
    handleLogout();
    setIsAuthenticated(false);
    setUserProfile(null);
    setCalendarIds(new Map());
  };

  const saveSettings = () => {
    const oldClientId = localStorage.getItem('googleClientId');
    localStorage.setItem('googleClientId', settings.googleClientId);
    localStorage.setItem('spreadsheetId', settings.spreadsheetId);
    localStorage.setItem('paymentsSpreadsheetId', settings.paymentsSpreadsheetId);
    localStorage.setItem('financeFolderId', settings.financeFolderId);
    localStorage.setItem('taskListId', settings.taskListId);
    
    if (oldClientId !== settings.googleClientId) {
      setIsGapiReady(false);
      onLogout(); // Force logout if client ID changes
      initGoogleServices(settings.googleClientId, (success) => {
        setIsGapiReady(success);
      });
    }
    
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const toggleTheme = () => {
    setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  // State handlers
  const handleAddPatient = (patient: Patient) => {
    setPatients(prev => [patient, ...prev]);
  };

  const handleDeletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const handleAddTasks = (newTasks: Task[]) => {
    setTasks(prev => [...prev, ...newTasks]);
  };

  const handleAddEvents = (newEvents: CalendarEvent[]) => {
    setEvents(prev => [...prev, ...newEvents]);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleAddWaitingEntry = (entry: WaitingListEntry) => {
    setWaitingList(prev => [...prev, entry]);
  };

  const handleRemoveWaitingEntry = (id: string) => {
    setWaitingList(prev => prev.filter(entry => entry.id !== id));
  };

  const handleAddPayment = (payment: Payment) => {
    setPayments(prev => [payment, ...prev]);
  };

  const handleDeletePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-teal-600">
          <HeartPulse size={24} />
          <span className="font-bold text-lg text-gray-800 dark:text-white">Idguie</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 w-full relative">
        {isSettingUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-700">
              <Loader2 size={40} className="text-teal-500 animate-spin" />
              <p className="text-gray-800 dark:text-white font-semibold text-lg text-center">Configurando tu cuenta</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center">{setupStatus}</p>
            </div>
          </div>
        )}
        {/* Top Bar: Auth Status */}
        <div className="flex flex-col sm:flex-row justify-end mb-4 gap-3 items-end sm:items-center">
           <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
              <Database size={12} />
              <span>Memoria local: {RETENTION_DAYS} días</span>
           </div>

          {!isAuthenticated ? (
            <button 
              onClick={onLogin} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isGapiReady 
                  ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700' 
                  : 'bg-teal-600 text-white hover:bg-teal-700 animate-pulse'
              }`}
            >
              <LogIn size={16} />
              {isGapiReady ? 'Iniciar Sesión Google' : 'Configurar Google Login'}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {userProfile && (
                <div className="flex items-center gap-2 mr-2">
                   {userProfile.picture ? (
                     <img src={userProfile.picture} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" />
                   ) : (
                     <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                       {userProfile.name ? userProfile.name.charAt(0) : <User size={16} />}
                     </div>
                   )}
                   <div className="hidden sm:block text-right">
                     <p className="text-xs font-bold text-gray-800 dark:text-white leading-none">{userProfile.name}</p>
                     <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{userProfile.email}</p>
                   </div>
                </div>
              )}
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg font-medium text-xs transition-all"
              >
                <LogOut size={14} />
                Salir
              </button>
            </div>
          )}
        </div>

        {/* API Key Warning Overlay - Gemini */}
        {!process.env.GEMINI_API_KEY && (
           <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
             <AlertCircle className="text-red-500 mt-0.5 shrink-0" />
             <div>
               <h4 className="font-bold text-red-700 dark:text-red-400">Falta la API Key de Gemini</h4>
               <p className="text-sm text-red-600 dark:text-red-300 break-words">
                 Esta aplicación requiere una Google Gemini API Key en el entorno.
               </p>
             </div>
           </div>
        )}

        {currentView === ViewState.DASHBOARD && (
          <Dashboard 
            patients={patients}
            tasks={tasks}
            events={events}
            onChangeView={setCurrentView}
          />
        )}

        {currentView === ViewState.PATIENTS && (
          <PatientManager 
            patients={patients}
            onAddPatient={handleAddPatient}
            onDeletePatient={handleDeletePatient}
            isAuthenticated={isAuthenticated}
            spreadsheetId={settings.spreadsheetId}
          />
        )}

        {currentView === ViewState.NOTEBOOK && (
          <DigitalNotebook 
            tasks={tasks}
            events={events}
            onAddTasks={handleAddTasks}
            onAddEvents={handleAddEvents}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onDeleteEvent={handleDeleteEvent}
            isAuthenticated={isAuthenticated}
            taskListId={settings.taskListId}
            calendarIds={calendarIds}
          />
        )}

        {currentView === ViewState.FINANCE && (
          <FinanceManager 
            isAuthenticated={isAuthenticated}
            spreadsheetId={settings.paymentsSpreadsheetId || settings.spreadsheetId}
            financeFolderId={settings.financeFolderId}
            payments={payments}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
          />
        )}

        {currentView === ViewState.WAITING_LIST && (
          <WaitingListManager 
            waitingList={waitingList}
            onAddEntry={handleAddWaitingEntry}
            onRemoveEntry={handleRemoveWaitingEntry}
          />
        )}

        {currentView === ViewState.SETTINGS && (
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                <SettingsIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Configuración</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Conecta tu cuenta de Google para activar la sincronización.</p>
              </div>
            </div>
            
            <div className="space-y-8">
              
              {/* Appearance Section */}
              <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.theme === 'dark' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                     {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Apariencia</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {settings.theme === 'dark' ? 'Modo Oscuro Activado' : 'Modo Claro Activado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-700 dark:text-white text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors shadow-sm"
                >
                  Cambiar Tema
                </button>
              </div>

              {/* Status Indicator */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${process.env.GEMINI_API_KEY ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      {process.env.GEMINI_API_KEY ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      <div>
                        <p className="font-bold text-sm">Gemini AI (Inteligencia)</p>
                        <p className="text-xs opacity-80">{process.env.GEMINI_API_KEY ? 'Conectado Correctamente' : 'Falta API Key'}</p>
                      </div>
                  </div>
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${isAuthenticated ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      {isAuthenticated ? <CheckCircle2 size={20} /> : <LogIn size={20} />}
                      <div>
                        <p className="font-bold text-sm">Google Workspace (Datos)</p>
                        <p className="text-xs opacity-80">{isAuthenticated ? `Conectado como ${userProfile?.name || 'Usuario'}` : 'Desconectado'}</p>
                      </div>
                  </div>
               </div>

              {/* Form */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white">Conexión con Google Cloud</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Para que el botón de "Iniciar Sesión" funcione, necesitas crear un identificador en Google Cloud. Esto autoriza a la app a guardar cosas en tu cuenta.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                     Google Client ID (OAuth 2.0) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={settings.googleClientId}
                    onChange={(e) => setSettings({...settings, googleClientId: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="xxxx-xxxx.apps.googleusercontent.com"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Sin esto, no podrás iniciar sesión.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Sheet ID (Pacientes)</label>
                    <input 
                      type="text" 
                      value={settings.spreadsheetId}
                      onChange={(e) => setSettings({...settings, spreadsheetId: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                      placeholder="1BxiMVs0XRA5nFMdKb..."
                    />
                     <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      El ID que aparece en la URL de tu hoja de cálculo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Sheet ID (Pagos)</label>
                    <input 
                      type="text" 
                      value={settings.paymentsSpreadsheetId}
                      onChange={(e) => setSettings({...settings, paymentsSpreadsheetId: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                      placeholder="1BxiMVs0XRA5nFMdKb..."
                    />
                     <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      El ID de la hoja de cálculo para la matriz de pagos.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drive Folder ID (Comprobantes)</label>
                    <input 
                      type="text" 
                      value={settings.financeFolderId}
                      onChange={(e) => setSettings({...settings, financeFolderId: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                      placeholder="1z-XXXXXXXXXXXXXXXXXXXX"
                    />
                     <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Opcional: Para guardar recibos en Drive.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end items-center gap-4">
                  {settingsSaved && (
                    <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium animate-in fade-in">
                      <CheckCircle2 size={16} />
                      ¡Configuración guardada!
                    </span>
                  )}
                  <button 
                    onClick={saveSettings}
                    className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-colors shadow-lg hover:shadow-teal-500/30"
                  >
                    <Save size={18} />
                    Guardar
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <LogIn size={16} />
                  ¿Cómo obtener el Client ID? (Solo una vez)
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-xs leading-relaxed opacity-90">
                  <li>Ve a <a href="https://console.cloud.google.com" target="_blank" className="underline font-semibold hover:text-blue-600">Google Cloud Console</a> e inicia sesión.</li>
                  <li>Crea un <strong>Nuevo Proyecto</strong> (ej: "Asistente Idguie").</li>
                  <li>En el menú, ve a <strong>APIs y Servicios &gt; Biblioteca</strong> y habilita:
                      <ul className="list-disc pl-4 mt-1 mb-1 font-mono text-[10px]">
                        <li>Google Sheets API</li>
                        <li>Google Tasks API</li>
                        <li>Google Calendar API</li>
                        <li>Google Drive API</li>
                      </ul>
                  </li>
                  <li>Ve a <strong>Pantalla de consentimiento de OAuth</strong>, selecciona "External" y rellena el nombre y correos.</li>
                  <li>Ve a <strong>Credenciales &gt; Crear Credenciales &gt; ID de cliente de OAuth</strong>.</li>
                  <li>Selecciona "Aplicación web". En "Orígenes autorizados de JavaScript", pon la URL de tu app (ej: <code>http://localhost:5173</code> si estás probando).</li>
                  <li>Copia el <strong>ID de cliente</strong> que te dan y pégalo arriba.</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;