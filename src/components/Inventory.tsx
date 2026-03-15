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

  const handleEdit = (part: Part) => {
    setSelectedPart(part);
    setIsEditModalOpen(true);
  };

  const filteredParts = parts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.assigned_to && p.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const lowStockParts = parts.filter(p => p.stock <= p.min_stock);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Inventario y Repuestos</h2>
          <p className="text-zinc-500 mt-1">Gestiona el stock de piezas y asignaciones a vehículos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
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

      {lowStockParts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-amber-900 text-lg">Alertas de Stock Mínimo</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {lowStockParts.map(part => (
              <div key={part.id} className="bg-white p-4 rounded-xl border border-amber-100 flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-semibold text-zinc-900 truncate max-w-[150px]" title={part.name}>{part.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">Stock: <span className="font-bold text-red-600">{part.stock}</span> / Min: {part.min_stock}</p>
                </div>
                <button
                  onClick={() => {
                    const message = `Hola, quiero cotizar y comprar el siguiente repuesto:\n\n*Repuesto:* ${part.name}\n*Stock Actual:* ${part.stock}\n*Mínimo Requerido:* ${part.min_stock}\n\nQuedo atento.`;
                    window.open(`https://wa.me/${settings?.phone || ''}?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95"
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar repuesto o patente..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filteredParts.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 font-medium">
              No se encontraron repuestos.
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
                      <h4 className="font-bold text-zinc-900">{part.name}</h4>
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

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Stock</p>
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
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Precio</p>
                    <p className="font-black text-lg text-zinc-900">
                      ${part.price.toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
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
              <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Repuesto</th>
                <th className="px-6 py-4 text-right">Stock</th>
                <th className="px-6 py-4 text-right">Precio Unit.</th>
                <th className="px-6 py-4">Asignado A</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 font-medium">
                    No se encontraron repuestos.
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => (
                  <tr key={part.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200">
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
                        <span className="text-xs text-zinc-400">Min: {part.min_stock}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-700">
                      ${part.price.toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4">
                      {part.assigned_to ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {part.assigned_to}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleEdit(part)}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm opacity- group-hover:opacity-100 transition-opacity"
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
