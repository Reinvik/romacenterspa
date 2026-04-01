import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Garantia } from '../types';
import { format } from 'date-fns';

interface AddGarantiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (garantia: Partial<Garantia>) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Garantia>) => Promise<void>;
  initialData?: Garantia | null;
}

export function AddGarantiaModal({ isOpen, onClose, onAdd, onUpdate, initialData }: AddGarantiaModalProps) {
  const [formData, setFormData] = useState<Partial<Garantia>>({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    patente: '',
    nombre: '',
    detalle: '',
    monto: 0,
    comentarios: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          fecha: initialData.fecha || format(new Date(), 'yyyy-MM-dd')
        });
      } else {
        setFormData({
          fecha: format(new Date(), 'yyyy-MM-dd'),
          patente: '',
          nombre: '',
          detalle: '',
          monto: 0,
          comentarios: ''
        });
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.patente || !formData.fecha) {
      setError('La fecha y la patente son obligatorias');
      return;
    }

    try {
      setIsSubmitting(true);
      if (initialData && initialData.id && onUpdate) {
        await onUpdate(initialData.id, {
          ...formData,
          patente: formData.patente?.toUpperCase()
        });
      } else {
        await onAdd({
          ...formData,
          patente: formData.patente?.toUpperCase()
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-800">
            {initialData ? 'Editar Garantía / Abono' : 'Nueva Garantía / Abono'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                value={formData.fecha}
                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Patente</label>
              <input
                type="text"
                required
                placeholder="ABCD12"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all uppercase"
                value={formData.patente}
                onChange={e => setFormData({ ...formData, patente: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre Cliente</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              value={formData.nombre || ''}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Detalle</label>
            <input
              type="text"
              placeholder="Ej. Batería, Neumáticos..."
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              value={formData.detalle || ''}
              onChange={e => setFormData({ ...formData, detalle: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Monto</label>
            <input
              type="number"
              min="0"
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              value={formData.monto || ''}
              onChange={e => setFormData({ ...formData, monto: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Comentarios</label>
            <textarea
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none h-24"
              value={formData.comentarios || ''}
              onChange={e => setFormData({ ...formData, comentarios: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
