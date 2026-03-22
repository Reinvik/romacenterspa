import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle,
  Package, Receipt, TrendingUp, X, ChevronRight, Clock,
  BarChart3, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Part, SalaVenta, SalaVentaItem, GarageSettings } from '../types';

interface SalaVentasProps {
  parts: Part[];
  onAddSalaVenta: (items: SalaVentaItem[], notes?: string) => Promise<void>;
  fetchSalaVentas: (days?: number) => Promise<SalaVenta[]>;
  salaVentas: SalaVenta[];
  settings: GarageSettings | null;
}

interface CartItem {
  part: Part;
  cantidad: number;
}

export function SalaVentas({ parts, onAddSalaVenta, fetchSalaVentas, salaVentas, settings }: SalaVentasProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today');

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
      await onAddSalaVenta(items, notes || undefined);
      setCart([]);
      setNotes('');
      setSuccessMsg(`✅ Venta de $${cartTotal.toLocaleString()} registrada`);
      setTimeout(() => setSuccessMsg(''), 3500);
      await fetchSalaVentas(30);
    } finally {
      setConfirming(false);
    }
  };

  // ─── KPIs & historial por rango ───────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    const now = new Date();
    return salaVentas.filter(v => {
      const d = parseISO(v.sold_at);
      if (timeRange === 'today') return isWithinInterval(d, { start: startOfDay(now), end: endOfDay(now) });
      if (timeRange === '7d') return d >= subDays(now, 7);
      return d >= subDays(now, 30);
    });
  }, [salaVentas, timeRange]);

  const totalPeriod = useMemo(() =>
    filteredHistory.reduce((acc, v) => acc + v.total, 0), [filteredHistory]);

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
                {filteredHistory.map(v => (
                  <div key={v.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(v.sold_at), "d MMM · HH:mm", { locale: es })}
                        </div>
                        <div className="space-y-0.5">
                          {v.items.map((item, i) => (
                            <div key={i} className="text-xs text-zinc-400 truncate">
                              {item.cantidad}× {item.nombre}
                            </div>
                          ))}
                        </div>
                        {v.notes && <p className="text-xs text-zinc-500 italic mt-1 truncate">{v.notes}</p>}
                      </div>
                      <div className="text-sm font-black text-emerald-400 whitespace-nowrap">${v.total.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-zinc-800 bg-zinc-950/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total {labelRange}</span>
              <span className="text-xl font-black text-emerald-400">${totalPeriod.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
