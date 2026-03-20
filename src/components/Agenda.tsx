import React, { useState, useMemo } from 'react';
import { Ticket, Mechanic, Reminder, Customer, GarageSettings } from '../types';
import {
    Calendar as CalendarIcon,
    Clock,
    Plus,
    Trash2,
    Send,
    CheckCircle2,
    User,
    Car,
    Search,
    ChevronLeft,
    ChevronRight,
    CalendarDays
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useGarageStore, TIME_SLOTS } from '../hooks/useGarageStore';
import { isChileanHoliday, getChileanHoliday } from '../lib/chileanHolidays';

interface AgendaProps {
    tickets: Ticket[];
    mechanics: Mechanic[];
    customers: Customer[];
    reminders: Reminder[];
    settings: GarageSettings | null;
    addReminder: (reminder: any) => Promise<void>;
    updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;
    fetchOccupiedReminders?: (companyId: string, date: string) => Promise<string[]>;
}

export function Agenda({ 
    tickets, 
    mechanics, 
    customers,
    reminders,
    settings,
    addReminder,
    updateReminder,
    deleteReminder,
    fetchOccupiedReminders
}: AgendaProps) {
    const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'preventive'>('calendar');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [formTime, setFormTime] = useState('');
    const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);

    const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
        reminder_type: 'Mantención General',
        planned_date: new Date().toISOString(),
        completed: false
    });

    const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
    const [editingTimeValue, setEditingTimeValue] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch occupied slots for the selected form date
    React.useEffect(() => {
        if (isAddModalOpen && fetchOccupiedReminders && settings?.company_id) {
            fetchOccupiedReminders(settings.company_id, formDate)
                .then(setOccupiedSlots)
                .catch(err => console.error('Error fetching occupied slots:', err));
        }
    }, [isAddModalOpen, formDate, fetchOccupiedReminders, settings?.company_id]);

    // Lógica para Mantenimientos Preventivos (8-9 meses)
    const preventiveTickets = useMemo(() => {
        const now = new Date();
        const minDate = subMonths(now, 10);
        const maxDate = subMonths(now, 6);

        // Agrupar por patente para tener solo el servicio más reciente
        const latestByPatente: Record<string, Ticket> = {};

        tickets.forEach(ticket => {
            if (!ticket.close_date) return;
            
            const closeDate = parseISO(ticket.close_date);
            const isFinished = ticket.status === 'Finalizado' || ticket.status === 'Entregado';
            const isInRange = closeDate >= minDate && closeDate <= maxDate;

            if (isFinished && isInRange) {
                const searchContent = `${ticket.notes || ''} ${ticket.services?.map(s => s.descripcion).join(' ') || ''}`.toLowerCase();
                const isLubricant = searchContent.includes('aceite') || searchContent.includes('lubricante');

                if (isLubricant) {
                    if (!latestByPatente[ticket.id] || parseISO(latestByPatente[ticket.id].close_date!) < closeDate) {
                        latestByPatente[ticket.id] = ticket;
                    }
                }
            }
        });

        return Object.values(latestByPatente).sort((a, b) => 
            parseISO(b.close_date!).getTime() - parseISO(a.close_date!).getTime()
        );
    }, [tickets]);

    // Lógica de Calendario
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const dailyReminders = reminders.filter(r =>
        (r.planned_date.includes('T') ? r.planned_date.split('T')[0] : r.planned_date) === format(selectedDate, 'yyyy-MM-dd')
    );

    const pendingReminders = useMemo(() => {
        return reminders
            .filter(r => !r.completed)
            .sort((a, b) => new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime());
    }, [reminders]);

    const vehicleModels = useMemo(() => {
        const models = new Set<string>();
        tickets.forEach(t => t.model && models.add(t.model));
        customers.forEach(c => c.last_model && models.add(c.last_model));
        return Array.from(models).sort();
    }, [tickets, customers]);

    const hasReminder = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return reminders.some(r => {
            const rDateStr = r.planned_date.includes('T') ? r.planned_date.split('T')[0] : r.planned_date;
            return rDateStr === dateStr;
        });
    };

    const hasPendingReminder = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return reminders.some(r => {
            const rDateStr = r.planned_date.includes('T') ? r.planned_date.split('T')[0] : r.planned_date;
            return rDateStr === dateStr && !r.completed;
        });
    };

    const filteredCustomers = searchTerm.length >= 2
        ? customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm) ||
            c.vehicles.some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : [];

    const handleSelectCustomer = (customer: Customer) => {
        setNewReminder({
            ...newReminder,
            customer_name: customer.name,
            customer_phone: customer.phone,
            patente: customer.vehicles?.[0] || '',
            vehicle_model: customer.last_model || ''
        });
        setSearchTerm('');
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReminder.customer_name || !newReminder.patente || !formTime) {
            alert('Por favor selecciona un horario y completa los datos');
            return;
        }
        
        setSaving(true);
        try {
            let finalDate = new Date(formDate + 'T00:00:00'); 
            if (formTime) {
               finalDate = new Date(`${formDate}T${formTime}:00`);
            }

            await addReminder({ 
                ...newReminder, 
                company_id: settings?.company_id,
                planned_date: finalDate.toISOString(),
                planned_time: formTime || '00:00',
            });

            setIsAddModalOpen(false);
            setFormTime('');
            setOccupiedSlots([]);
            setNewReminder({
                reminder_type: 'Mantención General',
                planned_date: selectedDate.toISOString(),
                completed: false
            });
        } catch (error: any) {
            console.error('Error adding reminder:', error);
            if (error.message === 'SLOT_OCCUPIED') {
                alert('Este horario ya ha sido reservado');
            } else {
                alert('Error al agendar cita');
            }
        } finally {
            setSaving(false);
        }
    };

    const sendWhatsApp = (reminder: Reminder) => {
        try {
            const dateStr = reminder.planned_date || '';
            const rDate = parseISO(`${dateStr.substring(0, 10)}T00:00:00`);
            const message = `Hola ${reminder.customer_name}, te escribimos de ${settings?.workshop_name || 'tu taller'} para recordarte que tienes programada una ${reminder.reminder_type} para tu vehículo ${reminder.vehicle_model} (${reminder.patente}) el día ${format(rDate, 'dd/MM/yy')}.`;
            window.open(`https://wa.me/${reminder.customer_phone}?text=${encodeURIComponent(message)}`, '_blank');
        } catch (e) {
            console.error('Error formatting date for WhatsApp:', e);
            alert('Error al generar el mensaje de WhatsApp. Verifique la fecha.');
        }
    };

    const sendPreventiveWhatsApp = (ticket: Ticket) => {
        try {
            const message = `Hola ${ticket.owner_name}, te escribimos de ${settings?.workshop_name || 'Roma Center SPA'} para recordarte que ya han pasado 8 meses desde el último cambio de aceite/lubricante para tu vehículo ${ticket.model} (${ticket.id}). ¿Te gustaría agendar una mantención preventiva para mantenerlo en óptimas condiciones?`;
            window.open(`https://wa.me/${ticket.owner_phone}?text=${encodeURIComponent(message)}`, '_blank');
        } catch (e) {
            console.error('Error opening WhatsApp:', e);
        }
    };

    const safeFormatDateReminders = (dateStr: string) => {
        try {
            if (!dateStr) return 'N/A';
            const isoDate = dateStr.substring(0, 10);
            const today = format(new Date(), 'yyyy-MM-dd');
            
            if (isoDate === today) {
                return 'Hoy';
            }

            const date = parseISO(`${isoDate}T00:00:00`);
            return format(date, "EEEE d 'de' MMMM", { locale: es });
        } catch (e) {
            return 'Fecha inválida';
        }
    };

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
        <div className="space-y-6 font-sans pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Agenda de Mantenciones</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">Gestión de citas y preventivas.</p>
                </div>
                <div className="flex bg-zinc-100 p-1 rounded-2xl">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            viewMode === 'calendar' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                        )}
                    >
                        Vista Calendario
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                        )}
                    >
                        Lista de Pendientes
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                            {pendingReminders.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setViewMode('preventive')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'preventive' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                        )}
                    >
                        Preventivos (8-9 meses)
                        {preventiveTickets.length > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                {preventiveTickets.length}
                            </span>
                        )}
                    </button>
                </div>
                <button
                    onClick={() => {
                        setFormDate(format(selectedDate, 'yyyy-MM-dd'));
                        setFormTime('');
                        setNewReminder(prev => ({ ...prev, planned_date: selectedDate.toISOString() }));
                        setIsAddModalOpen(true);
                    }}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold transition-all shadow-lg shadow-zinc-200 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Agendar Cita
                </button>
            </div>

            {viewMode === 'list' ? (
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Todas las Citas Pendientes</h3>
                            <p className="text-xs text-zinc-500">Listado global ordenado por fecha de reserva.</p>
                        </div>
                    </div>
                    <div className="p-6">
                        {pendingReminders.length === 0 ? (
                            <div className="py-20 text-center text-zinc-400 font-medium">
                                No hay citas pendientes registradas en el sistema.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingReminders.map(r => (
                                    <div key={r.id} className="bg-white p-5 rounded-3xl border border-zinc-200 hover:border-emerald-500 transition-all shadow-sm group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{safeFormatDateReminders(r.planned_date)}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span 
                                                        className={cn(
                                                            "text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1 transition-all cursor-pointer hover:bg-emerald-100",
                                                            editingTimeId === r.id && "ring-2 ring-emerald-500 ring-offset-1"
                                                        )}
                                                        onClick={() => {
                                                            setEditingTimeId(r.id);
                                                            setEditingTimeValue(r.planned_time || '00:00');
                                                        }}
                                                    >
                                                        {editingTimeId === r.id ? (
                                                            <input 
                                                                type="time"
                                                                autoFocus
                                                                className="bg-white/80 border-none outline-none font-bold text-xs px-1 rounded w-20 text-center"
                                                                value={editingTimeValue}
                                                                onChange={e => setEditingTimeValue(e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                onBlur={async () => {
                                                                    if (editingTimeValue !== r.planned_time) {
                                                                        await updateReminder(r.id, { planned_time: editingTimeValue });
                                                                    }
                                                                    setEditingTimeId(null);
                                                                }}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                                    if (e.key === 'Escape') setEditingTimeId(null);
                                                                }}
                                                            />
                                                        ) : (
                                                            <><Clock className="w-3 h-3" /> {r.planned_time || '00:00'}</>
                                                        )}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                                                        r.reminder_type === 'Cita Web'
                                                            ? "bg-blue-50 text-blue-600 border-blue-100"
                                                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                                    )}>
                                                        {r.reminder_type}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteReminder(r.id)}
                                                className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <h4 className="font-black text-zinc-900 truncate">{r.customer_name}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] font-mono font-black text-white bg-zinc-900 px-1.5 py-0.5 rounded uppercase">
                                                    {r.patente}
                                                </span>
                                                <span className="text-xs text-zinc-500 font-medium truncate">{r.vehicle_model}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => sendWhatsApp(r)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            Confirmar WhatsApp
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'preventive' ? (
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Mantenimientos Preventivos Sugeridos</h3>
                            <p className="text-xs text-zinc-500">Clientes que realizaron cambio de aceite o lubricante hace 8-9 meses.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-400">Total Detectados:</span>
                            <span className="text-sm font-black text-zinc-900 bg-white px-3 py-1 rounded-xl border border-zinc-100 shadow-sm">
                                {preventiveTickets.length}
                            </span>
                        </div>
                    </div>
                    <div className="p-6">
                        {preventiveTickets.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-zinc-100 border-dashed">
                                    <Clock className="w-10 h-10 text-zinc-200" />
                                </div>
                                <h4 className="text-zinc-900 font-bold mb-1">No se detectaron mantenimientos próximos</h4>
                                <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                                    Aquí aparecerán automáticamente los clientes que necesitan un recordatorio de cambio de aceite basado en su historial de hace 8 meses.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {preventiveTickets.map(ticket => (
                                    <div key={ticket.id} className="bg-white p-5 rounded-3xl border border-zinc-200 hover:border-emerald-500 transition-all shadow-sm group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Último Servicio</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-100 flex items-center gap-1">
                                                        {ticket.close_date ? format(parseISO(ticket.close_date), 'dd/MM/yyyy') : 'N/A'}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-rose-50 text-rose-600 border-rose-100">
                                                        Hace {Math.floor((new Date().getTime() - parseISO(ticket.close_date!).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <h4 className="font-black text-zinc-900 truncate">{ticket.owner_name}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] font-mono font-black text-white bg-zinc-900 px-1.5 py-0.5 rounded uppercase">
                                                    {ticket.id}
                                                </span>
                                                <span className="text-xs text-zinc-500 font-medium truncate">{ticket.model}</span>
                                            </div>
                                            {ticket.mileage && (
                                                <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                                                    Km registrado: {ticket.mileage.toLocaleString()} KM
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => sendPreventiveWhatsApp(ticket)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[11px] transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
                                        >
                                            <Send className="w-4 h-4" />
                                            Enviar Recordatorio
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Calendario (Izquierda/Arriba) */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
                        {/* Header Calendario */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-50 bg-zinc-50/30">
                            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">
                                {format(currentMonth, 'MMMM yyyy', { locale: es })}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    className="p-2 hover:bg-white border-transparent hover:border-zinc-200 border rounded-xl transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5 text-zinc-600" />
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    className="p-2 hover:bg-white border-transparent hover:border-zinc-200 border rounded-xl transition-all"
                                >
                                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                                </button>
                            </div>
                        </div>

                        {/* Grilla Calendario */}
                        <div className="p-4 md:p-6">
                            <div className="grid grid-cols-7 mb-4">
                                {weekDays.map(day => (
                                    <div key={day} className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1 md:gap-2">
                                {days.map((day, idx) => {
                                    const isSelected = isSameDay(day, selectedDate);
                                    const isToday = isSameDay(day, new Date());
                                    const isCurrentMonth = isSameMonth(day, currentMonth);
                                    const hasEvent = hasReminder(day);
                                    const hasPending = hasPendingReminder(day);
                                    const holiday = getChileanHoliday(day);
                                    const isHoliday = !!holiday;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            title={isHoliday ? holiday.name : undefined}
                                            className={cn(
                                                "relative aspect-square md:aspect-auto md:h-24 p-2 rounded-2xl transition-all flex flex-col items-center md:items-start group border",
                                                isSelected
                                                    ? "bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-200 scale-105 z-10"
                                                    : isToday
                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                        : isCurrentMonth
                                                            ? isHoliday
                                                                ? "bg-red-50 border-red-100 text-red-600 hover:border-red-300"
                                                                : "bg-white border-zinc-100 text-zinc-900 hover:border-zinc-300"
                                                            : isHoliday
                                                                ? "bg-red-50/30 border-transparent text-red-300"
                                                                : "bg-zinc-50/50 border-transparent text-zinc-300"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-sm md:text-base font-black truncate",
                                                isSelected ? "text-white" : "text-inherit"
                                            )}>
                                                {format(day, 'd')}
                                                {isHoliday && !isSelected && (
                                                    <span className="ml-1 text-[8px] md:text-[10px] text-red-400 font-bold block md:inline uppercase tracking-tighter">
                                                        Feriado
                                                    </span>
                                                )}
                                            </span>

                                            {/* Indicadores en Desktop */}
                                            <div className="hidden md:flex flex-wrap gap-1 mt-auto">
                                                {hasEvent && (
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full ring-2 ring-white/50",
                                                        isSelected ? "bg-white" : hasPending ? "bg-emerald-500" : "bg-zinc-400"
                                                    )}></div>
                                                )}
                                            </div>

                                            {/* Indicador en Mobile (debajo del número) */}
                                            {hasEvent && !isSelected && (
                                                <div className={cn(
                                                    "md:hidden absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                                                    hasPending ? "bg-emerald-500" : "bg-zinc-300"
                                                )}></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lista de Tarjetas (Derecha/Abajo) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            {isSameDay(selectedDate, new Date()) ? 'Pendientes hoy' : format(selectedDate, "d 'de' MMMM", { locale: es })}
                        </h3>
                        {dailyReminders.length > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">
                                {dailyReminders.length} {dailyReminders.length === 1 ? 'Cita' : 'Citas'}
                            </span>
                        )}
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {dailyReminders.length === 0 ? (
                            <div className="py-20 text-center bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-100 shadow-sm">
                                    <Clock className="w-8 h-8 text-zinc-200" />
                                </div>
                                <p className="text-zinc-500 font-bold text-sm">Sin actividades programadas</p>
                                <button
                                    onClick={() => {
                                        setFormDate(format(selectedDate, 'yyyy-MM-dd'));
                                        setFormTime('');
                                        setNewReminder(prev => ({ ...prev, planned_date: selectedDate.toISOString() }));
                                        setIsAddModalOpen(true);
                                    }}
                                    className="mt-4 text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                                >
                                    + Agendar para este día
                                </button>
                            </div>
                        ) : (
                            dailyReminders.map((r) => {
                                    const timeFormat = r.planned_time || '00:00';
                                    const hasTime = timeFormat !== '00:00';

                                return (
                                <div key={r.id} className={cn(
                                    "bg-white p-5 rounded-3xl shadow-sm border transition-all relative group",
                                    r.completed ? "border-zinc-100 opacity-60" : "border-zinc-200 hover:border-emerald-500 active:scale-[0.98]"
                                )}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div 
                                            className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                                                r.completed ? "bg-zinc-100 text-zinc-500" : 
                                                r.reminder_type === 'Cita Web' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                                                "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                                                !r.completed && "cursor-pointer"
                                            )}
                                            onClick={() => {
                                                if (!r.completed) {
                                                    setEditingTimeId(r.id);
                                                    setEditingTimeValue(r.planned_time || '00:00');
                                                }
                                            }}
                                        >
                                            {r.reminder_type} 
                                            {editingTimeId === r.id ? (
                                                <input 
                                                    type="time"
                                                    autoFocus
                                                    className="bg-white/80 border-none outline-none font-bold text-[10px] px-1 rounded ml-1 w-20 text-center"
                                                    value={editingTimeValue}
                                                    onChange={e => setEditingTimeValue(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    onBlur={async () => {
                                                        if (editingTimeValue !== r.planned_time) {
                                                            await updateReminder(r.id, { planned_time: editingTimeValue });
                                                        }
                                                        setEditingTimeId(null);
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') e.currentTarget.blur();
                                                        if (e.key === 'Escape') setEditingTimeId(null);
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    {hasTime ? (
                                                        <><Clock className="w-3 h-3 ml-1" /> {timeFormat}</>
                                                    ) : (
                                                        <span className="opacity-40 italic ml-1">(sin hora)</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => updateReminder(r.id, { completed: !r.completed })}
                                                className={cn(
                                                    "p-2 rounded-xl transition-all",
                                                    r.completed ? "text-emerald-500 bg-emerald-50" : "text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50"
                                                )}
                                            >
                                                <CheckCircle2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => deleteReminder(r.id)}
                                                className="p-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-black text-zinc-900 text-base">{r.customer_name}</h4>
                                            <p className="text-[11px] text-zinc-500 font-medium">WhatsApp: {r.customer_phone}</p>
                                        </div>

                                        <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                                            <div className="w-8 h-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center">
                                                <Car className="w-4 h-4 text-zinc-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-zinc-900">{r.vehicle_model}</span>
                                                <span className="text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5 uppercase">{r.patente}</span>
                                            </div>
                                        </div>

                                        {!r.completed && (
                                            <button
                                                onClick={() => sendWhatsApp(r)}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
                                            >
                                                <Send className="w-4 h-4" />
                                                Enviar Aviso WhatsApp
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                </div>
            </div>
            )}

            {/* Modal para añadir recordatorio */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-6 overflow-visible">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-zinc-900 uppercase tracking-tight">Agendar Actividad</h3>
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        {/* Buscador de cliente existente */}
                        <div className="relative">
                            <label className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 block">Buscar Cliente Registrado</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Nombre, teléfono o patente..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 outline-none focus:border-zinc-900 transition-all shadow-sm text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {filteredCustomers.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-zinc-100 z-[60] max-h-48 overflow-y-auto overflow-x-hidden">
                                    {filteredCustomers.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleSelectCustomer(c)}
                                            className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-zinc-50 last:border-0 flex flex-col"
                                        >
                                            <span className="font-bold text-zinc-900 text-sm">{c.name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-zinc-500 font-medium">{c.phone}</span>
                                                {c.vehicles.length > 0 && (
                                                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-mono font-bold border border-zinc-200">
                                                        {c.vehicles[0]}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-zinc-100 my-2"></div>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Nombre Cliente</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Nombre del cliente"
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:border-zinc-900 transition-all shadow-sm"
                                    value={newReminder.customer_name || ''}
                                    onChange={e => setNewReminder({ ...newReminder, customer_name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Teléfono</label>
                                    <input
                                        required
                                        type="tel"
                                        placeholder="+569..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:border-zinc-900 transition-all shadow-sm"
                                        value={newReminder.customer_phone || ''}
                                        onChange={e => setNewReminder({ ...newReminder, customer_phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Patente Vehículo</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="AA-BB-11"
                                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:border-zinc-900 transition-all shadow-sm uppercase font-mono font-bold"
                                        value={newReminder.patente || ''}
                                        onChange={e => setNewReminder({ ...newReminder, patente: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Modelo Vehículo</label>
                                <input
                                    required
                                    type="text"
                                    list="vehicle-models"
                                    placeholder="Marca y Modelo"
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:border-zinc-900 transition-all shadow-sm"
                                    value={newReminder.vehicle_model || ''}
                                    onChange={e => setNewReminder({ ...newReminder, vehicle_model: e.target.value })}
                                />
                                <datalist id="vehicle-models">
                                    {vehicleModels.map(m => (
                                        <option key={m} value={m} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Tipo Recordatorio</label>
                                    <select
                                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:border-emerald-500 transition-all shadow-sm bg-white font-medium"
                                        value={newReminder.reminder_type}
                                        onChange={e => setNewReminder({ ...newReminder, reminder_type: e.target.value })}
                                    >
                                        <option>Mantención General</option>
                                        <option>Cambio de Aceite</option>
                                        <option>Mantención de Frenos</option>
                                        <option>Revisión Suspensión</option>
                                        <option>Escáner Electrónico</option>
                                        <option>Revisión Técnica</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Fecha</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:border-emerald-500 transition-all shadow-sm font-mono"
                                        value={formDate}
                                        onChange={e => setFormDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Hora Agendada</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {TIME_SLOTS.map(slot => {
                                            const isOccupied = occupiedSlots.includes(slot);
                                            return (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    disabled={isOccupied}
                                                    onClick={() => setFormTime(slot)}
                                                    className={cn(
                                                        "py-2 rounded-lg text-sm font-bold transition-all border",
                                                        formTime === slot
                                                            ? "bg-zinc-900 text-white border-zinc-900 shadow-md transform scale-105"
                                                            : isOccupied
                                                                ? "bg-zinc-50 text-zinc-300 border-zinc-100 cursor-not-allowed"
                                                                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-900 hover:shadow-sm"
                                                    )}
                                                >
                                                    {slot}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className={cn(
                                    "w-full py-3.5 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest mt-2",
                                    saving && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {saving ? 'Agendando...' : 'Agendar Recordatorio'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
