import React, { useState, useEffect } from 'react';
import { X, Car, Calendar, History, Wrench, Edit3, Save, MessageSquare, Tag, Phone } from 'lucide-react';
import { Ticket } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { VehicleHistoryView } from './VehicleHistoryView';

interface VehicleCRMModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  settings?: any;
}

export function VehicleCRMModal({ isOpen, onClose, ticket, onUpdateNotes, settings }: VehicleCRMModalProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const primaryColor = settings?.theme_menu_highlight || '#10b981';
  const primaryBg = primaryColor.startsWith('#') && primaryColor.length === 7 ? `${primaryColor}20` : 'rgba(16, 185, 129, 0.2)';

  useEffect(() => {
    if (ticket) {
      setNotes(ticket.vehicle_notes || '');
      setIsEditingNotes(false);
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await onUpdateNotes(ticket.id, notes);
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 z-50">
      <div className="bg-zinc-50 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200 font-sans">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 md:p-8 flex items-start justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: `${primaryColor}20` }}></div>
          
          <div className="flex gap-5 relative z-10">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-inner">
              <Car className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black tracking-widest uppercase bg-white text-zinc-900 px-3 py-1 rounded-lg">
                  {ticket.id}
                </h2>
              </div>
              <p className="text-zinc-400 font-medium text-lg">{ticket.model}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors relative z-10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content using extracted component */}
          <div className="lg:col-span-2">
            <VehicleHistoryView ticket={ticket} settings={settings} />
          </div>

          {/* Right Column: Actions and Owner info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Notas Globales del Vehículo (Admin) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    Observaciones Internas
                  </h3>
                  {!isEditingNotes && (ticket.status !== 'Finalizado' && ticket.status !== 'Entregado') && (
                    <button onClick={() => setIsEditingNotes(true)} className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      className="w-full text-sm p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-purple-500 min-h-[120px] resize-none text-zinc-700"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditingNotes(false)} className="px-3 py-1.5 text-xs font-bold text-zinc-500">Cancelar</button>
                      <button onClick={handleSaveNotes} disabled={saving} className="px-3 py-1.5 text-xs font-bold bg-purple-600 text-white rounded-lg">
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 leading-relaxed italic">{ticket.vehicle_notes || 'Sin observaciones...'}</p>
                )}
            </div>

            {/* Ficha Dueño */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
              <h3 className="font-bold text-zinc-900 mb-4 text-xs uppercase tracking-widest text-zinc-400">Propietario</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">
                    {ticket.owner_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-black leading-none">Nombre</div>
                    <div className="font-bold text-zinc-900">{ticket.owner_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-zinc-900">{ticket.owner_phone}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
