import React from 'react';
import { Reminder, GarageSettings } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Calendar, MessageCircle, MoreVertical, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface KanbanReminderCardProps {
  key?: string;
  reminder: Reminder;
  settings: GarageSettings | null;
  onDragStart?: (e: React.DragEvent) => void;
}

export function KanbanReminderCard({ reminder, settings, onDragStart }: KanbanReminderCardProps) {
  // Combinar fecha y hora de forma segura para evitar problemas de zona horaria
  const cleanDate = (reminder.planned_date || '').substring(0, 10);
  const dateStr = `${cleanDate}T${reminder.planned_time || '00:00'}:00`;
  const date = parseISO(dateStr);
  const isDateValid = isValid(date);
  
  const safeFormatDateSimplified = (dateStr: string | undefined | null) => {
    try {
      if (!dateStr) return 'N/A';
      const date = parseISO(`${dateStr.substring(0, 10)}T00:00:00`);
      return format(date, "dd/MM/yyyy");
    } catch (e) {
      return 'N/A';
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reminder.customer_phone || !isDateValid) return;

    const message = `Hola ${reminder.customer_name}, confirmamos tu cita para el ${format(date, "EEEE d 'de' MMMM", { locale: es })} a las ${format(date, 'HH:mm')} para tu ${reminder.vehicle_model} (${reminder.patente}).`;
    const encodedMessage = encodeURIComponent(message);
    const phone = reminder.customer_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const isToday = isDateValid && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isTomorrow = isDateValid && format(date, 'yyyy-MM-dd') === format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  if (!isDateValid) {
    return (
      <div className="bg-red-50 p-3 rounded-2xl border border-red-200 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase">
          <AlertCircle className="w-4 h-4" />
          Error de Fecha
        </div>
        <p className="text-[10px] text-red-500 font-medium">
          Dato corrupto: {reminder.planned_date} {reminder.planned_time}
        </p>
      </div>
    );
  }

  return (
    <div 
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className="bg-white p-3 rounded-2xl shadow-sm border border-amber-200 hover:shadow-md transition-all group flex flex-col gap-2.5 relative overflow-hidden cursor-move"
    >
      {/* Indicador de Agenda */}
      <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-amber-50 rounded-full flex items-end justify-start p-3 opacity-50 group-hover:opacity-100 transition-opacity">
        <Calendar className="w-4 h-4 text-amber-500" />
      </div>

      <div className="flex justify-between items-start">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center bg-white border-2 border-amber-500 rounded px-2 py-0.5 shadow-sm mb-1.5 w-max">
            <span className="text-xs font-mono font-black text-amber-600 tracking-widest uppercase truncate">
              {reminder.patente}
            </span>
          </div>
          <h3 className="font-bold text-zinc-900 leading-tight text-xs truncate" title={reminder.vehicle_model}>
            {reminder.vehicle_model}
          </h3>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button className="text-zinc-400 hover:text-zinc-600 p-1 hover:bg-zinc-100 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 rounded-xl border border-amber-100">
        <Clock className="w-5 h-5 text-amber-600" />
        <span className="text-sm font-black text-amber-700">
          {reminder.planned_time || format(date, 'HH:mm')} hrs
        </span>
        <span className="text-[10px] text-amber-600 font-black ml-auto">
           {isDateValid ? format(date, 'dd-MM') : ''}
        </span>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-bold truncate">
            <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="truncate">{reminder.customer_name}</span>
          </div>
        </div>

        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg text-[10px] font-bold transition-colors border border-emerald-200 shadow-sm flex-shrink-0"
          title="Confirmar cita por WhatsApp"
        >
          <MessageCircle className="w-3 h-3 flex-shrink-0" />
          <span>Confirmar</span>
        </button>
      </div>
    </div>
  );
}
