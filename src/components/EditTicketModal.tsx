import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Mechanic, Part, ServiceItem } from '../types';
import { X, Save, User, FileText, Loader2, Trash2, PlusCircle, Camera, ImagePlus, History, Search, Package } from 'lucide-react';
import { VehicleHistoryView } from './VehicleHistoryView';
import { cn } from '../lib/utils';

interface EditTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket | null;
    mechanics: Mechanic[];
    parts: Part[];
    onUpdate: (id: string, updates: Partial<Ticket>) => Promise<void>;
    onUploadPhoto: (patente: string, file: File) => Promise<string>;
    onUpdatePart?: (id: string, updates: Partial<Part>) => Promise<void>;
    settings?: any;
}

export function EditTicketModal({ isOpen, onClose, ticket, mechanics, parts, onUpdate, onUploadPhoto, onUpdatePart, settings }: EditTicketModalProps) {
    const [notes, setNotes] = useState('');
    const [mechanicId, setMechanicId] = useState('Sin asignar');
    const [quotationTotal, setQuotationTotal] = useState<number>(0);
    const [mileage, setMileage] = useState<number>(0);
    const [jobPhotos, setJobPhotos] = useState<string[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [spareParts, setSpareParts] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Search state for spare parts
    const [partSearch, setPartSearch] = useState('');
    const [showPartDropdown, setShowPartDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Track which part_ids were already used when the ticket was opened
    const originalPartIds = useRef<string[]>([]);

    useEffect(() => {
        if (ticket) {
            setNotes(ticket.notes || '');
            setMechanicId(ticket.mechanic_id || 'Sin asignar');
            setQuotationTotal(ticket.quotation_total || 0);
            setMileage(ticket.mileage || 0);
            setJobPhotos(ticket.job_photos || []);
            const savedParts = ticket.spare_parts || [];
            const savedServices = ticket.services || [];
            setSpareParts(savedParts);
            setServices(savedServices.length > 0 ? savedServices : [{ descripcion: '', costo: 0, cantidad: 1 }]);
            originalPartIds.current = [
                ...savedParts.filter(p => p.part_id).map(p => p.part_id!),
                ...savedServices.filter(s => s.part_id).map(s => s.part_id!)
            ];
        }
    }, [ticket]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowPartDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!isOpen || !ticket) return null;

    const isFinalized = ticket?.status === 'Finalizado' || ticket?.status === 'Entregado';

    // Services
    const handleAddService = () => setServices([...services, { descripcion: '', costo: 0, cantidad: 1 }]);
    const handleRemoveService = (index: number) => setServices(services.filter((_, i) => i !== index));
    const handleServiceChange = (index: number, field: keyof ServiceItem, value: string | number) => {
        const updated = [...services];
        if (field === 'costo' || field === 'cantidad') {
            const numVal = Number(value);
            updated[index][field] = isNaN(numVal) ? 0 : numVal;
        } else if (field === 'descripcion') {
            updated[index].descripcion = value as string;
        }
        setServices(updated);
    };

    // Spare parts (manual)
    const handleAddSparePart = () => setSpareParts([...spareParts, { descripcion: '', costo: 0, cantidad: 1 }]);
    const handleRemoveSparePart = (index: number) => setSpareParts(spareParts.filter((_, i) => i !== index));
    const handleSparePartChange = (index: number, field: keyof ServiceItem, value: string | number) => {
        const updated = [...spareParts];
        if (field === 'costo' || field === 'cantidad') {
            const numVal = Number(value);
            updated[index][field] = isNaN(numVal) ? 0 : numVal;
        } else if (field === 'descripcion') {
            updated[index].descripcion = value as string;
        }
        setSpareParts(updated);
    };

    // Inventory search
    const filteredInventory = parts.filter(p => {
        const search = partSearch.toLowerCase();
        if (!search) return false;
        return (
            p.name.toLowerCase().includes(search) ||
            p.id.toLowerCase().includes(search) ||
            p.price.toString().includes(search)
        ) && !spareParts.some(sp => sp.part_id === p.id); // don't show already-added parts
    });

    const handleSelectInventoryPart = (part: Part) => {
        const isLabor = part.name.toUpperCase().includes('M.O.') || 
                        part.name.toLowerCase().includes('mano de obra');
        
        const newItem = {
            descripcion: part.name,
            costo: part.price,
            cantidad: 1,
            part_id: part.id,
        };

        if (isLabor) {
            setServices(prev => [...prev.filter(s => s.descripcion || s.costo), newItem]);
        } else {
            setSpareParts(prev => [...prev, newItem]);
        }
        setPartSearch('');
        setShowPartDropdown(false);
    };

    // Cost calculation
    const totalServicesCost = services.reduce((acc, curr) => acc + (curr.costo || 0) * (curr.cantidad ?? 1), 0);
    const totalSparePartsCost = spareParts.reduce((acc, curr) => acc + (curr.costo || 0) * (curr.cantidad ?? 1), 0);
    const totalInvestment = totalServicesCost + totalSparePartsCost;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !ticket) return;
        setUploading(true);
        try {
            const publicUrl = await onUploadPhoto(ticket.id, file);
            setJobPhotos(prev => [...prev, publicUrl]);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Error al subir la imagen. Por favor intenta de nuevo.');
        } finally {
            setUploading(false);
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
                quotation_total: totalInvestment,
                mileage,
                job_photos: jobPhotos,
                services,
                spare_parts: spareParts,
            });

            // Deduct stock for newly-added inventory parts (both in parts and services)
            if (onUpdatePart) {
                const allCurrentItems = [...spareParts, ...services];
                for (const sp of allCurrentItems) {
                    if (sp.part_id && !originalPartIds.current.includes(sp.part_id)) {
                        const isLabor = sp.descripcion.toUpperCase().includes('M.O.') || 
                                        sp.descripcion.toLowerCase().includes('mano de obra');
                        
                        if (isLabor) continue; // Skip stock deduction for labor items

                        const inventoryPart = parts.find(p => p.id === sp.part_id);
                        const qty = sp.cantidad ?? 1;
                        if (inventoryPart && inventoryPart.stock > 0) {
                            await onUpdatePart(sp.part_id, { stock: Math.max(0, inventoryPart.stock - qty) });
                        }
                    }
                }
            }

            onClose();
        } catch (error) {
            console.error('Error updating ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 font-sans overflow-hidden">
            <div className={cn(
                "bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 ease-out max-h-[96vh] w-full",
                showHistory ? "max-w-6xl" : "max-w-2xl"
            )}>

                {/* Panel Principal de Edición */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-100">
                    {/* Header */}
                    <div className="flex justify-between items-start p-6 border-b border-zinc-50 shrink-0 bg-zinc-50/30">
                        <div className="flex flex-col">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em] mb-1 px-3 py-1 rounded-full transition-all flex items-center gap-1.5 w-fit",
                                    showHistory ? "bg-purple-600 text-white shadow-lg" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                                )}
                            >
                                <History className={cn("w-3 h-3", showHistory && "animate-pulse")} />
                                {ticket.id}
                                <span className={cn("font-medium lowercase", showHistory ? "text-purple-100" : "text-zinc-400")}>
                                    • {showHistory ? 'Cerrar Hoja de Vida' : 'Ver Hoja de Vida'}
                                </span>
                            </button>
                            <h2 className="text-2xl font-black tracking-tight text-zinc-900 leading-tight">
                                Editar {ticket.model} {ticket.owner_name ? ` - ${ticket.owner_name}` : ''}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-zinc-300 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 overflow-y-auto flex-1 scrollbar-thin">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            {/* Ficha Técnica */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Estado Técnico</p>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Kilometraje Actual</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-zinc-100 focus:border-blue-500 outline-none transition-all font-black text-lg pr-12 bg-white disabled:opacity-50 group-hover:border-blue-100"
                                                value={mileage || ''}
                                                onChange={e => setMileage(Number(e.target.value))}
                                                disabled={isFinalized}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-300 group-focus-within:text-blue-500 transition-colors">KM</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Próximo Cambio</label>
                                        <div className="w-full px-5 py-3.5 rounded-2xl border-2 border-dashed border-emerald-100 bg-emerald-50/20 flex items-center justify-between">
                                            <span className="text-lg font-black text-emerald-600">
                                                {mileage > 0 ? (mileage + 10000).toLocaleString('es-CL') : '---'}
                                            </span>
                                            <div className="flex flex-col items-end leading-none">
                                                <span className="text-[9px] font-black text-emerald-500 uppercase">+10.000 KM</span>
                                                <span className="text-[7px] font-bold text-emerald-400 uppercase tracking-tighter">SUGERIDO</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Diagnóstico */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div>
                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Diagnóstico y Notas</p>
                                </div>
                                <div className="relative">
                                    <textarea
                                        rows={4}
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-zinc-100 focus:border-amber-500 outline-none transition-all resize-none text-zinc-800 text-sm disabled:bg-zinc-50 disabled:text-zinc-500 font-medium leading-relaxed bg-white"
                                        placeholder="Ingrese el diagnóstico o notas adicionales del servicio..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        disabled={isFinalized}
                                    />
                                    <FileText className="absolute right-4 bottom-4 w-4 h-4 text-zinc-200 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Desglose de Servicios */}
                        <div className="space-y-5 pt-2">
                            <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-4 rounded-full bg-emerald-500"></div>
                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Desglose de Servicios</p>
                                </div>
                                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Valores en CLP</span>
                            </div>

                            <div className="space-y-2">
                                {services.map((service, index) => (
                                    <div key={index} className="flex gap-3 items-center group/row animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Descripción del servicio"
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-100 hover:border-zinc-200 focus:border-emerald-500 outline-none transition-all text-sm bg-zinc-50/50 font-medium"
                                                value={service.descripcion}
                                                onChange={(e) => handleServiceChange(index, 'descripcion', e.target.value)}
                                                disabled={isFinalized}
                                            />
                                        </div>
                                        <div className="w-20 relative">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Cant."
                                                className="w-full px-3 py-3 rounded-xl border border-zinc-100 hover:border-zinc-200 focus:border-emerald-500 outline-none transition-all text-sm font-bold text-center bg-zinc-50/50"
                                                value={service.cantidad ?? ''}
                                                onChange={(e) => handleServiceChange(index, 'cantidad', e.target.value)}
                                                disabled={isFinalized}
                                            />
                                        </div>
                                        <div className="w-32 relative">
                                            <input
                                                type="number"
                                                placeholder="Costo"
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-100 hover:border-zinc-200 focus:border-emerald-500 outline-none transition-all text-sm font-black pl-7 bg-zinc-50/50"
                                                value={service.costo || ''}
                                                onChange={(e) => handleServiceChange(index, 'costo', e.target.value)}
                                                disabled={isFinalized}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-300">$</span>
                                        </div>
                                        {!isFinalized && (
                                            <button type="button" onClick={() => handleRemoveService(index)} className="p-2 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {!isFinalized && (
                                <button type="button" onClick={handleAddService} className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all border border-emerald-100 border-dashed">
                                    <PlusCircle className="w-4 h-4" />
                                    AGREGAR SERVICIO
                                </button>
                            )}
                        </div>

                        {/* Desglose de Repuestos - con búsqueda de inventario */}
                        <div className="space-y-5 pt-2">
                            <div className="flex items-center justify-between border-b border-zinc-50 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-4 rounded-full bg-blue-500"></div>
                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Desglose de Repuestos</p>
                                </div>
                                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Valores en CLP</span>
                            </div>

                            {/* Buscador de inventario */}
                            {!isFinalized && (
                                <div className="relative" ref={searchRef}>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar en inventario..."
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 hover:border-blue-300 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                            value={partSearch}
                                            onChange={e => { setPartSearch(e.target.value); setShowPartDropdown(true); }}
                                            onFocus={() => setShowPartDropdown(true)}
                                        />
                                    </div>

                                    {showPartDropdown && partSearch.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                            {filteredInventory.length === 0 ? (
                                                <div className="p-3 text-xs text-zinc-400 text-center italic">Sin resultados en inventario</div>
                                            ) : (
                                                filteredInventory.map(part => {
                                                    const isLabor = part.name.toUpperCase().includes('M.O.') || 
                                                                    part.name.toLowerCase().includes('mano de obra');
                                                    const isOutOfStock = part.stock === 0 && !isLabor;
                                                    return (
                                                        <button
                                                            key={part.id}
                                                            type="button"
                                                            disabled={isOutOfStock}
                                                            onClick={() => handleSelectInventoryPart(part)}
                                                            className={cn(
                                                                "w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-zinc-50 last:border-0",
                                                                isOutOfStock && "opacity-40 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                                <div>
                                                                    <span className="text-sm font-medium text-zinc-800">{part.name}</span>
                                                                    <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">ID: {part.id}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                                                <span className={cn(
                                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                                                    part.stock === 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                                                                )}>
                                                                    {part.stock === 0 ? 'Sin stock' : `${part.stock} u.`}
                                                                </span>
                                                                <span className="text-xs font-black text-zinc-600">${part.price.toLocaleString('es-CL')}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                {spareParts.length === 0 && !isFinalized && (
                                    <p className="text-[10px] text-zinc-400 italic text-center py-4 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-100">
                                        Busca en el inventario o añade un repuesto manual.
                                    </p>
                                )}
                                {spareParts.map((part, index) => (
                                    <div key={index} className="flex gap-3 items-center animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="flex-1 relative">
                                            {part.part_id && (
                                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 pointer-events-none" />
                                            )}
                                            <input
                                                type="text"
                                                placeholder="Descripción del repuesto"
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-xl border border-zinc-100 hover:border-zinc-200 focus:border-blue-500 outline-none transition-all text-sm bg-zinc-50/50 font-medium",
                                                    part.part_id && "pl-9 text-blue-700 bg-blue-50/50 border-blue-100"
                                                )}
                                                value={part.descripcion}
                                                onChange={(e) => handleSparePartChange(index, 'descripcion', e.target.value)}
                                                disabled={isFinalized || !!part.part_id}
                                            />
                                            {part.part_id && (
                                                <div className="absolute -top-1.5 -left-1 px-1.5 py-0.5 bg-blue-500 text-[8px] font-black text-white rounded-md uppercase tracking-widest shadow-sm">
                                                    Link Inventario
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-20 relative">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Cant."
                                                className="w-full px-3 py-3 rounded-xl border border-zinc-100 hover:border-zinc-200 focus:border-blue-500 outline-none transition-all text-sm font-bold text-center bg-zinc-50/50"
                                                value={part.cantidad ?? ''}
                                                onChange={(e) => handleSparePartChange(index, 'cantidad', e.target.value)}
                                                disabled={isFinalized}
                                            />
                                        </div>
                                        <div className="w-32 relative">
                                            <input
                                                type="number"
                                                placeholder="Costo"
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-100 hover:border-zinc-200 focus:border-blue-500 outline-none transition-all text-sm font-black pl-7 bg-zinc-50/50"
                                                value={part.costo || ''}
                                                onChange={(e) => handleSparePartChange(index, 'costo', e.target.value)}
                                                disabled={isFinalized}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-300">$</span>
                                        </div>
                                        {!isFinalized && (
                                            <button type="button" onClick={() => handleRemoveSparePart(index)} className="p-2 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-start gap-4 pt-2">
                                {!isFinalized && (
                                    <button type="button" onClick={handleAddSparePart} className="flex items-center gap-2 text-xs font-black text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all border border-blue-100 border-dashed">
                                        <PlusCircle className="w-4 h-4" />
                                        AGREGAR REPUESTO MANUAL
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mecánico Encargado */}
                        <div className="space-y-4 pt-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-3.5 h-3.5" />
                                Mecánico Encargado
                            </label>
                            <select
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-zinc-100 focus:border-emerald-500 outline-none transition-all bg-white text-zinc-900 font-black text-xs uppercase tracking-wider"
                                value={mechanicId}
                                onChange={e => setMechanicId(e.target.value)}
                                disabled={isFinalized}
                            >
                                <option value="Sin asignar">SIN ASIGNAR</option>
                                {mechanics.map(m => (
                                    <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Evidencia Fotográfica */}
                        <div className="space-y-5 pt-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    Evidencia del Trabajo
                                </label>
                                <span className="text-[10px] font-black text-zinc-300 tabular-nums">{jobPhotos.length}/6 FOTOS</span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {jobPhotos.map((photo, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-zinc-50 group/photo shadow-sm hover:shadow-md transition-shadow">
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
                                    <div className="aspect-square rounded-xl border-2 border-zinc-100 bg-zinc-50 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                    </div>
                                )}

                                {jobPhotos.length < 6 && !isFinalized && !uploading && (
                                    <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-emerald-600 group">
                                        <ImagePlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        <span className="text-[8px] font-black uppercase tracking-tighter">SUBIR</span>
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

                        {/* Footer Actions */}
                        <div className="pt-6 border-t border-zinc-100 sticky bottom-0 bg-white pb-6 mt-8 -mx-6 md:-mx-8 px-6 md:px-8 space-y-4 -mb-6 md:-mb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="bg-zinc-900 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-xl shadow-zinc-200 relative overflow-hidden group w-full sm:w-auto">
                                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] relative z-10">Inversión Final</span>
                                    <span className="text-xl font-black text-white relative z-10 tabular-nums">
                                        ${totalInvestment.toLocaleString('es-CL')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-3.5 text-xs font-black text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-2xl transition-all uppercase tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    {!isFinalized && (
                                        <button
                                            type="submit"
                                            disabled={loading || uploading}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3.5 text-xs font-black text-white bg-zinc-900 border border-zinc-900 hover:bg-black rounded-2xl transition-all shadow-xl shadow-zinc-200 uppercase tracking-widest disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {loading ? 'Sincronizando...' : 'Guardar'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Panel de Historia (Side Panel) */}
                <div className={cn(
                    "flex flex-col bg-zinc-50 transition-all duration-500 ease-out border-l border-zinc-100 overflow-hidden",
                    showHistory ? "w-full md:w-[450px] opacity-100" : "w-0 opacity-0"
                )}>
                    {showHistory && (
                        <div className="flex-1 flex flex-col p-6 h-full overflow-hidden animate-in slide-in-from-right-10 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                                    <History className="w-4 h-4 text-purple-600" />
                                    HOJA DE VIDA
                                </h3>
                                <button onClick={() => setShowHistory(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 min-h-0">
                                <VehicleHistoryView ticket={ticket} settings={settings} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
