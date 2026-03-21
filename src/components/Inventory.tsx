import React, { useState } from 'react';
import { Part, GarageSettings } from '../types';
import { Package, AlertTriangle, Plus, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { AddPartModal } from './AddPartModal';
import { EditPartModal } from './EditPartModal';

interface InventoryProps {
  parts: Part[];
  settings: GarageSettings | null;
  onAddPart: (part: any) => Promise<void>;
  onUpdatePart: (id: string, updates: Partial<Part>) => Promise<void>;
}

export function Inventory({ parts, settings, onAddPart, onUpdatePart }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'alerts'>('all');

  const handleEdit = (part: Part) => {
    setSelectedPart(part);
    setIsEditModalOpen(true);
  };

  const filteredParts = parts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.id && p.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.assigned_to && p.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const lowStockParts = parts.filter(p => p.stock <= p.min_stock);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Inventario y Repuestos</h2>
          <p className="text-zinc-500 mt-1">Gestiona el stock de piezas y asignaciones a vehículos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Repuesto
        </button>
      </div>

      <AddPartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={onAddPart}
      />

      {/* Tabs Switcher */}
      <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
            activeTab === 'all' 
              ? "bg-white text-zinc-900 shadow-sm" 
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Package className="w-4 h-4" />
          Todos los Repuestos
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-zinc-200 text-[10px] text-zinc-600">
            {parts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
            activeTab === 'alerts' 
              ? "bg-amber-500 text-white shadow-sm" 
              : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <AlertTriangle className={cn("w-4 h-4", activeTab === 'alerts' ? "text-white" : "text-amber-500")} />
          Alertas de Stock
          {lowStockParts.length > 0 && (
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
              activeTab === 'alerts' ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-600"
            )}>
              {lowStockParts.length}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        {activeTab === 'all' ? (
          <>
            <div className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, código o patente..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden divide-y divide-zinc-100">
              {filteredParts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Package className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                  <p className="text-zinc-500 font-medium">No se encontraron repuestos.</p>
                </div>
              ) : (
                filteredParts.map((part) => (
                  <div key={part.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200">
                          <Package className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 leading-tight">{part.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-tighter">ID: {part.id}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(part)}
                        className="text-emerald-600 font-extrabold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                      >
                        Editar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Stock</p>
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "font-black text-lg",
                            part.stock <= part.min_stock ? "text-red-600" : "text-zinc-900"
                          )}>
                            {part.stock}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">/ Min: {part.min_stock}</span>
                        </div>
                      </div>
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Precio</p>
                        <p className="font-black text-lg text-zinc-900">
                          ${part.price.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Asignado:</p>
                        {part.assigned_to ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {part.assigned_to}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Sin asignar</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="px-6 py-4">ID / Código</th>
                    <th className="px-6 py-4">Repuesto</th>
                    <th className="px-6 py-4 text-right">Stock</th>
                    <th className="px-6 py-4 text-right">Precio Unit.</th>
                    <th className="px-6 py-4">Asignado</th>
                    <th className="px-1 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Package className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                        <p className="text-zinc-500 font-medium">No se encontraron repuestos.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => (
                      <tr key={part.id} className="hover:bg-zinc-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200">
                            {part.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200">
                              <Package className="w-4 h-4 text-zinc-500" />
                            </div>
                            <span className="font-semibold text-zinc-900">{part.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "font-bold text-sm",
                              part.stock <= part.min_stock ? "text-red-600" : "text-zinc-900"
                            )}>
                              {part.stock}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Min: {part.min_stock}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-zinc-700">
                          ${part.price.toLocaleString('es-CL')}
                        </td>
                        <td className="px-6 py-4 text-center md:text-left">
                          {part.assigned_to ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {part.assigned_to}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Libre</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleEdit(part)}
                            className="text-emerald-600 hover:text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-lg">Stock Crítico</h3>
                <p className="text-sm text-zinc-500">Repuestos con existencia igual o inferior al mínimo configurado.</p>
              </div>
            </div>

            {lowStockParts.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                <Package className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <h4 className="font-bold text-emerald-900">¡Todo en orden!</h4>
                <p className="text-emerald-600 text-sm">No hay repuestos con bajo stock en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStockParts.map(part => (
                  <div key={part.id} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between group hover:border-amber-300 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                          <Package className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
                          Stock: {part.stock}
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 group-hover:text-amber-700 transition-colors" title={part.name}>{part.name}</h4>
                      <p className="text-xs text-zinc-500 mt-1 mb-4 flex items-center gap-1.5">
                        Límite mínimo: <span className="font-bold text-zinc-700">{part.min_stock}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const message = `Hola Roma Center, necesito re-stock de:\n\n*ID:* ${part.id}\n*Repuesto:* ${part.name}\n*Stock Actual:* ${part.stock}\n*Mínimo Requerido:* ${part.min_stock}\n\nFavor cotizar.`;
                        window.open(`https://wa.me/${settings?.phone || ''}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95"
                    >
                      Enviar Pedido WhatsApp
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <EditPartModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        part={selectedPart}
        onUpdate={onUpdatePart}
      />
    </div>
  );
}
