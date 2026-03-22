import React from 'react';
import { X, Clock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { Ticket } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Ingresado': return 'text-zinc-500 bg-zinc-100 border-zinc-200';
    case 'En Espera': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'En Mantención': 
    case 'En Reparación':
    case 'Elevador 1': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'Elevador 2': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'Listo para Entrega': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'Finalizado': return 'text-zinc-100 bg-zinc-800 border-zinc-700';
    default: return 'text-zinc-500 bg-zinc-100 border-zinc-200';
  }
};

export function TicketHistoryModal({ isOpen, onClose, ticket }: TicketHistoryModalProps) {
  if (!isOpen || !ticket) return null;

  const history = ticket.status_history || [];

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              Trazabilidad del Ticket
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 tracking-widest uppercase">
                {ticket.id}
              </span>
              <span className="text-sm text-zinc-500 font-medium truncate">{ticket.model}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-zinc-50 font-sans">
          {history.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-zinc-600">Sin registros históricos</p>
              <p className="text-xs mt-1">Los tickets antiguos no poseen historial detallado.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
              {history.map((entry, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-50 bg-white shadow-sm text-emerald-500 z-10 md:mx-auto">
                    <div className={`w-3 h-3 rounded-full bg-current ${idx === history.length - 1 ? 'animate-pulse' : ''}`} />
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-white border border-zinc-100 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {format(parseISO(entry.date), "HH:mm")}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-bold text-zinc-900">
                        Cambio de Estado
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        Movido por: <span className="text-zinc-700">{entry.user}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        {format(parseISO(entry.date), "d 'de' MMMM, yyyy", { locale: es })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
