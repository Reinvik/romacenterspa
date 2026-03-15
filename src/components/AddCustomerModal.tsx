import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (customer: any) => Promise<void>;
    suggestedModels?: string[];
}

export function AddCustomerModal({ isOpen, onClose, onAdd, suggestedModels = [] }: AddCustomerModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        vehicles: [] as string[],
        last_mileage: 0,
        last_vin: '',
        last_model: '',
        last_engine_id: ''
    });
    const [patenteInput, setPatenteInput] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAddVehicle = () => {
        if (patenteInput.trim() && !formData.vehicles.includes(patenteInput.trim().toUpperCase())) {
            setFormData({
                ...formData,
                vehicles: [...formData.vehicles, patenteInput.trim().toUpperCase()]
            });
            setPatenteInput('');
        }
    };

    const removeVehicle = (v: string) => {
        setFormData({
            ...formData,
            vehicles: formData.vehicles.filter(veh => veh !== v)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd({
                ...formData,
                last_visit: new Date().toISOString()
            });
            onClose();
            setFormData({ name: '', phone: '', email: '', vehicles: [] });
        } catch (error) {
            console.error('Error adding customer:', error);
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
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Nuevo Cliente</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Nombre Completo</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: María José"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Teléfono</label>
                            <input
                                required
                                type="tel"
                                placeholder="+56 9..."
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Email (Opcional)</label>
                            <input
                                type="email"
                                placeholder="opcional@email.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Vehículos (Patentes)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ej: AB·CD·12"
                                className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:border-emerald-500 transition-all font-mono uppercase"
                                value={patenteInput}
                                onChange={e => setPatenteInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddVehicle())}
                            />
                            <button
                                type="button"
                                onClick={handleAddVehicle}
                                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold transition-colors"
                            >
                                Añadir
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {formData.vehicles.map(v => (
                                <span key={v} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-mono font-bold group">
                                    {v}
                                    <button type="button" onClick={() => removeVehicle(v)} className="text-zinc-400 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Marca y Modelo (Historial)</label>
                        <input
                            type="text"
                            list="customer-vehicle-models"
                            placeholder="Ej: Toyota Hilux"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold"
                            value={formData.last_model}
                            onChange={e => setFormData({ ...formData, last_model: e.target.value })}
                        />
                        <datalist id="customer-vehicle-models">
                            {suggestedModels.map(m => (
                                <option key={m} value={m} />
                            ))}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">N° Motor</label>
                            <input
                                type="text"
                                placeholder="ID Motor"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono uppercase"
                                value={formData.last_engine_id}
                                onChange={e => setFormData({ ...formData, last_engine_id: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Chasis (VIN)</label>
                            <input
                                type="text"
                                placeholder="ID Vehículo"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono uppercase"
                                value={formData.last_vin}
                                onChange={e => setFormData({ ...formData, last_vin: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Último Kilometraje (KM)</label>
                        <input
                            type="number"
                            placeholder="0"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            value={formData.last_mileage || ''}
                            onChange={e => setFormData({ ...formData, last_mileage: parseInt(e.target.value) || 0 })}
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
                            {loading ? 'Guardando...' : 'Registrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
