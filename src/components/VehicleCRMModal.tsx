import React, { useState, useEffect } from 'react';
import { X, Car, Calendar, History, Wrench, Edit3, Save, MessageSquare, Tag, Phone } from 'lucide-react';
import { Ticket, ServiceLogEntry } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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

  const pastVisits = ticket.service_log || [];
  const totalVisits = pastVisits.length + 1; // Past visits + current visit
  const firstVisitDate = pastVisits.length > 0 ? pastVisits[0].date : ticket.entry_date;

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
      <div className="bg-zinc-50 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 md:p-8 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: `${primaryColor}20` }}></div>
          
          <div className="flex gap-5 relative z-10">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-inner">
              <Car className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black tracking-widest uppercase bg-white text-zinc-900 px-3 py-1 rounded-lg shadow-sm border-2 border-zinc-200">
                  {ticket.id}
                </h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border" style={{ backgroundColor: primaryBg, color: primaryColor, borderColor: `${primaryColor}30` }}>
                  {totalVisits} {totalVisits === 1 ? 'Visita' : 'Visitas'}
                </span>
              </div>
              <p className="text-zinc-400 font-medium text-lg">{ticket.model}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500 font-medium">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Primer ingreso: {format(parseISO(firstVisitDate), "MMM yyyy", { locale: es })}</span>
                {ticket.vin && <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> VIN: {ticket.vin}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors relative z-10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Observaciones y Detalles del Vehículo */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Notas Globales del Vehículo */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 flex flex-col h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Observaciones
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
                    className="w-full text-sm p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 min-h-[120px] resize-none text-zinc-700"
                    placeholder="Ej: Cliente pide descuento, pierde aceite crónico..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setNotes(ticket.vehicle_notes || '');
                        setIsEditingNotes(false);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                  {ticket.vehicle_notes ? ticket.vehicle_notes : <span className="text-zinc-400 italic">Sin observaciones registradas...</span>}
                </div>
              )}
            </div>

            {/* Resumen Financiero */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
              <h3 className="font-bold text-zinc-900 mb-4 text-xs uppercase tracking-widest text-zinc-400">Resumen Financiero</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-black">Inversión Total</div>
                  <div className="text-xl font-black text-zinc-900">
                    ${(pastVisits.reduce((acc, v) => acc + (v.cost || 0), 0) + (ticket.cost || 0)).toLocaleString('es-CL')}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
                  <Tag className="w-5 h-5 text-zinc-400" />
                </div>
              </div>
            </div>

            {/* Ficha Dueño */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
              <h3 className="font-bold text-zinc-900 mb-4 text-xs uppercase tracking-widest text-zinc-400 relative z-10">Propietario</h3>
              <div className="space-y-4 relative z-10">
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
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-black leading-none">Teléfono</div>
                    <div className="font-bold text-zinc-900">{ticket.owner_phone}</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          {/* Columna Derecha: Timeline Histórico */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-zinc-400" />
              Línea de Vida (Servicios)
            </h3>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-zinc-200">
              
              {/* Visita Actual (si no está entregado) */}
              {ticket.status !== 'Entregado' && (
                <div className="relative flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-zinc-50 flex items-center justify-center z-10 flex-shrink-0" style={{ backgroundColor: primaryBg, color: primaryColor }}>
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-white border rounded-2xl p-5 shadow-sm relative overflow-hidden" style={{ borderColor: `${primaryColor}30` }}>
                    <div className="absolute top-0 right-0 px-3 py-1 text-white text-[10px] font-bold rounded-bl-lg uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>
                      En progreso ({ticket.status})
                    </div>
                    <div className="font-bold text-zinc-900 mb-1">Servicio Actual</div>
                    <div className="text-xs text-zinc-400 mb-4">Ingresado el {format(parseISO(ticket.entry_date), "d 'de' MMMM, yyyy", { locale: es })}</div>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{ticket.notes || <span className="text-zinc-400 italic">Sin notas</span>}</p>
                    
                    {ticket.parts_needed && ticket.parts_needed.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Repuestos</div>
                        <div className="flex flex-wrap gap-2">
                          {ticket.parts_needed.map((part, i) => (
                            <span key={i} className="text-xs bg-zinc-100 text-zinc-700 px-2 py-1 rounded-md">{part}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Visitas Pasadas */}
              {pastVisits.slice().reverse().map((visit, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-zinc-50 bg-zinc-100 flex items-center justify-center z-10 text-zinc-400 flex-shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-white border border-zinc-200/60 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-zinc-900">Servicio Finalizado</div>
                      <div className="text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-full">
                        ${visit.cost?.toLocaleString('es-CL') || 0}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 mb-4">{format(parseISO(visit.date), "d 'de' MMMM, yyyy", { locale: es })} {visit.mileage ? `• ${visit.mileage.toLocaleString()} km` : ''}</div>
                    
                    <p className="text-sm text-zinc-600 whitespace-pre-wrap">{visit.notes || <span className="text-zinc-400 italic">Sin notas</span>}</p>
                    
                    {visit.parts && visit.parts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <div className="flex flex-wrap gap-2">
                          {visit.parts.map((part, i) => (
                            <span key={i} className="text-[10px] bg-zinc-100/50 text-zinc-500 px-2 py-1 rounded-md border border-zinc-200/50">{part}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {pastVisits.length === 0 && ticket.status === 'Entregado' && (
                 <div className="text-center py-8 text-zinc-400 italic">Sin historial de servicios.</div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
