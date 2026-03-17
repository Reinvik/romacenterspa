import React, { useState, useEffect } from 'react';
import { Ticket, Mechanic, Part, ServiceItem } from '../types';
import { X, Save, User, FileText, Loader2, Package, Trash2, Plus, CheckCircle2, Camera, Image as ImageIcon, ImagePlus, PlusCircle } from 'lucide-react';

interface EditTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket | null;
    mechanics: Mechanic[];
    parts: Part[];
    onUpdate: (id: string, updates: Partial<Ticket>) => Promise<void>;
    onUploadPhoto: (patente: string, file: File) => Promise<string>;
}

export function EditTicketModal({ isOpen, onClose, ticket, mechanics, parts, onUpdate, onUploadPhoto }: EditTicketModalProps) {
    const [notes, setNotes] = useState('');
    const [mechanicId, setMechanicId] = useState('Sin asignar');
    const [selectedParts, setSelectedParts] = useState<string[]>([]);
    const [quotationTotal, setQuotationTotal] = useState<number>(0);
    const [mileage, setMileage] = useState<number>(0);
    const [jobPhotos, setJobPhotos] = useState<string[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    useEffect(() => {
        if (ticket) {
            setNotes(ticket.notes || '');
            setMechanicId(ticket.mechanic_id || 'Sin asignar');
            setSelectedParts(ticket.parts_needed || []);
            setQuotationTotal(ticket.quotation_total || 0);
            setMileage(ticket.mileage || 0);
            setJobPhotos(ticket.job_photos || []);
            setServices(ticket.services || [{ descripcion: '', costo: 0 }]);
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

    const handleAddService = () => {
        setServices([...services, { descripcion: '', costo: 0 }]);
    };

    const handleRemoveService = (index: number) => {
        setServices(services.filter((_, i) => i !== index));
    };

    const handleServiceChange = (index: number, field: keyof ServiceItem, value: string | number) => {
        const newServices = [...services];
        if (field === 'costo') {
            newServices[index][field] = Number(value);
        } else if (field === 'descripcion') {
            newServices[index][field] = value as string;
        }
        setServices(newServices);
    };

    const totalServicesCost = services.reduce((acc, curr) => acc + (curr.costo || 0), 0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !ticket) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const publicUrl = await onUploadPhoto(ticket.id, file);
            setJobPhotos(prev => [...prev, publicUrl]);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Error al subir la imagen. Por favor intenta de nuevo.');
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFinalized) return;
        setLoading(true);
        try {
            await onUpdate(ticket!.id, {
                notes,
                mechanic_id: mechanicId === 'Sin asignar' ? null : mechanicId,
                parts_needed: selectedParts,
                quotation_total: totalServicesCost > 0 ? totalServicesCost : quotationTotal,
                mileage,
                job_photos: jobPhotos,
                services: services
            });
            onClose();
        } catch (error) {
            console.error('Error updating ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
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

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Ficha Técnica */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-5 rounded-full bg-blue-500"></div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ficha Técnica</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Kilometraje Actual</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 outline-none transition-all font-bold text-sm pr-10 bg-zinc-50/50 disabled:opacity-50 focus:ring-4 focus:ring-emerald-500/10"
                                            value={mileage}
                                            onChange={e => setMileage(Number(e.target.value))}
                                            disabled={isFinalized}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-400">KM</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Próximo Cambio Sugerido</label>
                                    <div className="w-full px-3 py-2.5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 flex items-center justify-between">
                                        <span className="text-sm font-black text-emerald-700">
                                            {mileage > 0 ? (mileage + 10000).toLocaleString('es-CL') : '---'}
                                        </span>
                                        <span className="text-[9px] font-black text-emerald-500 uppercase">+10.000 KM</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Diagnóstico / Notas */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-5 rounded-full bg-amber-500"></div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Diagnóstico / Notas</p>
                            </div>
                            <textarea
                                rows={2}
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none text-zinc-800 text-sm disabled:bg-zinc-100 disabled:text-zinc-500 font-medium"
                                placeholder="Notas adicionales..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                disabled={isFinalized}
                            />
                        </div>
                    </div>

                    {/* Lista Dinámica de Servicios */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-50 pb-1">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Servicios y Costos</p>
                        </div>
                        
                        <div className="space-y-3">
                            {services.map((service, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-7">
                                        <input
                                            type="text"
                                            placeholder="Descripción del servicio"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-emerald-500 outline-none transition-all text-xs bg-white disabled:opacity-50"
                                            value={service.descripcion}
                                            onChange={(e) => handleServiceChange(index, 'descripcion', e.target.value)}
                                            disabled={isFinalized}
                                        />
                                    </div>
                                    <div className="col-span-4 relative">
                                        <input
                                            type="number"
                                            placeholder="Costo"
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-emerald-500 outline-none transition-all text-xs font-bold pl-5 bg-white disabled:opacity-50"
                                            value={service.costo || ''}
                                            onChange={(e) => handleServiceChange(index, 'costo', e.target.value)}
                                            disabled={isFinalized}
                                        />
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">$</span>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveService(index)}
                                            className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors disabled:opacity-20"
                                            disabled={isFinalized}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isFinalized && (
                            <button
                                type="button"
                                onClick={handleAddService}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors py-1"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Agregar otro servicio
                            </button>
                        )}

                        <div className="pt-2 flex justify-end">
                            <div className="bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 flex items-center gap-3">
                                <span className="text-[10px] font-black text-zinc-400 uppercase">Total Servicios</span>
                                <span className="text-sm font-black text-emerald-600">
                                    ${totalServicesCost.toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>
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
                            
                            {uploading && (
                                <div className="aspect-square rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                </div>
                            )}

                            {jobPhotos.length < 6 && !isFinalized && !uploading && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-emerald-600">
                                    <ImagePlus className="w-6 h-6" />
                                    <span className="text-[10px] font-bold">Añadir</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        className="hidden" 
                                        onChange={handleFileChange}
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
                            disabled={loading || uploading}
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
