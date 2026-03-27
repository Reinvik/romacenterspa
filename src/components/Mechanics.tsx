import React from 'react';
import { Mechanic, Ticket, TicketStatus } from '../types';
import { Wrench, UserMinus, Plus, UserCircle, Car, CheckCircle2, Clock, AlertTriangle, TrendingUp, BarChart3, DollarSign, ArrowUpRight, ArrowDownRight, Calendar, UserX } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isSameDay, isSameMonth, parseISO, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface MechanicsProps {
    mechanics: Mechanic[];
    tickets: Ticket[];
    onAdd: () => void;
    onDelete: (id: string) => void;
    onUpdateTicket?: (id: string, updates: Partial<Ticket>) => Promise<void>;
}

export function Mechanics({ mechanics, tickets, onAdd, onDelete, onUpdateTicket }: MechanicsProps) {
    const [filterMode, setFilterMode] = React.useState<'daily' | 'monthly' | 'yearly'>('monthly');
    const [selectedDate, setSelectedDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

    const globalStats = React.useMemo(() => {
        const filterTicketsByPeriod = (targetDate: Date, mode: 'daily' | 'monthly' | 'yearly') => {
            return tickets.filter(t => {
                // For revenue reporting: use close_date for finished tickets, entry_date otherwise
                // Avoid using last_status_change as it's updated on every edit
                const isUnowned = !t.mechanic_id || t.mechanic_id === 'Sin asignar' || t.mechanic === 'Sin asignar';
                const isClosed = t.status === 'Finalizado' || t.status === 'Entregado';
                const dateStr = (isClosed && t.close_date && !isUnowned) ? t.close_date : t.entry_date;
                const d = parseISO(dateStr);
                if (mode === 'daily') return isSameDay(d, targetDate);
                if (mode === 'monthly') return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
                if (mode === 'yearly') return d.getFullYear() === targetDate.getFullYear();
                return false;
            });
        };

        const currentTarget = modeToDate(filterMode, selectedDate, selectedMonth, selectedYear);
        const periodTickets = filterTicketsByPeriod(currentTarget, filterMode);

        // Previous period for growth calculation
        let prevTarget = new Date(currentTarget);
        if (filterMode === 'daily') prevTarget = subDays(currentTarget, 1);
        else if (filterMode === 'monthly') prevTarget = subMonths(currentTarget, 1);
        else if (filterMode === 'yearly') prevTarget = new Date(currentTarget.getFullYear() - 1, 0, 1);

        const prevPeriodTickets = filterTicketsByPeriod(prevTarget, filterMode);

        const finished = periodTickets.filter(t => t.status === 'Finalizado' || t.status === 'Entregado');
        const prevFinished = prevPeriodTickets.filter(t => t.status === 'Finalizado' || t.status === 'Entregado');

        const revenue = finished.reduce((acc, t) => acc + (t.cost || 0), 0);
        const prevRevenue = prevFinished.reduce((acc, t) => acc + (t.cost || 0), 0);

        // Identify unassigned tickets in current period
        const mechanicNames = new Set(mechanics.map(m => m.name.toLowerCase()));
        const unassignedTickets = finished.filter(t => !t.mechanic || !mechanicNames.has(t.mechanic.toLowerCase()));
        const unassignedRevenue = unassignedTickets.reduce((acc, t) => acc + (t.cost || 0), 0);

        const getGrowth = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            revenue: { value: revenue, growth: getGrowth(revenue, prevRevenue) },
            count: { value: finished.length, growth: getGrowth(finished.length, prevFinished.length) },
            tickets: finished,
            unassigned: {
                count: unassignedTickets.length,
                revenue: unassignedRevenue,
                tickets: unassignedTickets
            }
        };
    }, [tickets, mechanics, filterMode, selectedDate, selectedMonth, selectedYear]);

    function modeToDate(mode: string, dateStr: string, month: number, year: number) {
        if (mode === 'daily') return parseISO(dateStr);
        if (mode === 'monthly') return new Date(year, month, 1);
        return new Date(year, 0, 1);
    }

    const currencyFormatter = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
    });

    const getMechanicStats = (mechanicName: string) => {
        const mechanicTickets = tickets.filter(t => t.mechanic === mechanicName);
        const activeTickets = mechanicTickets.filter(t => t.status !== 'Finalizado' && t.status !== 'Entregado');
        
        // Carga de trabajo basada en un máximo sugerido de 5 autos simultáneos
        const workloadPercentage = Math.min((activeTickets.length / 5) * 100, 100);

        // Stats specific to the current period filter
        const currentTarget = modeToDate(filterMode, selectedDate, selectedMonth, selectedYear);
        const periodTickets = mechanicTickets.filter(t => {
            const isUnowned = !t.mechanic_id || t.mechanic_id === 'Sin asignar' || t.mechanic === 'Sin asignar';
            const isClosed = t.status === 'Finalizado' || t.status === 'Entregado';
            const dateStr = (isClosed && t.close_date && !isUnowned) ? t.close_date : t.entry_date;
            const d = parseISO(dateStr);
            if (filterMode === 'daily') return isSameDay(d, currentTarget);
            if (filterMode === 'monthly') return d.getMonth() === currentTarget.getMonth() && d.getFullYear() === currentTarget.getFullYear();
            if (filterMode === 'yearly') return d.getFullYear() === currentTarget.getFullYear();
            return false;
        });

        const completedInPeriod = periodTickets.filter(t => t.status === 'Finalizado' || t.status === 'Entregado');
        const revenueInPeriod = completedInPeriod.reduce((acc, t) => acc + (t.cost || 0), 0);

        return {
            total: mechanicTickets.length,
            active: activeTickets.length,
            completed: completedInPeriod.length,
            revenue: revenueInPeriod,
            workload: workloadPercentage,
            list: activeTickets.slice(0, 3)
        };
    };

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case 'Ingresado': return 'text-zinc-500 bg-zinc-100';
            case 'En Espera': return 'text-amber-600 bg-amber-50';
            case 'En Reparación': return 'text-blue-600 bg-blue-50';
            case 'Listo para Entrega': return 'text-emerald-600 bg-emerald-50';
            default: return 'text-zinc-400 bg-zinc-50';
        }
    };

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="space-y-8 font-sans pb-20">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Gestión de Mecánicos</h2>
                    <p className="text-zinc-500 mt-1">Análisis de rendimiento y carga técnica en tiempo real.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-zinc-100 w-full xl:w-auto">
                    {/* Filter Mode Toggle */}
                    <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-xl border border-zinc-200/50">
                        {(['daily', 'monthly', 'yearly'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setFilterMode(m)}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                                    filterMode === m ? "bg-zinc-900 text-white shadow-md shadow-zinc-200" : "text-zinc-400 hover:text-zinc-600"
                                )}
                            >
                                {m === 'daily' ? 'Día' : m === 'monthly' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

                    {/* Specific Selectors based on mode */}
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                        {filterMode === 'daily' && (
                            <div className="relative group">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors pointer-events-none" />
                                <input
                                    type="date"
                                    className="pl-9 pr-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:border-zinc-900 outline-none transition-all bg-white"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>
                        )}

                        {filterMode === 'monthly' && (
                            <>
                                <select 
                                    className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:border-zinc-900 outline-none transition-all bg-white"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                >
                                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                                <select 
                                    className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:border-zinc-900 outline-none transition-all bg-white"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </>
                        )}

                        {filterMode === 'yearly' && (
                            <select 
                                className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 focus:border-zinc-900 outline-none transition-all bg-white min-w-[100px]"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                    </div>

                    <button
                        onClick={onAdd}
                        className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-zinc-200 active:scale-95 ml-auto sm:ml-4"
                    >
                        <Plus className="w-4 h-4" />
                        Técnico
                    </button>
                </div>
            </div>

            {/* Global KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-50 transition-opacity group-hover:opacity-100"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                            globalStats.revenue.growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                            {globalStats.revenue.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(Math.round(globalStats.revenue.growth))}%
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Ingresos de {filterMode === 'daily' ? 'Hoy' : filterMode === 'monthly' ? months[selectedMonth] : selectedYear}</h3>
                        <p className="text-2xl font-black text-zinc-900 tracking-tight">{currencyFormatter.format(globalStats.revenue.value)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-50 transition-opacity group-hover:opacity-100"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                            <Car className="w-6 h-6" />
                        </div>
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                            globalStats.count.growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                            {globalStats.count.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(Math.round(globalStats.count.growth))}%
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Vehículos Entregados</h3>
                        <p className="text-2xl font-black text-zinc-900 tracking-tight">{globalStats.count.value}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-50 transition-opacity group-hover:opacity-100"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 rounded-2xl bg-zinc-900 text-emerald-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Ticket Promedio</h3>
                        <p className="text-2xl font-black text-zinc-900 tracking-tight">
                            {currencyFormatter.format(globalStats.count.value > 0 ? globalStats.revenue.value / globalStats.count.value : 0)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Regular Mechanic Cards */}
                {mechanics.map((m) => {
                    const stats = getMechanicStats(m.name);
                    return (
                        <div key={m.id} className="bg-white rounded-3xl shadow-sm border border-zinc-100 hover:shadow-xl hover:border-emerald-100 transition-all duration-300 group flex flex-col h-full">
                            {/* Header Card */}
                            <div className="p-6 pb-4 flex items-center justify-between border-b border-zinc-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-200">
                                        <Wrench className="w-7 h-7 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{m.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">ID: {m.id.split('-')[0].toUpperCase()}</span>
                                            {stats.active > 3 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase">
                                                    <AlertTriangle className="w-3 h-3" /> Saturado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDelete(m.id)}
                                    className="p-2.5 text-zinc-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    title="Eliminar técnico"
                                >
                                    <UserMinus className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body / Stats */}
                            <div className="p-6 flex-1 space-y-6">
                                {/* Carga de Trabajo Visual */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-bold text-zinc-600 uppercase tracking-wider">Carga de Trabajo</span>
                                        <span className="text-sm font-black text-zinc-900">{stats.active} / 5</span>
                                    </div>
                                    <div className="h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50 p-0.5">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-1000 ease-out",
                                                stats.workload > 80 ? "bg-red-500" : (stats.workload > 50 ? "bg-amber-500" : "bg-emerald-500")
                                            )}
                                            style={{ width: `${stats.workload}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Resumen Financiero Personal */}
                                <div className="bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Ingresos Generados</span>
                                        <DollarSign className="w-3 h-3 text-emerald-500" />
                                    </div>
                                    <div className="text-2xl font-black text-emerald-900 group-hover:scale-105 transition-transform origin-left duration-300">
                                        {currencyFormatter.format(stats.revenue)}
                                    </div>
                                    <div className="text-[10px] text-emerald-600/70 font-bold mt-1">
                                        {stats.completed} vehículos en este periodo
                                    </div>
                                </div>

                                {/* Mini Dashboard Autos Actuales */}
                                <div>
                                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <Car className="w-3.5 h-3.5" /> Autos en Taller ({stats.active})
                                    </h4>
                                    <div className="space-y-2">
                                        {stats.list.length > 0 ? (
                                            stats.list.map((ticket) => (
                                                <div key={ticket.id} className="bg-zinc-50/50 p-3 rounded-xl border border-zinc-100 flex items-center justify-between group/item hover:bg-white hover:border-emerald-100 transition-all">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-zinc-900 truncate">{ticket.model}</p>
                                                        <p className="text-[10px] font-mono font-medium text-zinc-500">{ticket.id}</p>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-1 rounded-lg uppercase border italic",
                                                        getStatusColor(ticket.status)
                                                    )}>
                                                        {ticket.status}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-zinc-400 italic text-center py-2 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">Disponible para asignación.</p>
                                        )}
                                        {stats.active > 3 && (
                                            <p className="text-[10px] text-zinc-400 text-center font-bold">+ {stats.active - 3} vehículos adicionales...</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer KPI Score */}
                            <div className="p-4 bg-zinc-50 rounded-b-3xl border-t border-zinc-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-500">SCORE DE RENDIMIENTO</span>
                                <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                                    <TrendingUp className="w-4 h-4" />
                                    {stats.total > 0 ? Math.round((stats.completed / (stats.total || 1)) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Unassigned Tickets Card */}
                {globalStats.unassigned.count > 0 && (
                    <div className="bg-zinc-50/50 rounded-3xl shadow-sm border border-zinc-200 border-dashed hover:shadow-xl hover:border-red-100 transition-all duration-300 group flex flex-col h-full opacity-90 hover:opacity-100">
                        {/* Header Card */}
                        <div className="p-6 pb-4 flex items-center justify-between border-b border-zinc-200/50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center shadow-lg shadow-zinc-100">
                                    <UserX className="w-7 h-7 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-zinc-500 uppercase tracking-tight">Sin Asignar</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase">
                                            <AlertTriangle className="w-3 h-3" /> Atención Requerida
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body / Stats */}
                        <div className="p-6 flex-1 space-y-6">
                            <div className="bg-red-50/20 p-4 rounded-2xl border border-red-100/50">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Ingresos No Atribuidos</span>
                                    <DollarSign className="w-3 h-3 text-red-500" />
                                </div>
                                <div className="text-2xl font-black text-red-900">
                                    {currencyFormatter.format(globalStats.unassigned.revenue)}
                                </div>
                                <div className="text-[10px] text-red-600/70 font-bold mt-1">
                                    {globalStats.unassigned.count} vehículos sin mecánico registrado
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Car className="w-3.5 h-3.5" /> Tickets sin Dueño
                                </h4>
                                <div className="space-y-3">
                                    {globalStats.unassigned.tickets.slice(0, 10).map((ticket) => (
                                        <div key={ticket.id} className="bg-white p-4 rounded-2xl border border-zinc-100 flex items-center justify-between group/item hover:border-red-200 transition-all shadow-sm">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-black text-zinc-900 truncate">{ticket.model}</p>
                                                    <span className="text-[10px] font-mono font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase">{ticket.id}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                                        <Calendar className="w-3 h-3" />
                                                        {ticket.entry_date ? format(parseISO(ticket.entry_date), 'dd MMM', { locale: es }) : 'S/F'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-zinc-900 border-l border-zinc-200 pl-3">{currencyFormatter.format(ticket.cost || 0)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <select 
                                                    className="px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border border-zinc-200 focus:border-zinc-900 outline-none transition-all bg-zinc-50 group-hover/item:bg-white"
                                                    value=""
                                                    onChange={async (e) => {
                                                        const mId = e.target.value;
                                                        if (mId && onUpdateTicket) {
                                                            await onUpdateTicket(ticket.id, { mechanic_id: mId });
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Asignar Técnico</option>
                                                    {mechanics.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                    {globalStats.unassigned.count > 10 && (
                                        <p className="text-[10px] text-zinc-400 text-center font-bold italic mt-2">+ {globalStats.unassigned.count - 10} tickets adicionales sin asignar...</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info Footer */}
                        <div className="p-4 bg-red-50/30 rounded-b-3xl border-t border-red-100/50 text-center">
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Estos tickets afectan la precisión del KPI global</p>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {mechanics.length === 0 && globalStats.unassigned.count === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-zinc-200">
                        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <UserCircle className="w-10 h-10 text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 mb-2">Sin actividad registrada</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto">No hay mecánicos ni tickets con actividad en este periodo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
