import React from 'react';
import { Ticket, GarageSettings } from '../types';
import { formatDistanceToNow, parseISO, differenceInDays, formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, MoreVertical, MessageCircle, AlertCircle, History, Camera } from 'lucide-react';
import { cn } from '../lib/utils';

interface KanbanTicketCardProps {
  key?: string;
  ticket: Ticket;
  settings: GarageSettings | null;
  selectedMechanic: string | null;
  isDragged: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onEdit: (ticket: Ticket) => void;
  onShowHistory?: (ticket: Ticket) => void;
  onShowCRM?: (ticket: Ticket) => void;
}

const statusMap: Record<string, string> = {
  'Ingresado': 'ingresado',
  'En Espera': 'en espera',
  'En Mantención': 'en proceso',
  'Listo para Entrega': 'listo para entrega',
  'Finalizado': 'entregado'
};

export function KanbanTicketCard({ ticket, settings, selectedMechanic, isDragged, onDragStart, onEdit, onShowHistory, onShowCRM }: KanbanTicketCardProps) {
  const entryDate = ticket.entry_date ? parseISO(ticket.entry_date) : new Date();
  const isValidDate = !isNaN(entryDate.getTime());
  
  // Si está finalizado, congelamos el tiempo usando close_date
  const referenceDate = (ticket.status === 'Finalizado' && ticket.close_date) 
    ? parseISO(ticket.close_date) 
    : new Date();

  const daysInShop = isValidDate ? differenceInDays(referenceDate, entryDate) : 0;
  const isAttenuated = selectedMechanic && ticket.mechanic !== selectedMechanic;

  // Determinar color de "días"
  let daysColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (daysInShop >= 3 && daysInShop < 5) daysColor = "text-amber-600 bg-amber-50 border-amber-200";
  else if (daysInShop >= 5) daysColor = "text-red-600 bg-red-50 border-red-200";

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!settings || !ticket.owner_phone) return;

    const friendlyStatus = statusMap[ticket.status] || 'en proceso';
    const vehicleModel = ticket.model || 'su vehículo';

    const message = (settings.whatsapp_template || 'Hola {{cliente}}, tu {{vehiculo}} está {{estado}}.')
      .replace(/{{cliente}}/g, ticket.owner_name)
      .replace(/{{vehiculo}}/g, vehicleModel)
      .replace(/{{estado}}/g, friendlyStatus)
      .replace(/{{nombre_taller}}/g, settings.workshop_name || 'nuestro taller')
      .replace(/{{telefono_taller}}/g, settings.phone || '');

    const encodedMessage = encodeURIComponent(message);
    const phone = ticket.owner_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div
      draggable={ticket.status !== 'Finalizado'}
      onDragStart={(e) => onDragStart(e, ticket.id)}
      className={cn(
        "bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm border border-zinc-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group flex flex-col gap-2",
        isDragged && "opacity-50 ring-2 ring-emerald-500",
        isAttenuated && !isDragged && "opacity-40 grayscale-[0.8] hover:opacity-100 hover:grayscale-0"
      )}
    >
      <div className="flex justify-between items-start">
        {/* Patente Estilo Placa */}
        <div className="flex flex-col min-w-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onShowCRM?.(ticket);
            }}
            className="group/plate flex items-center bg-white border-[2px] border-zinc-900 rounded-md shadow-sm mb-1.5 w-max hover:bg-zinc-50 transition-all active:scale-95 overflow-hidden ring-1 ring-zinc-200"
            title="Ver historial completo del vehículo"
          >
            <div className="w-1.5 h-full bg-blue-600 self-stretch flex items-center justify-center py-0.5">
              <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
            </div>
            <div className="px-1.5 py-0 flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-mono font-black text-zinc-900 tracking-wider uppercase">
                {ticket.id}
              </span>
            </div>
          </button>
          <h3 className="font-bold text-zinc-900 leading-tight text-[11px] sm:text-xs truncate" title={ticket.model}>
            {ticket.model}
          </h3>
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {ticket.status !== 'Finalizado' && (
            <button
              onClick={() => onEdit(ticket)}
              className="text-zinc-400 hover:text-emerald-600 p-1 hover:bg-zinc-100 rounded-lg transition-colors"
              title="Editar Ticket"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed bg-zinc-50 p-2 rounded-lg border border-zinc-100">
        {ticket.notes || <span className="italic text-zinc-400">Sin observaciones...</span>}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-bold truncate">
            <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="truncate">{ticket.mechanic}</span>
            {ticket.job_photos && ticket.job_photos.length > 0 && (
              <div className="flex items-center gap-0.5 ml-1 text-emerald-600 font-bold bg-emerald-50 px-1 rounded-sm">
                <Camera className="w-3 h-3" />
                <span>{ticket.job_photos.length}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span title={isValidDate ? (ticket.status === 'Finalizado' && ticket.close_date ? formatDistance(entryDate, referenceDate, { addSuffix: true, locale: es }) : formatDistanceToNow(entryDate, { addSuffix: true, locale: es })) : ''}>
              {isValidDate 
                ? (ticket.status === 'Finalizado' && ticket.close_date 
                    ? formatDistance(entryDate, referenceDate, { locale: es }) 
                    : formatDistanceToNow(entryDate, { locale: es }))
                : 'N/A'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {/* Días en taller badge */}
          {daysInShop > 0 && (
            <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1", daysColor)}>
              {daysInShop >= 5 && <AlertCircle className="w-3 h-3" />}
              {daysInShop} día{daysInShop !== 1 ? 's' : ''}
            </div>
          )}

          {/* Botón rápido WhatsApp si está Listo para Entrega o En Espera */}
          {(ticket.status === 'Listo para Entrega' || ticket.status === 'En Espera') && (
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg text-[10px] font-bold transition-colors border border-emerald-200 shadow-sm"
              title="Avisar por WhatsApp"
            >
              <MessageCircle className="w-3 h-3 flex-shrink-0" />
              <span>Avisar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
