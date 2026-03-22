import React, { useMemo, useState } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, Package, Calendar, 
  ChevronRight, Search, Filter, Download, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Ticket, Part, GarageSettings, SalaVenta } from '../types';

interface SalesProps {
  tickets: Ticket[];
  parts: Part[];
  settings: GarageSettings | null;
  salaVentas?: SalaVenta[];
}

export function Sales({ tickets, parts, settings, salaVentas = [] }: SalesProps) {
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, all
  const [searchTerm, setSearchTerm] = useState('');

  // Helper: get the best available amount for a ticket
  // Priority: cost > quotation_total > sum(spare_parts)
  const getTicketAmount = (t: Ticket): number => {
    if (t.cost && t.cost > 0) return t.cost;
    if (t.quotation_total && t.quotation_total > 0) return t.quotation_total;
    if (t.spare_parts && t.spare_parts.length > 0) {
      return t.spare_parts.reduce((acc, sp) => acc + (sp.costo || 0) * (sp.cantidad ?? 1), 0);
    }
    return 0;
  };

  // 1. Filter tickets that are "Finalizado" (Sales)
  const salesTickets = useMemo(() => {
    return tickets.filter(t => t.status === 'Finalizado');
  }, [tickets]);

  // 2. Filter by date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

    if (timeRange === '7d') startDate = subDays(now, 7);
    else if (timeRange === '30d') startDate = subDays(now, 30);

    return salesTickets.filter(t => {
      const closeDateStr = t.close_date || t.last_status_change || t.entry_date;
      const closeDate = closeDateStr ? parseISO(closeDateStr) : null;
      if (!closeDate) return false;
      
      const isInRange = !startDate || closeDate >= startDate;
      const matchesSearch = !searchTerm || 
        t.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.model.toLowerCase().includes(searchTerm.toLowerCase());
        
      return isInRange && matchesSearch;
    }).sort((a, b) => {
        const dateA = a.close_date ? parseISO(a.close_date).getTime() : 0;
        const dateB = b.close_date ? parseISO(b.close_date).getTime() : 0;
        return dateB - dateA;
    });
  }, [salesTickets, timeRange, searchTerm]);

  // 3. KPI Calculations — includes Sala Ventas (counter / POS sales)
  const stats = useMemo(() => {
    const ticketRevenue = filteredSales.reduce((acc, t) => acc + getTicketAmount(t), 0);

    // Filter sala ventas by the same date range
    const now = new Date();
    let startDate: Date | null = null;
    if (timeRange === '7d') startDate = subDays(now, 7);
    else if (timeRange === '30d') startDate = subDays(now, 30);

    const filteredSalaVentas = salaVentas.filter(v => {
      const d = parseISO(v.sold_at);
      return !startDate || d >= startDate;
    });
    const mesaRevenue = filteredSalaVentas.reduce((acc, v) => acc + v.total, 0);

    const totalRevenue = ticketRevenue + mesaRevenue;
    const totalCount = filteredSales.length + filteredSalaVentas.length;
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const todayRevenue = filteredSales.filter(t => {
      const d = t.close_date ? parseISO(t.close_date) : 
                t.last_status_change ? parseISO(t.last_status_change) : 
                t.entry_date ? parseISO(t.entry_date) : null;
      return d && isWithinInterval(d, { start: todayStart, end: todayEnd });
    }).reduce((acc, t) => acc + getTicketAmount(t), 0) +
    filteredSalaVentas.filter(v => {
      const d = parseISO(v.sold_at);
      return isWithinInterval(d, { start: todayStart, end: todayEnd });
    }).reduce((acc, v) => acc + v.total, 0);

    return {
      totalRevenue,
      salesCount: totalCount,
      ticketRevenue,
      mesaRevenue,
      avgTicket,
      todayRevenue,
      revenueTrend: 12.5,
    };
  }, [filteredSales, salaVentas, timeRange]);

  // 4. Data for Chart (Daily Sales)
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySales = salesTickets.filter(t => {
        const closeDateStr = t.close_date || t.last_status_change || t.entry_date;
        const closeDate = closeDateStr ? parseISO(closeDateStr) : null;
        return closeDate && isWithinInterval(closeDate, { start: dayStart, end: dayEnd });
      });

      return {
        label: format(date, 'EEE', { locale: es }),
        total: daySales.reduce((acc, t) => acc + getTicketAmount(t), 0)
              + salaVentas.filter(v => {
                  const d = parseISO(v.sold_at);
                  return isWithinInterval(d, { start: dayStart, end: dayEnd });
                }).reduce((acc, v) => acc + v.total, 0),
        count: daySales.length
      };
    });

    const maxVal = Math.max(...last7Days.map(d => d.total), 1);
    return last7Days.map(d => ({
      ...d,
      height: (d.total / maxVal) * 100
    }));
  }, [salesTickets, salaVentas]); // Added salaVentas to dependencies

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Evolution 4.0 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
            <div className="p-2 bg-zinc-900 text-white rounded-xl shadow-lg ring-4 ring-zinc-900/10">
              <BarChart3 className="w-8 h-8" />
            </div>
            Inf. de Ventas
            <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">v4.0</span>
          </h2>
          <p className="text-zinc-500 mt-1 font-medium italic">"Lo que no se mide, no se puede mejorar."</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-xl border border-zinc-200 shadow-sm flex gap-1">
            {['7d', '30d', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                  timeRange === range 
                    ? "bg-zinc-900 text-white shadow-md" 
                    : "text-zinc-500 hover:bg-zinc-100"
                )}
              >
                {range === '7d' ? '7 Días' : range === '30d' ? '30 Días' : 'Todo'}
              </button>
            ))}
          </div>
          <button className="p-2.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm text-zinc-600">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Ventas Totales"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          trend="+12.5%"
          icon={DollarSign}
          color="emerald"
          delay={0}
        />
        <KpiCard 
          title="Ordenes Cerradas"
          value={stats.salesCount}
          trend="+5.2%"
          icon={ShoppingBag}
          color="blue"
          delay={0.1}
        />
        <KpiCard 
          title="Ticket Promedio"
          value={`$${Math.round(stats.avgTicket).toLocaleString()}`}
          trend="-2.4%"
          trendDown
          icon={TrendingUp}
          color="indigo"
          delay={0.2}
        />
        <KpiCard 
          title="Ingresos del Día"
          value={`$${Math.round(stats.todayRevenue).toLocaleString()}`}
          trend="+18.1%"
          icon={ArrowUpRight}
          color="amber"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden group">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Tendencia Semanal
            </h3>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ingresos por día</span>
          </div>
          
          <div className="p-8 h-64 flex items-end justify-between gap-4">
            {chartData.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                <div className="relative w-full group/bar h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${day.height}%` }}
                    transition={{ duration: 1, delay: 0.4 + idx * 0.1, ease: "easeOut" }}
                    className={cn(
                      "w-full rounded-t-xl min-h-[4px] relative bg-gradient-to-t transition-all duration-300",
                      idx === 6 ? "from-emerald-600 to-emerald-400" : "from-zinc-200 to-zinc-100 group-hover/bar:from-emerald-200 group-hover/bar:to-emerald-100"
                    )}
                  />
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold pointer-events-none">
                    ${day.total.toLocaleString()}
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">{day.label}</span>
              </div>
            ))}
          </div>

          <div className="px-8 py-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    Hoy: ${chartData[6].total.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                    Promedio: ${Math.round(chartData.reduce((a, b) => a + b.total, 0) / 7).toLocaleString()}
                </div>
             </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl p-6 text-zinc-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors" />
          
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Ventas Recientes
          </h3>

          <div className="space-y-4">
             {filteredSales.slice(0, 5).map((sale, i) => (
               <div key={sale.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-[10px] border border-zinc-700">
                        {sale.id.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-xs font-bold group-hover/item:text-emerald-400 transition-colors">{sale.model}</div>
                        <div className="text-[10px] text-zinc-500 font-medium truncate w-24">{sale.owner_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black">${getTicketAmount(sale).toLocaleString()}</div>
                    <div className="text-[9px] text-zinc-500 uppercase font-bold">{format(parseISO(sale.close_date || sale.last_status_change || sale.entry_date), 'dd MMM')}</div>
                  </div>
               </div>
             ))}

             {filteredSales.length === 0 && (
                <div className="text-center py-12 text-zinc-500 italic text-sm">
                    No hay ventas registradas.
                </div>
             )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Filter className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-zinc-800">Histórico de Transacciones</h3>
            </div>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                    type="text"
                    placeholder="Filtrar por nombre, patente..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-zinc-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Patente / Modelo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Monto</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-zinc-50/80 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">{sale.id}</div>
                                <div className="text-xs text-zinc-500">{sale.model}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-zinc-700 font-medium">{sale.owner_name}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-bold">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {format(parseISO(sale.close_date || sale.last_status_change || sale.entry_date), "d 'de' MMM, yyyy", { locale: es })}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="text-sm font-black text-zinc-900">${getTicketAmount(sale).toLocaleString()}</div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon: Icon, color, delay, trendDown }: any) {
  const textColors: any = {
      emerald: "text-emerald-600",
      blue: "text-blue-600",
      indigo: "text-indigo-600",
      amber: "text-amber-600",
  };

  const bgColors: any = {
      emerald: "bg-emerald-50",
      blue: "bg-blue-50",
      indigo: "bg-indigo-50",
      amber: "bg-amber-50",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", bgColors[color], textColors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg",
          trendDown ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
        )}>
          {trendDown ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-black text-zinc-900 tracking-tight">{value}</h4>
      </div>
    </motion.div>
  );
}
