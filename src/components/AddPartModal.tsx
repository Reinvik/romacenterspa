import React, { useState } from 'react';
import { X, PackagePlus, Loader2 } from 'lucide-react';

interface AddPartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (part: any) => Promise<void>;
}

export function AddPartModal({ isOpen, onClose, onAdd }: AddPartModalProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        stock: 0,
        min_stock: 0,
        price: 0
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd(formData);
            onClose();
            setFormData({ id: '', name: '', stock: 0, min_stock: 0, price: 0 });
        } catch (error) {
            console.error('Error adding part:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                        <PackagePlus className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Nuevo Item</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">ID / Código</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: ACE-001 o M.O. CAMBIO ACEITE"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono"
                            value={formData.id}
                            onChange={e => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Nombre del Item</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Filtro de Aire o M.O. Diagnóstico"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">Tip: Use "M.O." en el nombre para categorizar como Mano de Obra.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Stock Inicial</label>
                            <input
                                required
                                type="number"
                                min="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Stock Mínimo</label>
                            <input
                                required
                                type="number"
                                min="0"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                value={formData.min_stock}
                                onChange={e => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Precio (CLP)</label>
                        <input
                            required
                            type="number"
                            min="0"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Guardando...' : 'Añadir al Inventario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
