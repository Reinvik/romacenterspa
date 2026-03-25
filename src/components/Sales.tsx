import React, { useMemo, useState } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, Package, Calendar, 
  ChevronRight, Search, Filter, Download, Info, Wrench,
  Banknote, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Ticket, Part, GarageSettings, SalaVenta } from '../types';
import * as XLSX from 'xlsx';

interface SalesProps {
  tickets: Ticket[];
  parts: Part[];
  settings: GarageSettings | null;
  salaVentas?: SalaVenta[];
}

export function Sales({ tickets, parts, settings, salaVentas = [] }: SalesProps) {
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | 'all'>('7d');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  // 1. Filter tickets that are "Finalizado" or "Entregado" (Sales)
  const salesTickets = useMemo(() => {
    return tickets.filter(t => t.status === 'Finalizado' || t.status === 'Entregado');
  }, [tickets]);

  // 2. Filter by date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (timeRange === '1d') {
      startDate = startOfDay(parseISO(selectedDate));
      endDate = endOfDay(parseISO(selectedDate));
    } else if (timeRange === '7d') {
      startDate = subDays(now, 7);
    } else if (timeRange === '30d') {
      startDate = subDays(now, 30);
    }

    return salesTickets.filter(t => {
      const closeDateStr = t.close_date || t.last_status_change || t.entry_date;
      const closeDate = closeDateStr ? parseISO(closeDateStr) : null;
      if (!closeDate) return false;
      
      const isInRange = timeRange === '1d' 
        ? isWithinInterval(closeDate, { start: startDate!, end: endDate! })
        : (!startDate || closeDate >= startDate);
      
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
    const now = new Date();
    
    // Revenue from tickets
    const ticketRevenue = filteredSales.reduce((acc, t) => acc + getTicketAmount(t), 0);

    // Filter Sala Ventas based on date range
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (timeRange === '1d') {
      startDate = startOfDay(parseISO(selectedDate));
      endDate = endOfDay(parseISO(selectedDate));
    } else if (timeRange === '7d') {
      startDate = subDays(now, 7);
    } else if (timeRange === '30d') {
      startDate = subDays(now, 30);
    }

    const filteredSalaVentas = salaVentas.filter(v => {
      const d = v.sold_at ? parseISO(v.sold_at) : null;
      if (!d) return false;
      const isInRange = timeRange === '1d' 
        ? isWithinInterval(d, { start: startDate!, end: endDate! })
        : (!startDate || d >= startDate);
      return isInRange; 
    });

    const posRevenue = filteredSalaVentas.reduce((acc, v) => acc + (v.total || 0), 0);
    const totalRevenue = ticketRevenue + posRevenue;

    const totalCount = filteredSales.length + filteredSalaVentas.length;
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;
    
    // Cash / Card split for Tickets
    const cashTickets = filteredSales.filter(t => (t as any).payment_method === 'Efectivo').reduce((acc, t) => acc + getTicketAmount(t), 0);
    const cardTickets = filteredSales.filter(t => (t as any).payment_method !== 'Efectivo').reduce((acc, t) => acc + getTicketAmount(t), 0);

    // Cash / Card split for POS
    const cashPOS = filteredSalaVentas.filter(v => v.payment_method === 'Efectivo').reduce((acc, v) => acc + (v.total || 0), 0);
    const cardPOS = filteredSalaVentas.filter(v => v.payment_method !== 'Efectivo').reduce((acc, v) => acc + (v.total || 0), 0);

    return {
      totalRevenue,
      salesCount: totalCount,
      cashRevenue: cashTickets + cashPOS,
      cardRevenue: cardTickets + cardPOS,
      revenueTrend: 12.5,
    };
  }, [filteredSales, salaVentas, timeRange, selectedDate]);

  // 4. Data for Chart (Daily or Monthly Sales)
  const chartData = useMemo(() => {
    if (timeRange === 'all') {
      // Last 12 months
      const end = new Date();
      const start = subMonths(end, 11);
      const months = eachMonthOfInterval({ start, end });

      const data = months.map(month => {
        const mStart = startOfMonth(month);
        const mEnd = endOfMonth(month);

        const mSales = salesTickets.filter(t => {
          const closeDateStr = t.close_date || t.last_status_change || t.entry_date;
          const closeDate = closeDateStr ? parseISO(closeDateStr) : null;
          return closeDate && isWithinInterval(closeDate, { start: mStart, end: mEnd });
        });
        
        const mSalaVentas = salaVentas.filter(v => {
          const d = v.sold_at ? parseISO(v.sold_at) : null;
          return d && isWithinInterval(d, { start: mStart, end: mEnd });
        });

        const total = mSales.reduce((acc, t) => acc + getTicketAmount(t), 0) + 
                      mSalaVentas.reduce((acc, v) => acc + (v.total || 0), 0);

        return {
          label: format(month, 'MMM', { locale: es }),
          fullDate: format(month, 'MMMM yyyy', { locale: es }),
          total,
          count: mSales.length + mSalaVentas.length
        };
      });

      const maxVal = Math.max(...data.map(d => d.total), 1);
      return data.map(d => ({ ...d, height: (d.total / maxVal) * 100 }));
    }

    const daysCount = timeRange === '7d' ? 7 : 30;
    
    const data = Array.from({ length: daysCount }, (_, i) => {
      const date = subDays(new Date(), daysCount - 1 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySales = salesTickets.filter(t => {
        const closeDateStr = t.close_date || t.last_status_change || t.entry_date;
        const closeDate = closeDateStr ? parseISO(closeDateStr) : null;
        return closeDate && isWithinInterval(closeDate, { start: dayStart, end: dayEnd });
      });
      
      const daySalaVentas = salaVentas.filter(v => {
        const d = v.sold_at ? parseISO(v.sold_at) : null;
        return d && isWithinInterval(d, { start: dayStart, end: dayEnd });
      });

      const total = daySales.reduce((acc, t) => acc + getTicketAmount(t), 0) +
                    daySalaVentas.reduce((acc, v) => acc + (v.total || 0), 0);

      return {
        label: daysCount > 15 ? format(date, 'd') : format(date, 'EEE', { locale: es }),
        fullDate: format(date, 'dd/MM'),
        total,
        count: daySales.length + daySalaVentas.length
      };
    });

    const maxVal = Math.max(...data.map(d => d.total), 1);
    return data.map(d => ({
      ...d,
      height: (d.total / maxVal) * 100
    }));
  }, [salesTickets, salaVentas, timeRange]);

  // 5. TOP SELLERS calculation
  const topSellers = useMemo(() => {
    const servicesMap: Record<string, { qty: number; total: number }> = {};
    const productsMap: Record<string, { qty: number; total: number }> = {};

    const isLabor = (name: string) => {
      const n = name.toLowerCase();
      return n.includes('servicio') || n.includes('m.o.') || n.includes('mano de obra');
    };

    filteredSales.forEach(t => {
      // From spare_parts (sometimes services are here if not separated)
      (t.spare_parts || []).forEach(sp => {
        const map = isLabor(sp.descripcion) ? servicesMap : productsMap;
        if (!map[sp.descripcion]) map[sp.descripcion] = { qty: 0, total: 0 };
        map[sp.descripcion].qty += (sp.cantidad || 1);
        map[sp.descripcion].total += (sp.costo || 0) * (sp.cantidad || 1);
      });
      // From services
      (t.services || []).forEach(s => {
        if (!servicesMap[s.descripcion]) servicesMap[s.descripcion] = { qty: 0, total: 0 };
        servicesMap[s.descripcion].qty += (s.cantidad || 1);
        servicesMap[s.descripcion].total += (s.costo || 0) * (s.cantidad || 1);
      });
    });

    // Removed Sala Ventas from top sellers calculation per user request


    const sortAndSlice = (map: Record<string, any>) => 
      Object.entries(map)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
      services: sortAndSlice(servicesMap),
      products: sortAndSlice(productsMap)
    };
  }, [filteredSales, salaVentas, timeRange]);

  const handleDownload = () => {
    const headers = ["ID", "Fecha", "Tipo", "Descripción/Cliente", "Monto", "Pago"];
    const rows = filteredSales.map(t => [
      t.id,
      format(parseISO(t.close_date || t.last_status_change || t.entry_date), 'yyyy-MM-dd'),
      "Servicio",
      t.owner_name,
      getTicketAmount(t).toString(),
      t.payment_method || 'Tarjeta'
    ]);

    // Removed Sala Ventas from CSV download per user request


    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");

    // Ajustar anchos de columna
    const maxWidths = headers.map((h, i) => {
      const colData = [h, ...rows.map(r => r[i]?.toString() || "")];
      return Math.max(...colData.map(val => val.length)) + 2;
    });
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `reporte_ventas_${timeRange}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Evolution 4.0 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
            <div className="p-2 bg-zinc-900 text-white rounded-xl shadow-lg ring-4 ring-zinc-900/10">
              <BarChart3 className="w-8 h-8" />
            </div>
            Informe de Ventas
            <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">v4.2</span>
          </h2>
          <p className="text-zinc-500 mt-1 font-medium">Facturación y movimientos por período.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {timeRange === '1d' && (
             <div className="relative group">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
             </div>
          )}
          
          <div className="bg-white border border-zinc-200 p-1 rounded-xl flex items-center gap-1 shadow-sm">
            {[
              { id: '1d', label: '1 Día' },
              { id: '7d', label: '7 Días' },
              { id: '30d', label: '30 Días' },
              { id: 'all', label: 'Todo' }
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  timeRange === range.id
                    ? "bg-zinc-900 text-white shadow-md shadow-zinc-200" 
                    : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          <button 
            onClick={handleDownload}
            className="p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 shadow-sm transition-all group/dl"
            title="Exportar Reporte"
          >
            <Download className="w-4 h-4 group-hover/dl:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          color="indigo"
          delay={0.1}
        />
        <KpiCard 
          title="Efectivo (Caja)"
          value={`$${stats.cashRevenue.toLocaleString()}`}
          trend="Disponible"
          icon={Banknote}
          color="emerald"
          delay={0.2}
        />
        <KpiCard 
          title="Ventas Tarjeta"
          value={`$${stats.cardRevenue.toLocaleString()}`}
          trend="Confirmado"
          icon={CreditCard}
          color="blue"
          delay={0.3}
        />
      </div>

        {/* Tendencia Periódica - Full Width Row */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden group">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              {timeRange === 'all' ? 'Desempeño Anual' : 'Tendencia Periódica'}
            </h3>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              {timeRange === 'all' ? 'Ingresos por mes' : 'Ingresos por día'}
            </span>
          </div>
          
          <div className="p-8 h-64 flex items-end justify-between gap-2 md:gap-4">
            {chartData.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                <div className="relative w-full group/bar h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${day.height}%` }}
                    transition={{ duration: 1, delay: 0.1 + idx * 0.05, ease: "easeOut" }}
                    className={cn(
                      "w-full rounded-t-lg min-h-[4px] relative bg-gradient-to-t transition-all duration-300",
                      idx === chartData.length - 1 ? "from-emerald-600 to-emerald-400" : "from-zinc-200 to-zinc-100 group-hover/bar:from-emerald-200 group-hover/bar:to-emerald-100"
                    )}
                  />
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold pointer-events-none flex flex-col items-center shadow-xl">
                    <span className="text-zinc-400 text-[8px] uppercase">{day.fullDate}</span>
                    <span>${day.total.toLocaleString()}</span>
                    <span className="text-[7px] text-zinc-500">{day.count} servicios</span>
                  </div>
                </div>
                <span className={cn(
                  "text-[8px] md:text-[10px] font-black uppercase text-zinc-400 tracking-tighter",
                  timeRange === 'all' ? "rotate-0" : ""
                )}>{day.label}</span>
              </div>
            ))}
          </div>

          <div className="px-8 py-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    Actual: ${chartData[chartData.length - 1].total.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                    <div className="w-3 h-3 rounded-full bg-zinc-300" />
                    Promedio: ${Math.round(chartData.reduce((a, b) => a + b.total, 0) / chartData.length).toLocaleString()}
                </div>
             </div>
          </div>
        </div>

        {/* Second Row: Top Sellers (Side by Side) */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col mb-8">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h3 className="font-bold text-zinc-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Lo más vendido
            </h3>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Top 5</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 p-8">
            {/* Products (Left) */}
            <div>
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Package className="w-4 h-4" /> Insumos / Repuestos
              </h4>
              <div className="space-y-5">
                {topSellers.products.map((p, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="truncate pr-4 text-zinc-700">{p.name}</span>
                      <span className="text-zinc-900 whitespace-nowrap">${p.total.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.total / (topSellers.products[0]?.total || 1)) * 100}%` }}
                        className="h-full bg-emerald-500" 
                      />
                    </div>
                  </div>
                ))}
                {topSellers.products.length === 0 && (
                  <div className="text-zinc-400 text-sm italic">Sin datos registrados en el periodo.</div>
                )}
              </div>
            </div>

            {/* Services (Right) */}
            <div>
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Servicios / M.O.
              </h4>
              <div className="space-y-5">
                {topSellers.services.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="truncate pr-4 text-zinc-700">{s.name}</span>
                      <span className="text-zinc-900 whitespace-nowrap">${s.total.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.total / (topSellers.services[0]?.total || 1)) * 100}%` }}
                        className="h-full bg-indigo-500" 
                      />
                    </div>
                  </div>
                ))}
                {topSellers.services.length === 0 && (
                  <div className="text-zinc-400 text-sm italic">Sin datos registrados en el periodo.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Filter className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-zinc-800">Servicios Mecánicos</h3>
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
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Pago</th>
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
                             <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border italic",
                                        sale.payment_method === 'Efectivo' 
                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                    )}>
                                        {sale.payment_method || 'Tarjeta'}
                                    </span>
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
