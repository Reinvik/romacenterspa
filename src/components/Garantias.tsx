import React, { useState } from 'react';
import { ShieldCheck, Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { Garantia, GarageSettings } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddGarantiaModal } from './AddGarantiaModal';

interface GarantiasProps {
  garantias: Garantia[];
  onAdd: (garantia: Partial<Garantia>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Garantia>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  settings: GarageSettings | null;
}

export function Garantias({ garantias, onAdd, onUpdate, onDelete, settings }: GarantiasProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGarantia, setEditingGarantia] = useState<Garantia | null>(null);

  const filteredGarantias = garantias.filter(g => 
    g.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.nombre && g.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          Garantías y Abonos
        </h2>
        <button
          onClick={() => {
            setEditingGarantia(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors w-full sm:w-auto justify-center font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nueva Garantía/Abono
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por patente o nombre..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-y border-zinc-200">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Patente</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
                <th className="px-4 py-3 font-medium text-right">Monto</th>
                <th className="px-4 py-3 font-medium">Comentarios</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredGarantias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                filteredGarantias.map((garantia) => (
                  <tr key={garantia.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                      {format(new Date(garantia.fecha), "dd 'de' MMMM, yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono bg-zinc-100 px-2 py-1 rounded text-zinc-700 font-medium">
                        {garantia.patente}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{garantia.nombre || '-'}</td>
                    <td className="px-4 py-3 text-zinc-600 max-w-xs truncate" title={garantia.detalle || ''}>
                      {garantia.detalle || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {formatCurrency(garantia.monto)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 max-w-xs truncate" title={garantia.comentarios || ''}>
                      {garantia.comentarios || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingGarantia(garantia);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Editar registro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                              onDelete(garantia.id);
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddGarantiaModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingGarantia(null);
        }}
        onAdd={onAdd}
        onUpdate={onUpdate}
        initialData={editingGarantia}
      />
    </div>
  );
}
