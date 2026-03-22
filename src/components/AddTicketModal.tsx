import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Mechanic, TicketStatus, Customer, Ticket, GarageSettings, ServiceItem, Part } from '../types';
import { X, Search, Info, UserPlus, History, PlusCircle, Trash2, Package } from 'lucide-react';
import { CAR_BRANDS, CAR_MODELS } from '../lib/carData';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ticket: any) => Promise<void> | void;
  mechanics: Mechanic[];
  customers: Customer[];
  tickets: Ticket[];
  settings: GarageSettings | null;
  parts: Part[];
  onUpdatePart?: (id: string, updates: Partial<Part>) => Promise<void>;
}

export function AddTicketModal({ isOpen, onClose, onAdd, mechanics, customers, tickets, settings, parts, onUpdatePart }: AddTicketModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    model: '',
    status: 'Ingresado' as TicketStatus,
    mechanic_id: 'Sin asignar',
    owner_name: '',
    owner_phone: '',
    notes: '',
    mileage: 0,
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    spare_parts: [] as ServiceItem[],
  });

  const [partSearch, setPartSearch] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  const [brandSearch, setBrandSearch] = useState('');
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const systemModels = useMemo(() => {
    const models = new Set<string>();
    tickets.forEach(t => t.model && models.add(t.model));
    customers.forEach(c => c.last_model && models.add(c.last_model));
    return Array.from(models).sort();
  }, [tickets, customers]);

  // Branding Colors
  const primaryColor = settings?.theme_menu_highlight || '#10b981';
  const primaryBg = `${primaryColor}15`;

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [isCustomerFilled, setIsCustomerFilled] = useState(false);

  useEffect(() => {
    if (customerSearch.length >= 2 && !isCustomerFilled) {
      const searchLower = customerSearch.toLowerCase();
      
      const results: any[] = [];

      // 1. Procesar Clientes (aplanar por patente)
      customers.forEach(c => {
        const nameMatch = c.name?.toLowerCase().includes(searchLower);
        const phoneMatch = c.phone?.includes(customerSearch);
        const emailMatch = c.email?.toLowerCase().includes(searchLower);

        // Si el cliente coincide por nombre/teléfono/email, incluimos todos sus vehículos
        if (nameMatch || phoneMatch || emailMatch) {
          c.vehicles?.forEach(v => {
            results.push({
              ...c,
              id: v, // Usamos la patente como ID del resultado
              type: 'customer',
              matchType: nameMatch ? 'Usuario' : phoneMatch ? 'Teléfono' : 'Email'
            });
          });
        } else {
          // Si no coincide por datos de usuario, buscamos en sus patentes específicamente
          c.vehicles?.forEach(v => {
            if (v.toLowerCase().includes(searchLower)) {
              results.push({
                ...c,
                id: v,
                type: 'customer',
                matchType: 'Patente'
              });
            }
          });
        }
      });

      // 2. Procesar Tickets históricos (para vehículos no registrados formalmente como clientes)
      tickets.forEach(t => {
        if (t.id.toLowerCase().includes(searchLower) || t.owner_name?.toLowerCase().includes(searchLower)) {
          // Evitar duplicados si ya está en results por el proceso de clientes
          if (!results.some(r => r.id === t.id)) {
            results.push({
              ...t,
              type: 'ticket',
              matchType: t.id.toLowerCase().includes(searchLower) ? 'Patente Histórica' : 'Dueño Histórico'
            });
          }
        }
      });

      // De-duplicar resultados por ID (patente) para evitar errores de React keys
      const uniqueResults: any[] = [];
      const seenPlates = new Set<string>();

      results.forEach(r => {
        if (!seenPlates.has(r.id)) {
          uniqueResults.push(r);
          seenPlates.add(r.id);
        }
      });

      setFilteredCustomers(uniqueResults.slice(0, 8));
      setShowCustomerSearch(uniqueResults.length > 0);
    } else {
      setShowCustomerSearch(false);
    }
  }, [customerSearch, customers, tickets, isCustomerFilled]);

  const selectCustomer = (item: any) => {
    setFormData(prev => ({
      ...prev,
      id: item.id || prev.id,
      owner_name: (item.name || item.owner_name) || prev.owner_name,
      owner_phone: (item.phone || item.owner_phone) || prev.owner_phone,
      model: (item.last_model || item.model) || prev.model,
    }));
    setIsCustomerFilled(true);
    setCustomerSearch('');
    setShowCustomerSearch(false);
  };

  const filteredInventory = useMemo(() => {
    const search = partSearch.toLowerCase();
    if (!search) return [];
    return parts.filter(p => (
      p.name.toLowerCase().includes(search) ||
      p.id.toLowerCase().includes(search) ||
      p.price.toString().includes(search)
    ) && !formData.spare_parts.some(sp => sp.part_id === p.id));
  }, [partSearch, parts, formData.spare_parts]);

  const handleSelectInventoryPart = (part: Part) => {
    const newItem = {
      descripcion: part.name,
      costo: part.price,
      cantidad: 1,
      part_id: part.id
    };

    setFormData(prev => ({
      ...prev,
      spare_parts: [...prev.spare_parts, newItem]
    }));
    setPartSearch('');
    setShowPartDropdown(false);
  };

  const handleAddSparePart = () => {
    setFormData(prev => ({
      ...prev,
      spare_parts: [...prev.spare_parts, { descripcion: '', costo: 0, cantidad: 1 }]
    }));
  };

  const handleRemoveSparePart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      spare_parts: prev.spare_parts.filter((_, i) => i !== index)
    }));
  };

  const handleSparePartChange = (index: number, field: keyof ServiceItem, value: string | number) => {
    const newParts = [...formData.spare_parts];
    if (field === 'costo' || field === 'cantidad') {
      const numVal = Number(value);
      newParts[index][field] = isNaN(numVal) ? 0 : numVal;
    } else {
      (newParts[index] as any)[field] = value as string;
    }
    setFormData(prev => ({ ...prev, spare_parts: newParts }));
  };

  const totalEstimatedCost = formData.spare_parts.reduce((acc, curr) => acc + (curr.costo || 0) * (curr.cantidad ?? 1), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Preparar el ticket para enviar
    const ticketToSubmit = {
      ...formData,
      total_estimated_cost: totalEstimatedCost,
      spare_parts: formData.spare_parts // Asegurar que pasamos spare_parts
    };

    // Actualizar stock solo para repuestos vinculados que NO son mano de obra
    if (onUpdatePart) {
        const allItems = formData.spare_parts;
        for (const item of allItems) {
            if (item.part_id) {
                const isLabor = item.descripcion.toUpperCase().includes('SERVICIO') || 
                                item.descripcion.toUpperCase().includes('M.O.') || 
                                item.descripcion.toLowerCase().includes('mano de obra');
                
                if (isLabor) continue;

                const part = parts.find(p => p.id === item.part_id);
                const qty = item.cantidad ?? 1;
                if (part && part.stock > 0) {
                    await onUpdatePart(item.part_id, { stock: Math.max(0, part.stock - qty) });
                }
            }
        }
    }

    try {
      await onAdd(ticketToSubmit);
      onClose();
    } catch (error: any) {
      alert("Error al guardar el ticket: " + (error?.message || "Error al conectar con el servidor."));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-100 bg-zinc-50/50">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Nuevo Ingreso de Vehículo</h2>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium">Completa la ficha técnica para iniciar la recepción.</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-white transition-colors border border-transparent hover:border-zinc-200 shadow-none hover:shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-zinc-100 bg-emerald-50/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: primaryColor }} />
            <input
              type="text"
              placeholder="BUSCAR: Patente, Nombre, Teléfono, Correo, Marca o Modelo..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-emerald-100 outline-none transition-all font-bold text-lg bg-white shadow-sm focus:ring-4 placeholder:text-zinc-300"
              style={{ 
                  borderColor: customerSearch.length >= 3 ? primaryColor : undefined,
                  boxShadow: customerSearch.length >= 3 ? `0 0 0 4px ${primaryColor}15` : undefined
              }}
              value={customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value);
                setIsCustomerFilled(false);
              }}
            />
            {showCustomerSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                <div className="p-3 border-b border-zinc-50 bg-zinc-50/50">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Coincidencias Encontradas</span>
                </div>
                {filteredCustomers.map((c: any) => (
                  <button
                    key={`${c.id}-${c.type}`}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="w-full px-5 py-4 text-left transition-colors flex items-center justify-between border-b border-zinc-50 last:border-0 hover:bg-emerald-50/50 group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-extrabold text-zinc-900 text-base truncate">{(c.name || c.owner_name)}</div>
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-zinc-100 text-zinc-400 rounded-md uppercase tracking-widest leading-none">
                          {c.matchType}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-emerald-600 font-mono flex items-center gap-2">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{c.id}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-zinc-400 font-sans">{(c.phone || c.owner_phone)}</span>
                      </div>
                    </div>
                    {(c.last_model || c.model) && (
                      <div className="flex items-center gap-2 text-[10px] bg-zinc-100 px-3 py-1.5 rounded-full font-black text-zinc-600 shadow-sm border border-zinc-200 shrink-0 group-hover:bg-white transition-colors">
                        <History className="w-3.5 h-3.5 text-zinc-400" /> {(c.last_model || c.model).toUpperCase()}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Sección 1: Datos Básicos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Información Principal</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Patente (ID)</label>
                <input
                  required
                  type="text"
                  placeholder="ABCD12"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-black text-zinc-800 tracking-widest uppercase bg-zinc-50/30 focus:ring-4"
                  style={{ 
                    borderColor: formData.id ? primaryColor : undefined,
                    boxShadow: formData.id ? `0 0 0 4px ${primaryColor}15` : undefined
                  }}
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Marca y Modelo</label>
                <input
                  required
                  type="text"
                  placeholder="Toyota Hilux 2024"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-bold text-zinc-800 bg-zinc-50/30 focus:ring-4"
                  style={{ 
                    borderColor: formData.model ? primaryColor : undefined,
                    boxShadow: formData.model ? `0 0 0 4px ${primaryColor}15` : undefined
                  }}
                  value={formData.model}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, model: val });
                    setShowSuggestions(val.length > 0);
                  }}
                  onFocus={() => setShowSuggestions(formData.model.length > 0)}
                />
                
                {showSuggestions && (modelSuggestions.length > 0 || systemModels.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {brandSearch && (
                      <div className="px-3 py-1.5 bg-zinc-50 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                        Modelos de {brandSearch}
                      </div>
                    )}
                    {modelSuggestions.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, model: `${brandSearch} ${m}` });
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-zinc-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sección 2: Ficha Técnica */}
          <div className="space-y-4 pt-4 border-t border-zinc-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Especificaciones Técnicas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Kilometraje (KM)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-bold text-zinc-800 pr-12 bg-zinc-50/30 focus:ring-4"
                    style={{ 
                      borderColor: formData.mileage ? primaryColor : undefined,
                      boxShadow: formData.mileage ? `0 0 0 4px ${primaryColor}15` : undefined
                    }}
                    value={formData.mileage || ''}
                    onChange={e => setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">KM</span>
                </div>
              </div>
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nombre del Cliente</label>
                <input
                  required
                  type="text"
                  placeholder="Nombre completo"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-bold bg-zinc-50/30 focus:ring-4"
                  style={{ 
                    borderColor: formData.owner_name ? primaryColor : undefined,
                    boxShadow: formData.owner_name ? `0 0 0 4px ${primaryColor}15` : undefined
                  }}
                  value={formData.owner_name}
                  onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Teléfono WhatsApp</label>
                  <input
                    required
                    type="text"
                    placeholder="+56 9 ..."
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-bold bg-zinc-50/30 focus:ring-4"
                    style={{ 
                      borderColor: formData.owner_phone ? primaryColor : undefined,
                      boxShadow: formData.owner_phone ? `0 0 0 4px ${primaryColor}15` : undefined
                    }}
                    value={formData.owner_phone}
                    onChange={e => setFormData({ ...formData, owner_phone: e.target.value })}
                  />
                </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Mecánico Asignado</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all bg-white font-bold text-zinc-700 focus:ring-4"
                style={{ 
                    borderColor: formData.mechanic_id !== 'Sin asignar' ? primaryColor : undefined,
                    boxShadow: formData.mechanic_id !== 'Sin asignar' ? `0 0 0 4px ${primaryColor}15` : undefined
                }}
                value={formData.mechanic_id}
                onChange={e => setFormData({ ...formData, mechanic_id: e.target.value })}
              >
                <option value="Sin asignar">Sin asignar por ahora</option>
                {mechanics.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
              <h3 className="text-base font-black text-zinc-900 uppercase tracking-widest">Observaciones de Ingreso</h3>
            </div>
            <textarea
              rows={10}
              placeholder="Notas adicionales o motivo de ingreso..."
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none font-medium text-sm"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>


          {/* Lista Dinámica de Repuestos */}
          <div className="space-y-4 pt-4 border-t border-zinc-50">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Desglose de Servicios</h3>
              </div>
            </div>

            {/* Buscador de inventario */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, ID o precio..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 hover:border-blue-300 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                  value={partSearch}
                  onChange={e => { setPartSearch(e.target.value); setShowPartDropdown(true); }}
                  onFocus={() => setShowPartDropdown(true)}
                />
              </div>

              {showPartDropdown && filteredInventory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {filteredInventory.map(part => {
                    const isLabor = part.name.toUpperCase().includes('SERVICIO') || 
                                    part.name.toUpperCase().includes('M.O.') || 
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
                  })}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {formData.spare_parts.length === 0 && (
                <p className="text-[10px] text-zinc-400 italic text-center py-2 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-100">
                  Busca en el inventario o añade un servicio extra.
                </p>
              )}
              {formData.spare_parts.map((part, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6 relative">
                    <input
                      type="text"
                      placeholder="Descripción"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                      value={part.descripcion}
                      onChange={(e) => handleSparePartChange(index, 'descripcion', e.target.value)}
                    />
                    {part.part_id && (
                        <div className="absolute -top-1.5 -left-1 px-1.5 py-0.5 bg-blue-500 text-[8px] font-black text-white rounded-md uppercase tracking-widest shadow-sm">
                            Link Inventario
                        </div>
                    )}
                  </div>
                  <div className="col-span-2 relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      className="w-full px-2 py-2 rounded-lg border border-zinc-200 focus:border-blue-400 outline-none transition-all text-sm font-bold text-center bg-white"
                      value={part.cantidad ?? ''}
                      onChange={(e) => handleSparePartChange(index, 'cantidad', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 relative">
                    <input
                      type="number"
                      placeholder="Costo"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-blue-500 outline-none transition-all text-sm font-bold pl-5 bg-white"
                      value={part.costo || ''}
                      onChange={(e) => handleSparePartChange(index, 'costo', e.target.value)}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">$</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveSparePart(index)}
                      className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddSparePart}
              className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors py-1"
            >
              <PlusCircle className="w-4 h-4" />
              Agregar servicio extra
            </button>

            <div className="pt-2 flex justify-end">
              <div className="bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 flex items-center gap-3">
                <span className="text-[10px] font-black text-zinc-400 uppercase">Total Estimado</span>
                <span className="text-sm font-black text-emerald-600">
                  ${totalEstimatedCost.toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-sm font-black text-white rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
              style={{ 
                  backgroundColor: primaryColor,
              }}
            >
              Registrar Vehículo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
