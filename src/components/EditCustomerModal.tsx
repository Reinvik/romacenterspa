import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { X, Save, User, Phone, Mail, Loader2 } from 'lucide-react';

interface EditVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: { id: string; ownerName: string; ownerPhone: string; model: string; lastMileage: number | null } | null;
    onUpdate: (patente: string, updates: { ownerName?: string; ownerPhone?: string; model?: string }) => Promise<void>;
    suggestedModels?: string[];
}

export function EditVehicleModal({ isOpen, onClose, vehicle, onUpdate, suggestedModels = [] }: EditVehicleModalProps) {
    const [formData, setFormData] = useState({
        ownerName: '',
        ownerPhone: '',
        model: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (vehicle) {
            setFormData({
                ownerName: vehicle.ownerName,
                ownerPhone: vehicle.ownerPhone,
                model: vehicle.model
            });
        }
    }, [vehicle]);

    if (!isOpen || !vehicle) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate(vehicle.id, formData);
            onClose();
        } catch (error) {
            console.error('Error updating vehicle:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                        Editar Datos del Vehículo ({vehicle.id})
                    </h2>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-400" />
                            Nombre Propietario
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800"
                            value={formData.ownerName}
                            onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-zinc-400" />
                            Teléfono (WhatsApp o contacto)
                        </label>
                        <input
                            required
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-mono"
                            value={formData.ownerPhone}
                            onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                        />
                    </div>


                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            Marca y Modelo del Vehículo
                        </label>
                        <input
                            type="text"
                            list="edit-customer-vehicle-models"
                            placeholder="Ej: Toyota Hilux"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-zinc-800 font-bold"
                            value={formData.model}
                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                        />
                        <datalist id="edit-customer-vehicle-models">
                            {suggestedModels.map(m => (
                                <option key={m} value={m} />
                            ))}
                        </datalist>
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
