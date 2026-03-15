import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface AddMechanicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string) => Promise<void>;
}

export function AddMechanicModal({ isOpen, onClose, onAdd }: AddMechanicModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onAdd(name.trim());
            onClose();
            setName('');
        } catch (error) {
            console.error('Error adding mechanic:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Nuevo Mecánico</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Nombre Completo</label>
                        <input
                            required
                            autoFocus
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            value={name}
                            onChange={e => setName(e.target.value)}
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
                            disabled={loading || !name.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Guardando...' : 'Registrar Mecánico'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
