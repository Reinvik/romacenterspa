import React, { useState, useEffect } from 'react';
import { Part } from '../types';
import { X, Save, Package, Hash, DollarSign, Activity, Loader2, Plus, Minus } from 'lucide-react';

interface EditPartModalProps {
    isOpen: boolean;
    onClose: () => void;
    part: Part | null;
    onUpdate: (id: string, updates: Partial<Part>) => Promise<void>;
}

export function EditPartModal({ isOpen, onClose, part, onUpdate }: EditPartModalProps) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        stock: 0,
        min_stock: 0,
        price: 0,
        location: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (part) {
            setFormData({
                id: part.id,
                name: part.name,
                stock: part.stock,
                min_stock: part.min_stock,
                price: part.price,
                location: part.location || ''
            });
        }
    }, [part]);

    if (!isOpen || !part) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate(part.id, formData);
            onClose();
        } catch (error) {
            console.error('Error updating part:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                        Editar Repuesto
                    </h2>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-zinc-400" />
                            ID / Código
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: ACE-001"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-sans font-mono"
                            value={formData.id}
                            onChange={e => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Package className="w-4 h-4 text-zinc-400" />
                            Nombre del Item
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Filtro de Aceite"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-sans"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                                <Hash className="w-4 h-4 text-zinc-400" />
                                Stock Actual
                            </label>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, stock: Math.max(0, prev.stock - 1) }))}
                                    className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors border border-zinc-200"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-2 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-sans text-center"
                                    value={formData.stock}
                                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, stock: prev.stock + 1 }))}
                                    className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors border border-zinc-200"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-zinc-400" />
                                Stock Mínimo
                            </label>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, min_stock: Math.max(0, prev.min_stock - 1) }))}
                                    className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors border border-zinc-200"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-2 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-sans text-center"
                                    value={formData.min_stock}
                                    onChange={e => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, min_stock: prev.min_stock + 1 }))}
                                    className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors border border-zinc-200"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-zinc-400" />
                            Precio Unitario
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, price: Math.max(0, prev.price - 1000) }))}
                                className="flex items-center gap-1 px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors border border-zinc-200 font-bold text-xs"
                            >
                                <Minus className="w-3 h-3" /> $1k
                            </button>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-sans font-bold text-center"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                            />
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, price: prev.price + 1000 }))}
                                className="flex items-center gap-1 px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors border border-zinc-200 font-bold text-xs"
                            >
                                <Plus className="w-3 h-3" /> $1k
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-zinc-400" />
                            Ubicación (Pasillo/Posición/Nivel)
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: 010203"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-sans"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value.toUpperCase() })}
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
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
