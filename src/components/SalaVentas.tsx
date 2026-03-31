import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle,
  Package, Receipt, TrendingUp, X, ChevronRight, Clock,
  BarChart3, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Part, SalaVenta, SalaVentaItem, GarageSettings, PaymentMethod, Ticket, DocumentType } from '../types';
import { cn } from '../lib/utils';

interface SalaVentasProps {
  parts: Part[];
  tickets: Ticket[];
  onAddSalaVenta: (items: SalaVentaItem[], paymentMethod: PaymentMethod, documentType: DocumentType, rutEmpresa?: string, razonSocial?: string, notes?: string) => Promise<void>;
  fetchSalaVentas: (days?: number) => Promise<SalaVenta[]>;
  salaVentas: SalaVenta[];
  settings: GarageSettings | null;
}

interface CartItem {
  part: Part;
  cantidad: number;
}

export function SalaVentas({ parts, tickets, onAddSalaVenta, fetchSalaVentas, salaVentas, settings }: SalaVentasProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tarjeta');
  const [documentType, setDocumentType] = useState<DocumentType>('Boleta');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [razonSocial, setRazonSocial] = useState('');

  useEffect(() => {
    fetchSalaVentas(30);
  }, [fetchSalaVentas]);

  // ─── Filtrar inventario ───────────────────────────────────────────────────
  const filteredParts = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return parts.filter(p =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [search, parts]);

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  const addToCart = useCallback((part: Part) => {
    setCart(prev => {
      const existing = prev.find(c => c.part.id === part.id);
      if (existing) {
        return prev.map(c => c.part.id === part.id ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      return [...prev, { part, cantidad: 1 }];
    });
    setSearch('');
  }, []);

  const removeFromCart = useCallback((partId: string) => {
    setCart(prev => prev.filter(c => c.part.id !== partId));
  }, []);

  const changeQty = useCallback((partId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.part.id !== partId) return c;
      const newQty = c.cantidad + delta;
      return newQty <= 0 ? null! : { ...c, cantidad: newQty };
    }).filter(Boolean));
  }, []);

  const cartTotal = useMemo(() =>
    cart.reduce((acc, c) => acc + c.part.price * c.cantidad, 0), [cart]);

  // ─── Confirmar venta ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (cart.length === 0) return;
    setConfirming(true);
    try {
      const items: SalaVentaItem[] = cart.map(c => ({
        part_id: c.part.id,
        nombre: c.part.name,
        cantidad: c.cantidad,
        precio_unitario: c.part.price,
        subtotal: c.part.price * c.cantidad
      }));
      await onAddSalaVenta(items, paymentMethod, documentType, rutEmpresa || undefined, razonSocial || undefined, notes || undefined);
      setCart([]);
      setNotes('');
      setRutEmpresa('');
      setRazonSocial('');
      setSuccessMsg(`✅ Venta de $${cartTotal.toLocaleString()} registrada`);
      setTimeout(() => setSuccessMsg(''), 3500);
      await fetchSalaVentas(30);
    } finally {
      setConfirming(false);
    }
  };

  // ─── Calculador Homologado de Tickets ────────────────────────────────────
  const getTicketAmount = (t: Ticket): number => {
    if (t.cost && t.cost > 0) return t.cost;
    
    let total = 0;
    if (t.services && Array.isArray(t.services)) {
      total += t.services.reduce((acc, s) => acc + (Number(s.costo) || 0) * (Number(s.cantidad) || 1), 0);
    }
    if (t.spare_parts && Array.isArray(t.spare_parts)) {
      total += t.spare_parts.reduce((acc, sp) => acc + (Number(sp.costo) || 0) * (Number(sp.cantidad) || 1), 0);
    }
    
    if (total === 0 && t.quotation_total) return t.quotation_total;
    
    return total;
  };

  // ─── KPIs & historial por rango ───────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const safeParseDate = (dateStr: string | undefined): Date => {
      if (!dateStr) return new Date();
      // Handle Postgres format with spaces and standard ISO
      const d = parseISO(dateStr.replace(' ', 'T'));
      return isNaN(d.getTime()) ? new Date(dateStr) : d;
    };

    const ventasItems = salaVentas.map(v => ({
      id: v.id,
      type: 'venta' as const,
      date: v.sold_at,
      total: v.total,
      payment_method: v.payment_method,
      notes: v.notes,
      items: v.items,
      rut_empresa: v.rut_empresa,
      razon_social: v.razon_social,
      ticketData: undefined
    }));
    
    // Import dates: tickets created on these dates are legacy historical data
    const LEGACY_IMPORT_DATES = ['2026-03-15', '2026-03-17'];

    const ticketItems = tickets
      .filter(t => t.status === 'Finalizado' || t.status === 'Entregado')
      .map(t => {
        const ticketCreatedDate = (t.created_at || '').slice(0, 10);
        const isLegacyImport = LEGACY_IMPORT_DATES.includes(ticketCreatedDate);

        // For legacy imported tickets, always use entry_date (the real historical service date)
        // For real tickets, use last_status_change or close_date
        let effectiveDate: string;
        if (isLegacyImport) {
          effectiveDate = t.entry_date || t.close_date || t.created_at || new Date().toISOString();
        } else {
          effectiveDate = t.last_status_change || t.close_date || t.entry_date || t.created_at || new Date().toISOString();
        }

        return {
          id: t.id,
          type: 'ticket' as const,
          date: effectiveDate,
          total: getTicketAmount(t),
          payment_method: t.payment_method,
          notes: t.vehicle_notes || t.notes,
          items: undefined,
          rut_empresa: t.rut_empresa,
          razon_social: t.razon_social,
          ticketData: t
        };
      });
      
    const combined = [...ventasItems, ...ticketItems].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const startOfToday = startOfDay(now);
    
    return combined.filter(item => {
      const d = safeParseDate(item.date);
      
      if (timeRange === 'today') {
        const dayStr = format(d, 'yyyy-MM-dd');
        const todayStr = format(now, 'yyyy-MM-dd');
        return dayStr === todayStr;
      }
      
      const threshold = subDays(now, timeRange === '7d' ? 7 : 30);
      return d >= threshold;
    });
  }, [salaVentas, tickets, timeRange]);

  const { totalPeriod, cashTotal, cardTotal } = useMemo(() => {
    return filteredHistory.reduce((acc, item) => {
      const amount = item.total || 0;
      acc.totalPeriod += amount;
      if (item.payment_method === 'Efectivo') acc.cashTotal += amount;
      else acc.cardTotal += amount;
      return acc;
    }, { totalPeriod: 0, cashTotal: 0, cardTotal: 0 });
  }, [filteredHistory]);

  const labelRange = { today: 'Hoy', '7d': '7 días', '30d': '30 días' }[timeRange];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg ring-4 ring-emerald-600/20">
              <ShoppingCart className="w-8 h-8" />
            </div>
            Sala Ventas
            <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">Mostrador</span>
          </h2>
          <p className="text-zinc-500 mt-1 font-medium">Venta directa de productos sin registro de cliente.</p>
        </div>
        <div className="flex gap-2">
          {(['today', '7d', '30d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange === r ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50'}`}
            >
              {labelRange === r ? labelRange : { today: 'Hoy', '7d': '7 Días', '30d': '30 Días' }[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Success Banner ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm px-5 py-3 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: `Ventas ${labelRange}`, value: `$${totalPeriod.toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
          { label: `Transacciones ${labelRange}`, value: filteredHistory.length, icon: Receipt, color: 'blue' },
          { label: 'Ticket Promedio', value: filteredHistory.length > 0 ? `$${Math.round(totalPeriod / filteredHistory.length).toLocaleString()}` : '$0', icon: BarChart3, color: 'indigo' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white p-6 rounded-2xl border border-zinc-100 shadow-lg flex items-center gap-5`}>
            <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-black text-zinc-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Grid (POS + History) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── POS Panel ── */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-100">
            <h3 className="font-bold text-zinc-800 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Nueva Venta
            </h3>
          </div>

          {/* Search */}
          <div className="px-6 pt-5 relative">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Buscar Producto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nombre o código..."
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            {/* Dropdown results */}
            <AnimatePresence>
              {filteredParts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute z-20 top-full left-6 right-6 mt-1 bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden"
                >
                  {filteredParts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <div>
                        <div className="text-sm font-bold text-zinc-900">{p.name}</div>
                        <div className="text-xs text-zinc-400">{p.id} · Stock: {p.stock}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-700">${p.price.toLocaleString()}</div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 ml-auto" />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart */}
          <div className="flex-1 px-6 py-4 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-zinc-400 gap-3">
                <Package className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Agrega productos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                {cart.map(item => (
                  <motion.div
                    key={item.part.id}
                    layout
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-900 truncate">{item.part.name}</div>
                      <div className="text-xs text-zinc-400">${item.part.price.toLocaleString()} c/u</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item.part.id, -1)} className="w-7 h-7 bg-white border border-zinc-200 rounded-lg flex items-center justify-center hover:border-zinc-400 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-black w-6 text-center">{item.cantidad}</span>
                      <button onClick={() => changeQty(item.part.id, 1)} className="w-7 h-7 bg-white border border-zinc-200 rounded-lg flex items-center justify-center hover:border-zinc-400 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm font-black text-zinc-900 w-20 text-right">${(item.part.price * item.cantidad).toLocaleString()}</div>
                    <button onClick={() => removeFromCart(item.part.id)} className="text-zinc-300 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: notes + total + confirm */}
          <div className="p-6 border-t border-zinc-100 bg-zinc-50 space-y-3">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones (opcional)..."
              rows={2}
              className="w-full text-sm p-3 bg-white border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Efectivo', 'Tarjeta'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      paymentMethod === m 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Tipo de Documento</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Boleta', 'Factura'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDocumentType(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      documentType === d 
                        ? 'bg-zinc-800 border-zinc-800 text-white shadow-md' 
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Business Info for Factura */}
            {documentType === 'Factura' && (
              <div className="space-y-3 pt-3 border-t border-zinc-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">RUT Empresa</label>
                    <input
                      type="text"
                      value={rutEmpresa}
                      onChange={e => setRutEmpresa(e.target.value)}
                      placeholder="12.345.678-9"
                      className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Razón Social</label>
                    <input
                      type="text"
                      value={razonSocial}
                      onChange={e => setRazonSocial(e.target.value)}
                      placeholder="Empresa S.A."
                      className="w-full text-sm px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total</p>
                <p className="text-3xl font-black text-zinc-900">${cartTotal.toLocaleString()}</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={cart.length === 0 || confirming}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
              >
                <CheckCircle className="w-5 h-5" />
                {confirming ? 'Registrando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>

        {/* ── History Panel ── */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Historial — {labelRange}
            </h3>
            <span className="text-xs font-black text-emerald-400">{filteredHistory.length} ventas</span>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-3">
                <Receipt className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">Sin ventas en este período</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {filteredHistory.map(item => (
                  <div key={`${item.type}-${item.id}`} className="px-6 py-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(item.date), "d MMM · HH:mm", { locale: es })}
                          {item.type === 'venta' ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase ml-2">Mesón</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase ml-2">Taller</span>
                          )}
                        </div>
                        
                        {item.type === 'venta' ? (
                          <div className="space-y-0.5">
                            {item.items?.map((i: any, idx: number) => (
                              <div key={idx} className="text-xs text-zinc-400 truncate">
                                {i.cantidad}× {i.nombre}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-zinc-300 truncate">
                              [{item.ticketData?.patente || item.ticketData?.id}] {item.ticketData?.model}
                            </div>
                          </div>
                        )}
                        
                        {item.notes && <p className="text-xs text-zinc-500 italic mt-1 truncate">{item.notes}</p>}
                        
                        {(item.rut_empresa || item.razon_social) && (
                          <div className="mt-1.5 p-1.5 bg-zinc-800/50 rounded-lg border border-zinc-800 flex flex-col gap-0.5 relative">
                            <div className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                                Factura
                            </div>
                            {item.rut_empresa && <div className="text-[9px] font-black text-zinc-400 flex items-center gap-1.5">
                              <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tight">RUT:</span>
                              {item.rut_empresa}
                            </div>}
                            {item.razon_social && <div className="text-[9px] font-black text-zinc-400 flex items-center gap-1.5 pr-12">
                              <span className="text-[8px] text-zinc-600 font-black uppercase tracking-tight">Social:</span>
                              <span className="truncate">{item.razon_social}</span>
                            </div>}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className={`text-sm font-black whitespace-nowrap ${item.type === 'venta' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          ${item.total.toLocaleString()}
                        </div>
                        <div className={cn(
                          "text-[9px] font-black uppercase tracking-tighter mt-1 px-2 py-0.5 rounded-md border italic",
                          item.payment_method === 'Efectivo' 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        )}>
                          {item.payment_method || 'Tarjeta'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resumen {labelRange}</span>
              <span className="text-xl font-black text-emerald-400">${totalPeriod.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight flex items-center gap-1.5 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  Efectivo
                </div>
                <p className="text-sm font-black text-zinc-200">${cashTotal.toLocaleString()}</p>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight flex items-center gap-1.5 justify-end font-mono">
                  Tarjeta
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                </div>
                <p className="text-sm font-black text-zinc-200">${cardTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
