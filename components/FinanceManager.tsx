import React, { useState } from 'react';
import { uploadFileToDrive, appendPaymentToSheet } from '../services/googleApiService';
import { Payment } from '../types';
import { 
  DollarSign, Upload, CheckCircle2, AlertCircle, Loader2, 
  Image as ImageIcon, ExternalLink, Calendar, Search,
  CreditCard, Smartphone, Banknote, ArrowRightLeft, ChevronDown, CloudOff, Cloud, Trash2
} from 'lucide-react';

interface FinanceManagerProps {
  isAuthenticated: boolean;
  spreadsheetId: string;
  financeFolderId: string;
  payments: Payment[];
  onAddPayment: (payment: Payment) => void;
  onDeletePayment: (id: string) => void;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({ 
  isAuthenticated, 
  spreadsheetId, 
  financeFolderId,
  payments,
  onAddPayment,
  onDeletePayment
}) => {
  const [amount, setAmount] = useState('');
  const [patientName, setPatientName] = useState('');
  const [method, setMethod] = useState('Transferencia');
  const [file, setFile] = useState<File | null>(null);
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'success_local' | 'error'>('idle');
  const [lastPaymentLink, setLastPaymentLink] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const paymentMethods = [
    { id: 'Transferencia', icon: ArrowRightLeft, color: 'text-blue-600 dark:text-blue-400', label: 'Transferencia Bancaria' },
    { id: 'Yape', icon: Smartphone, color: 'text-purple-600 dark:text-purple-400', label: 'Yape' },
    { id: 'Plin', icon: Smartphone, color: 'text-cyan-600 dark:text-cyan-400', label: 'Plin' },
    { id: 'Efectivo', icon: Banknote, color: 'text-green-600 dark:text-green-400', label: 'Efectivo' },
    { id: 'Tarjeta', icon: CreditCard, color: 'text-gray-600 dark:text-gray-400', label: 'Tarjeta Crédito/Débito' }
  ];

  const selectedMethodData = paymentMethods.find(m => m.id === method) || paymentMethods[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !patientName) {
      alert("Por favor completa el nombre y el monto.");
      return;
    }

    setStatus('uploading');

    let finalUrl = '';
    let finalDriveId = '';
    let syncSuccess = false;

    try {
      // 1. Handle File (Cloud vs Local)
      if (file) {
        if (isAuthenticated) {
          try {
            const driveResponse = await uploadFileToDrive(file, financeFolderId);
            finalUrl = driveResponse.webViewLink;
            finalDriveId = driveResponse.id;
          } catch (error) {
            console.error("Fallo subida a Drive, usando local:", error);
            finalUrl = URL.createObjectURL(file); // Fallback local
          }
        } else {
          finalUrl = URL.createObjectURL(file); // Local mode
        }
      }

      const newPayment: Payment = {
        id: crypto.randomUUID(),
        fecha: new Date().toLocaleDateString('es-ES'),
        paciente: patientName,
        monto: parseFloat(amount),
        metodo: method,
        comprobanteUrl: finalUrl,
        driveFileId: finalDriveId
      };

      // 2. Append to Sheets (Cloud)
      if (isAuthenticated && spreadsheetId) {
        try {
          await appendPaymentToSheet(spreadsheetId, newPayment);
          syncSuccess = true;
        } catch (error) {
          console.error("Fallo guardar en Sheet:", error);
          syncSuccess = false;
        }
      }

      // 3. Update Local State (Always happens)
      onAddPayment(newPayment);

      if (isAuthenticated && syncSuccess && finalDriveId) {
        setStatus('success');
        setLastPaymentLink(finalUrl);
      } else {
        setStatus('success_local');
        setLastPaymentLink(null);
      }
      
      // Reset form
      setAmount('');
      setPatientName('');
      setFile(null);
      setTimeout(() => setStatus('idle'), 5000);

    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Estás segura de que quieres eliminar este registro de pago de la vista local?")) {
      onDeletePayment(id);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.metodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fecha.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign className="text-teal-600 dark:text-teal-400" />
          Finanzas & Pagos
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-gray-500 dark:text-gray-400">Registra ingresos y visualiza el historial de pagos.</p>
          {isAuthenticated ? (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Cloud size={10} /> Sincronizado
            </span>
          ) : (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CloudOff size={10} /> Local
            </span>
          )}
        </div>
      </header>

      {/* Warning if no Drive Folder configured */}
      {isAuthenticated && !financeFolderId && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Carpeta de Drive no configurada</p>
            <p className="text-sm">Ve a configuración y agrega el ID de la carpeta de Google Drive donde quieres guardar las imágenes.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full pb-4">
        
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-5">
            <h3 className="font-semibold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">Nuevo Ingreso</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Paciente</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Ej: Laura Nuñez"
                className="w-full p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>
              
              {/* Custom Dropdown for Method */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método</label>
                
                <button
                  type="button"
                  onClick={() => setIsMethodOpen(!isMethodOpen)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 h-[42px]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <selectedMethodData.icon size={16} className={`${selectedMethodData.color}`} />
                    <span className="text-gray-700 dark:text-gray-200 truncate">{selectedMethodData.id}</span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isMethodOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Backdrop for click outside */}
                {isMethodOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setIsMethodOpen(false)} />
                )}

                {/* Dropdown Menu */}
                {isMethodOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 rounded-xl shadow-xl max-h-64 overflow-auto p-1 animate-in fade-in zoom-in-95 duration-100 left-0">
                    {paymentMethods.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setMethod(m.id); setIsMethodOpen(false); }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${
                            method === m.id ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className={`p-1.5 rounded-md ${method === m.id ? 'bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              <m.icon size={16} />
                          </div>
                          <div className="flex flex-col items-start">
                             <span className="font-medium leading-none">{m.id}</span>
                             <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{m.label}</span>
                          </div>
                          {method === m.id && <CheckCircle2 size={14} className="ml-auto text-teal-600 dark:text-teal-400" />}
                        </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Comprobante</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-medium overflow-hidden w-full justify-center">
                    <ImageIcon size={20} className="shrink-0" />
                    <span className="truncate text-sm">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-teal-50 dark:bg-teal-900/30 p-2 rounded-full mb-2 text-teal-600 dark:text-teal-400">
                      <Upload size={20} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Haz clic para subir imagen</p>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'uploading'}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-white shadow-sm flex items-center justify-center gap-2 transition-all ${
                status === 'uploading' 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-wait' 
                  : 'bg-teal-600 hover:bg-teal-700 hover:shadow-md dark:bg-teal-600 dark:hover:bg-teal-500'
              }`}
            >
              {status === 'uploading' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Registrar Pago
                </>
              )}
            </button>

            {status === 'success' && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm flex flex-col items-start gap-1">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={14} />
                  ¡Guardado y Sincronizado!
                </div>
                {lastPaymentLink && (
                  <a href={lastPaymentLink} target="_blank" rel="noreferrer" className="text-xs underline flex items-center gap-1">
                    Ver en Drive <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}

            {status === 'success_local' && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm flex flex-col items-start gap-1">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={14} />
                  Guardado Localmente
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">El pago se guardó en este dispositivo (no en Google Sheet).</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                Error al procesar. Intenta nuevamente.
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: TABLE */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
             
             {/* Search Header */}
             <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-semibold text-gray-800 dark:text-white">Historial de Pagos</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar pago..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-1 focus:ring-teal-500 outline-none w-full sm:w-48"
                  />
                </div>
             </div>

             {/* Table Content */}
             <div className="flex-1 overflow-y-auto">
               <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">Fecha</th>
                      <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">Paciente</th>
                      <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">Método</th>
                      <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-right">Monto</th>
                      <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-center">Recibo</th>
                      <th className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                          {searchTerm ? 'No se encontraron pagos.' : 'No hay pagos registrados aún.'}
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-gray-400" />
                              {payment.fecha}
                            </div>
                          </td>
                          <td className="px-6 py-3 font-medium text-gray-800 dark:text-gray-200">{payment.paciente}</td>
                          <td className="px-6 py-3">
                             <span className={`px-2 py-0.5 rounded text-xs ${
                                payment.metodo === 'Transferencia' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                payment.metodo === 'Efectivo' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                             }`}>
                               {payment.metodo}
                             </span>
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                            ${payment.monto.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {payment.comprobanteUrl ? (
                              <a 
                                href={payment.comprobanteUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center justify-center p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded transition-colors"
                                title="Ver comprobante"
                              >
                                <ExternalLink size={16} />
                              </a>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                               onClick={() => handleDelete(payment.id)}
                               className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                               title="Eliminar registro"
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
             
             {/* Footer Summary */}
             <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 text-right">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Total en vista:</span>
                <span className="text-lg font-bold text-gray-800 dark:text-white">
                  ${filteredPayments.reduce((acc, curr) => acc + curr.monto, 0).toFixed(2)}
                </span>
             </div>

           </div>
        </div>

      </div>
    </div>
  );
};