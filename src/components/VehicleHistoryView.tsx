import React from 'react';
import { Car, Calendar, History, Wrench, MessageSquare, Tag, Phone } from 'lucide-react';
import { Ticket, ServiceLogEntry } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface VehicleHistoryViewProps {
  ticket: Ticket;
  settings?: any;
}

export function VehicleHistoryView({ ticket, settings }: VehicleHistoryViewProps) {
  const primaryColor = settings?.theme_menu_highlight || '#10b981';
  const primaryBg = primaryColor.startsWith('#') && primaryColor.length === 7 ? `${primaryColor}20` : 'rgba(16, 185, 129, 0.2)';

  // Función para parsear el historial desde el campo "notes" si existe en formato de texto
  const parseHistoryFromNotes = (notes: string): ServiceLogEntry[] => {
    if (!notes || !notes.includes('Historial de Visitas:')) return [];
    
    const entries: ServiceLogEntry[] = [];
    const lines = notes.split('\n');
    const historyRegex = /- \[(\d{4}-\d{2}-\d{2})\] (.*?)(?: \((\$\d+(?:\.\d+)*)\))?$/;

    lines.forEach(line => {
      const match = line.match(historyRegex);
      if (match) {
        const [_, date, description, costStr] = match;
        // Limpiar costo de formato $82.000 a número
        const cost = costStr ? parseInt(costStr.replace('$', '').replace(/\./g, '')) : undefined;
        
        entries.push({
          date,
          notes: description.trim(),
          parts: [], // En el formato de texto no diferenciamos repuestos de servicios
          cost,
          mileage: undefined
        });
      }
    });

    return entries;
  };

  // Combinar service_log con lo parseado de notes
  const parsedFromNotes = parseHistoryFromNotes(ticket.notes || '');
  const allVisits = [...(ticket.service_log || []), ...parsedFromNotes];
  
  // Eliminar duplicados básicos por fecha y notas (muy básico)
  const uniqueVisits = allVisits.reduce((acc: ServiceLogEntry[], current) => {
    const isDuplicate = acc.some(item => item.date === current.date && item.notes === current.notes);
    if (!isDuplicate) acc.push(current);
    return acc;
  }, []);

  // Ordenar por fecha descendente
  const pastVisits = uniqueVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalVisits = pastVisits.length + (ticket.status !== 'Entregado' ? 1 : 0);
  const firstVisitDate = pastVisits.length > 0 ? pastVisits[pastVisits.length - 1].date : ticket.entry_date;

  // Limpiar las notas actuales para no mostrar el bloque de historial si ya lo parseamos
  const displayNotes = (ticket.notes || '')
    .split('Historial de Visitas:')[0]
    .replace(/^- \[\d{4}-\d{2}-\d{2}\].*$/gm, '') // Por si acaso quedaron líneas sueltas
    .trim();

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
              <span className="text-lg font-black tracking-wider uppercase">{ticket.patente || ticket.id}</span>
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
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-[11px] text-zinc-900">Servicio Actual</div>
                    {ticket.mileage && (
                      <div className="text-[10px] font-black text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                        {ticket.mileage.toLocaleString()} KM
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-400 mb-3">Ingresado {format(parseISO(ticket.entry_date), "d MMM, yyyy", { locale: es })}</div>
                  
                  {/* Detalle de Servicios Actuales */}
                  {(ticket.services && ticket.services.length > 0) || (ticket.spare_parts && ticket.spare_parts.length > 0) ? (
                    <div className="space-y-2 mb-3">
                      {ticket.services?.map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] bg-zinc-50 p-1.5 rounded border border-zinc-100/50">
                          <span className="font-bold text-zinc-700 uppercase tracking-tighter line-clamp-1">{s.descripcion}</span>
                          <span className="text-zinc-400 font-mono">${s.costo.toLocaleString()}</span>
                        </div>
                      ))}
                      {ticket.spare_parts?.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] bg-blue-50/50 p-1.5 rounded border border-blue-100/30">
                          <span className="font-medium text-blue-700 italic line-clamp-1">Repuesto: {p.descripcion}</span>
                          <span className="text-blue-300 font-mono">${p.costo.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-[11px] text-zinc-600 line-clamp-3 italic bg-zinc-50/30 p-2 rounded-lg border border-dashed border-zinc-100">
                    {displayNotes || 'Sin notas adicionales'}
                  </p>

                  {(ticket.rut_empresa || ticket.razon_social) && (
                    <div className="mt-2 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1.5 rounded-lg border border-indigo-100 inline-flex flex-col gap-0.5">
                      {ticket.rut_empresa && <div className="font-medium"><span className="font-black">RUT Factura:</span> {ticket.rut_empresa}</div>}
                      {ticket.razon_social && <div className="font-medium"><span className="font-black">Razón Social:</span> {ticket.razon_social}</div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visitas Pasadas */}
            {pastVisits.map((visit, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                <div className="w-8 h-8 rounded-full border-4 border-white bg-zinc-100 flex items-center justify-center z-10 text-zinc-400 flex-shrink-0 shadow-sm">
                  <History className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 bg-white border border-zinc-100 rounded-xl p-3 shadow-sm hover:border-zinc-200 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-[11px] text-zinc-800">Finalizado</div>
                    <div className="text-[10px] font-black text-zinc-900 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-100">
                      ${visit.cost?.toLocaleString('es-CL') || 0}
                    </div>
                  </div>
                  <div className="text-[9px] text-zinc-400 mb-2">
                    {(() => {
                        try {
                            return format(parseISO(visit.date), "d MMM, yyyy", { locale: es });
                        } catch (e) {
                            return visit.date;
                        }
                    })()} 
                    {visit.mileage ? ` • ${visit.mileage.toLocaleString()} km` : ''}
                  </div>

                  {/* Detalle de Repuestos/Servicios si están en el log */}
                  {visit.parts && visit.parts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {visit.parts.map((p, i) => (
                        <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 bg-zinc-50 text-zinc-500 rounded border border-zinc-100 uppercase">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500 line-clamp-3 italic bg-zinc-50/30 p-2 rounded-lg border border-dashed border-zinc-100">
                    {visit.notes || 'Sin notas'}
                  </p>
                </div>
              </div>
            ))}
            
            {pastVisits.length === 0 && (ticket.status === 'Entregado' || ticket.status === 'Finalizado') && (
               <div className="text-center py-4 text-[11px] text-zinc-400 italic">Sin historial previo.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
