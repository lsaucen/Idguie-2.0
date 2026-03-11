import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Users, BookOpen, Settings, HeartPulse, X, DollarSign, Hourglass } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onCloseMobile }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Inicio', icon: LayoutDashboard },
    { id: ViewState.PATIENTS, label: 'Matriz Pacientes', icon: Users },
    { id: ViewState.WAITING_LIST, label: 'Lista de Espera', icon: Hourglass },
    { id: ViewState.FINANCE, label: 'Finanzas & Pagos', icon: DollarSign },
    { id: ViewState.NOTEBOOK, label: 'Notebook Digital', icon: BookOpen },
    { id: ViewState.SETTINGS, label: 'Configuración', icon: Settings },
  ];

  const handleNavigation = (id: ViewState) => {
    onChangeView(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-shrink-0 flex flex-col h-full shadow-sm z-10 relative transition-colors duration-200">
      {/* Mobile Close Button - visible only on mobile context usually handled by parent, but nice to have accessible */}
      <div className="md:hidden absolute top-4 right-4">
        <button onClick={onCloseMobile} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 flex items-center gap-3 text-teal-600">
        <HeartPulse size={32} />
        <div>
          <h1 className="font-bold text-lg tracking-tight text-gray-800 dark:text-white">Idguie</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Asistente Administrativo</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              currentView === item.id
                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 shadow-sm ring-1 ring-teal-100 dark:ring-teal-800'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <item.icon size={20} className={currentView === item.id ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400 dark:text-gray-500'} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium mb-1">Tip del día</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
            Revisa la lista de espera antes de cerrar el día para rellenar huecos.
          </p>
        </div>
      </div>
    </div>
  );
};