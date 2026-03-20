import React from 'react';
import { Car, Calendar, History, Wrench, MessageSquare, Tag, Phone } from 'lucide-react';
import { Ticket } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface VehicleHistoryViewProps {
  ticket: Ticket;
  settings?: any;
}

export function VehicleHistoryView({ ticket, settings }: VehicleHistoryViewProps) {
  const primaryColor = settings?.theme_menu_highlight || '#10b981';
  const primaryBg = primaryColor.startsWith('#') && primaryColor.length === 7 ? `${primaryColor}20` : 'rgba(16, 185, 129, 0.2)';

  const pastVisits = ticket.service_log || [];
  const totalVisits = pastVisits.length + 1;
  const firstVisitDate = pastVisits.length > 0 ? pastVisits[0].date : ticket.entry_date;

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      {/* Mini Header Summary */}
      <div className="bg-zinc-900 text-white p-5 rounded-2xl flex items-center justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: `${primaryColor}20` }}></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
            <Car className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider uppercase">{ticket.id}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border" style={{ backgroundColor: primaryBg, color: primaryColor, borderColor: `${primaryColor}30` }}>
                {totalVisits} {totalVisits === 1 ? 'VISITA' : 'VISITAS'}
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-medium truncate max-w-[150px]">{ticket.model}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
        {/* Observaciones Globales */}
        <div className="bg-white rounded-xl p-4 border border-zinc-100 shadow-sm">
          <h3 className="font-bold text-zinc-900 text-xs flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-purple-600" />
            Observaciones del Vehículo
          </h3>
          <div className="text-[11px] text-zinc-600 leading-relaxed italic">
            {ticket.vehicle_notes ? ticket.vehicle_notes : 'Sin observaciones registradas...'}
          </div>
        </div>

        {/* Línea de Vida */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400">
            <History className="w-4 h-4" />
            Historial de Servicios
          </h3>
          
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-zinc-100">
            
            {/* Visita Actual */}
            {ticket.status !== 'Entregado' && (
              <div className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 flex-shrink-0 shadow-sm" style={{ backgroundColor: primaryBg, color: primaryColor }}>
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 bg-white border border-zinc-100 rounded-xl p-3 shadow-sm">
                  <div className="font-bold text-[11px] text-zinc-900">Servicio Actual</div>
                  <div className="text-[9px] text-zinc-400 mb-2">Ingresado {format(parseISO(ticket.entry_date), "d MMM, yyyy", { locale: es })}</div>
                  <p className="text-[11px] text-zinc-600 line-clamp-2 italic">{ticket.notes || 'Sin notas'}</p>
                </div>
              </div>
            )}

            {/* Visitas Pasadas */}
            {pastVisits.slice().reverse().map((visit, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full border-4 border-white bg-zinc-100 flex items-center justify-center z-10 text-zinc-400 flex-shrink-0 shadow-sm">
                  <History className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 bg-white border border-zinc-100 rounded-xl p-3 shadow-sm hover:border-zinc-200 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-[11px] text-zinc-800">Finalizado</div>
                    <div className="text-[10px] font-black text-zinc-900">
                      ${visit.cost?.toLocaleString('es-CL') || 0}
                    </div>
                  </div>
                  <div className="text-[9px] text-zinc-400 mb-2">
                    {format(parseISO(visit.date), "d MMM, yyyy", { locale: es })} 
                    {visit.mileage ? ` • ${visit.mileage.toLocaleString()} km` : ''}
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 italic">{visit.notes || 'Sin notas'}</p>
                </div>
              </div>
            ))}
            
            {pastVisits.length === 0 && ticket.status === 'Entregado' && (
               <div className="text-center py-4 text-[11px] text-zinc-400 italic">Sin historial previo.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
