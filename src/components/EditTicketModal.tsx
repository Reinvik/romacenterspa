import React, { useState, useEffect } from 'react';
import { Ticket, Mechanic, Part } from '../types';
import { X, Save, User, FileText, Loader2, Package, Trash2, Plus, CheckCircle2, Camera, Image as ImageIcon, ImagePlus } from 'lucide-react';

interface EditTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket | null;
    mechanics: Mechanic[];
    parts: Part[];
    onUpdate: (id: string, updates: Partial<Ticket>) => Promise<void>;
}

export function EditTicketModal({ isOpen, onClose, ticket, mechanics, parts, onUpdate }: EditTicketModalProps) {
    const [notes, setNotes] = useState('');
    const [mechanicId, setMechanicId] = useState('Sin asignar');
    const [selectedParts, setSelectedParts] = useState<string[]>([]);
    const [quotationTotal, setQuotationTotal] = useState<number>(0);
    const [vin, setVin] = useState('');
    const [engineId, setEngineId] = useState('');
    const [mileage, setMileage] = useState<number>(0);
    const [jobPhotos, setJobPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (ticket) {
            setNotes(ticket.notes || '');
            setMechanicId(ticket.mechanic_id || 'Sin asignar');
            setSelectedParts(ticket.parts_needed || []);
            setQuotationTotal(ticket.quotation_total || 0);
            setVin(ticket.vin || '');
            setEngineId(ticket.engine_id || '');
            setMileage(ticket.mileage || 0);
            setJobPhotos(ticket.job_photos || []);
        }
    }, [ticket]);

    if (!isOpen || !ticket) return null;

    const handleAddPart = (partName: string) => {
        if (partName && !selectedParts.includes(partName)) {
            setSelectedParts([...selectedParts, partName]);
        }
    };

    const handleRemovePart = (partName: string) => {
        setSelectedParts(selectedParts.filter(p => p !== partName));
    };

    const isFinalized = ticket?.status === 'Finalizado' || ticket?.status === 'Entregado';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFinalized) return;
        setLoading(true);
        try {
            await onUpdate(ticket!.id, {
                notes,
                mechanic_id: mechanicId === 'Sin asignar' ? null : mechanicId,
                parts_needed: selectedParts,
                quotation_total: quotationTotal,
                vin,
                engine_id: engineId,
                mileage,
                job_photos: jobPhotos
            });
            onClose();
        } catch (error) {
            console.error('Error updating ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-zinc-100">
                    <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-zinc-500 mb-0.5">{ticket.id}</span>
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                            Editar {ticket.model}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Ficha Técnica */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-50 pb-1">Ficha Técnica</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">N° Chasis</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-emerald-500 outline-none transition-all font-mono text-xs uppercase bg-zinc-50/50 disabled:opacity-50"
                                    value={vin}
                                    onChange={e => setVin(e.target.value.toUpperCase())}
                                    disabled={isFinalized}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">N° Motor</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-emerald-500 outline-none transition-all font-mono text-xs uppercase bg-zinc-50/50 disabled:opacity-50"
                                    value={engineId}
                                    onChange={e => setEngineId(e.target.value.toUpperCase())}
                                    disabled={isFinalized}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Kilometraje Actual</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-emerald-500 outline-none transition-all font-bold text-xs pr-10 bg-zinc-50/50 disabled:opacity-50"
                                    value={mileage}
                                    onChange={e => setMileage(Number(e.target.value))}
                                    disabled={isFinalized}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-400">KM</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-400" />
                            Diagnóstico / Notas
                        </label>
                        <textarea
                            required
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none text-zinc-800 text-sm disabled:bg-zinc-100 disabled:text-zinc-500"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            disabled={isFinalized}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Package className="w-4 h-4 text-zinc-400" />
                            Repuestos Utilizados
                        </label>
                        <div className="flex gap-2 mb-2">
                            <select
                                className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm outline-none focus:border-emerald-500 transition-all font-sans disabled:opacity-50"
                                onChange={(e) => {
                                    if (e.target.value) handleAddPart(e.target.value);
                                    e.target.value = "";
                                }}
                                disabled={isFinalized}
                            >
                                <option value="">Seleccionar repuesto...</option>
                                {parts.map(p => (
                                    <option key={p.id} value={p.name} disabled={selectedParts.includes(p.name)}>
                                        {p.name} ({p.stock} disponibles)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-zinc-50 rounded-xl border border-zinc-100 italic text-zinc-500 text-[11px] font-sans">
                            {selectedParts.length === 0 ? "No se han registrado repuestos." : (
                                selectedParts.map(p => (
                                    <span key={p} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-lg shadow-sm group/part italic-none not-italic">
                                        <span className="not-italic">{p}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePart(p)}
                                            className="text-zinc-300 hover:text-red-500 transition-colors disabled:hidden"
                                            disabled={isFinalized}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-400" />
                            Mecánico Asignado
                        </label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all bg-white text-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-500"
                            value={mechanicId}
                            onChange={e => setMechanicId(e.target.value)}
                            disabled={isFinalized}
                        >
                            <option value="Sin asignar">Sin asignar</option>
                            {mechanics.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Evidencia Fotográfica */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-zinc-400" />
                                Fotos del Trabajo
                            </div>
                            <span className="text-[10px] text-zinc-400 font-normal">{jobPhotos.length}/6 fotos</span>
                        </label>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {jobPhotos.map((photo, index) => (
                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group/photo">
                                    <img src={photo} alt={`Trabajo ${index + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setJobPhotos(prev => prev.filter((_, i) => i !== index))}
                                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity"
                                        disabled={isFinalized}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            
                            {jobPhotos.length < 6 && !isFinalized && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-emerald-600">
                                    <ImagePlus className="w-6 h-6" />
                                    <span className="text-[10px] font-bold">Añadir</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setJobPhotos(prev => [...prev, reader.result as string]);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
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
