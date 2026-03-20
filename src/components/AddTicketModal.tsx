import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Mechanic, TicketStatus, Customer, Ticket, GarageSettings, ServiceItem, Part } from '../types';
import { X, Search, Info, UserPlus, History, PlusCircle, Trash2, Package } from 'lucide-react';
import { CAR_BRANDS, CAR_MODELS } from '../lib/carData';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ticket: any) => void;
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
    services: [{ descripcion: '', costo: 0 }] as ServiceItem[],
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
      
      // Combinar clientes y tickets únicos por patente para búsqueda histórica
      const combinedResults = [
        ...customers.map(c => ({ ...c, type: 'customer' as const })),
        ...tickets.map(t => ({ ...t, type: 'ticket' as const }))
      ].filter(item => {
        const isCustomer = 'type' in item && item.type === 'customer';
        const name = isCustomer ? (item as any).name : (item as any).owner_name;
        const phone = isCustomer ? (item as any).phone : (item as any).owner_phone;
        const plate = isCustomer ? (item as any).vehicles?.join(' ') : (item as any).id;
        const model = isCustomer ? (item as any).last_model : (item as any).model;
        const email = isCustomer ? (item as any).email : '';
        
        return (
          name?.toLowerCase().includes(searchLower) ||
          phone?.includes(customerSearch) ||
          plate?.toLowerCase().includes(searchLower) ||
          model?.toLowerCase().includes(searchLower) ||
          email?.toLowerCase().includes(searchLower)
        );
      });

      // De-duplicar resultados (priorizar clientes sobre tickets si coinciden datos clave)
      const uniqueResults = Array.from(new Map(combinedResults.map(item => {
          const key = 'phone' in item ? item.phone : item.owner_phone;
          return [key, item];
      })).values());

      setFilteredCustomers(uniqueResults as any);
      setShowCustomerSearch(uniqueResults.length > 0);
    } else {
      setShowCustomerSearch(false);
    }
  }, [customerSearch, customers, tickets, isCustomerFilled]);

  const selectCustomer = (customer: Customer | Ticket) => {
    setFormData(prev => ({
      ...prev,
      id: ('vehicles' in customer ? customer.vehicles?.[0] : customer.id) || prev.id,
      owner_name: 'name' in customer ? customer.name : customer.owner_name,
      owner_phone: 'phone' in customer ? customer.phone : customer.owner_phone,
      mileage: ('last_mileage' in customer ? customer.last_mileage : (customer as Ticket).mileage) || prev.mileage,
      model: ('last_model' in customer ? customer.last_model : (customer as Ticket).model) || prev.model
    }));
    setCustomerSearch('phone' in customer ? customer.phone : (customer as Ticket).owner_phone);
    setIsCustomerFilled(true);
    setShowCustomerSearch(false);
  };

  useEffect(() => {
    if (formData.model.length > 1) {
      const match = CAR_BRANDS.find(b => formData.model.toLowerCase().includes(b.toLowerCase()));
      if (match) {
        setBrandSearch(match);
        setModelSuggestions(CAR_MODELS[match] || []);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [formData.model]);

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
    setFormData(prev => ({
      ...prev,
      spare_parts: [...prev.spare_parts, {
        descripcion: part.name,
        costo: part.price,
        part_id: part.id
      }]
    }));
    setPartSearch('');
    setShowPartDropdown(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);

    // Deduct stock for inventory parts
    if (onUpdatePart && formData.spare_parts.length > 0) {
      for (const sp of formData.spare_parts) {
        if (sp.part_id) {
          const inventoryPart = parts.find(p => p.id === sp.part_id);
          if (inventoryPart && inventoryPart.stock > 0) {
            await onUpdatePart(sp.part_id, { stock: inventoryPart.stock - 1 });
          }
        }
      }
    }

    onClose();
    setFormData({
      id: '',
      model: '',
      status: 'Ingresado',
      mechanic_id: 'Sin asignar',
      owner_name: '',
      owner_phone: '',
      notes: '',
      mileage: 0,
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      services: [{ descripcion: '', costo: 0 }],
      spare_parts: [],
    });
  };

  const handleAddService = () => {
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, { descripcion: '', costo: 0 }]
    }));
  };

  const handleRemoveService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const handleServiceChange = (index: number, field: keyof ServiceItem, value: string | number) => {
    const newServices = [...formData.services];
    if (field === 'costo') {
      newServices[index][field] = Number(value);
    } else {
      newServices[index][field] = value as string;
    }
    setFormData(prev => ({ ...prev, services: newServices }));
  };

  const handleAddSparePart = () => {
    setFormData(prev => ({
      ...prev,
      spare_parts: [...prev.spare_parts, { descripcion: '', costo: 0 }]
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
    if (field === 'costo') {
      newParts[index][field] = Number(value);
    } else {
      newParts[index][field] = value as string;
    }
    setFormData(prev => ({ ...prev, spare_parts: newParts }));
  };

  const totalServicesCost = formData.services.reduce((acc, curr) => acc + (curr.costo || 0), 0);
  const totalSparePartsCost = formData.spare_parts.reduce((acc, curr) => acc + (curr.costo || 0), 0);
  const totalEstimatedCost = totalServicesCost + totalSparePartsCost;

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
                setFormData(prev => ({ ...prev, owner_phone: e.target.value }));
              }}
            />
            {showCustomerSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                <div className="p-3 border-b border-zinc-50 bg-zinc-50/50">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Coincidencias Encontradas</span>
                </div>
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="w-full px-5 py-4 text-left transition-colors flex items-center justify-between border-b border-zinc-50 last:border-0 hover:bg-emerald-50/50"
                  >
                    <div>
                      <div className="font-extrabold text-zinc-900 text-base">{('name' in c ? c.name : c.owner_name)}</div>
                      <div className="text-sm font-bold text-emerald-600 font-mono">{('phone' in c ? c.phone : c.owner_phone)} • {('vehicles' in c ? c.vehicles?.join(', ') : c.id)}</div>
                    </div>
                    {('last_model' in c ? c.last_model : (c as Ticket).model) && (
                      <div className="flex items-center gap-2 text-xs bg-zinc-100 px-3 py-1 rounded-full font-black text-zinc-500">
                        <History className="w-3.5 h-3.5" /> {('last_model' in c ? c.last_model : (c as Ticket).model)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-8">
          {/* Sección 1: Datos del Vehículo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
              <h3 className="text-base font-black text-zinc-900 uppercase tracking-widest">Ficha Técnica del Vehículo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha de Ingreso</label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-bold text-zinc-800 focus:ring-4"
                  style={{ 
                    borderColor: primaryColor,
                    boxShadow: `0 0 0 4px ${primaryColor}15`
                  }}
                  value={formData.entry_date}
                  onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Patente / ID</label>
                <input
                  required
                  type="text"
                  placeholder="AB·CD·12"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-mono font-black uppercase text-lg bg-zinc-50/30 focus:ring-4"
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
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 transition-colors" style={{ color: formData.model ? primaryColor : undefined }} />
                  <input
                    required
                    list="car-suggestions"
                    type="text"
                    placeholder="Eje: Toyota Yaris"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-bold text-zinc-800 focus:ring-4"
                    style={{ 
                      borderColor: formData.model ? primaryColor : undefined,
                      boxShadow: formData.model ? `0 0 0 4px ${primaryColor}15` : undefined
                    }}
                    value={formData.model}
                    onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, model: val });
                        
                        // Si el usuario borra todo, reseteamos marca
                        if (!val) {
                            setBrandSearch('');
                            return;
                        }

                        // Intentar detectar marca si aún no hay una fija
                        const match = CAR_BRANDS.find(b => val.toLowerCase().startsWith(b.toLowerCase()));
                        if (match) {
                            setBrandSearch(match);
                        }
                    }}
                  />
                  <datalist id="car-suggestions">
                    {/* 1. Si no hay marca detectada, mostrar marcas principales */}
                    {!brandSearch && CAR_BRANDS.map(brand => (
                      <option key={brand} value={brand} />
                    ))}
                    
                    {/* 2. Si hay marca detectada, mostrar sus modelos */}
                    {brandSearch && CAR_MODELS[brandSearch]?.map(model => (
                      <option key={model} value={`${brandSearch} ${model}`} />
                    ))}
                    
                    {/* 3. Sugerencias históricas del sistema */}
                    {systemModels.slice(0, 5).map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
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
                    type="tel"
                    placeholder="+56 9..."
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
              rows={2}
              placeholder="Notas adicionales o motivo de ingreso..."
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none font-medium text-sm"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Lista Dinámica de Servicios */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Servicios y Costos Iniciales</h3>
              </div>
              <div className="flex gap-2">
                {[
                  { label: "Cambio Aceite + Filtro", desc: "Cambio de Aceite + Filtro de Aceite", price: 0 },
                  { label: "Lubricación General", desc: "Lubricación de chasis y puntos", price: 0 }
                ].map((action, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const newService = { descripcion: action.desc, costo: action.price };
                      if (formData.services.length === 1 && !formData.services[0].descripcion) {
                        setFormData({ ...formData, services: [newService] });
                      } else {
                        setFormData({ ...formData, services: [...formData.services, newService] });
                      }
                    }}
                    className="text-[9px] font-black uppercase px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all"
                  >
                    + {action.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              {formData.services.map((service, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <input
                      type="text"
                      placeholder="Descripción del servicio"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-emerald-500 outline-none transition-all text-sm bg-white"
                      value={service.descripcion}
                      onChange={(e) => handleServiceChange(index, 'descripcion', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 relative">
                    <input
                      type="number"
                      placeholder="Costo"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-emerald-500 outline-none transition-all text-sm font-bold pl-5 bg-white"
                      value={service.costo || ''}
                      onChange={(e) => handleServiceChange(index, 'costo', e.target.value)}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">$</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveService(index)}
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
              onClick={handleAddService}
              className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors py-1"
            >
              <PlusCircle className="w-4 h-4" />
              Agregar otro servicio
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

          {/* Lista Dinámica de Repuestos */}
          <div className="space-y-4 pt-4 border-t border-zinc-50">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Búsqueda en Inventario y Repuestos</h3>
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
                  {filteredInventory.map(part => (
                    <button
                      key={part.id}
                      type="button"
                      disabled={part.stock === 0}
                      onClick={() => handleSelectInventoryPart(part)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-zinc-50 last:border-0",
                        part.stock === 0 && "opacity-40 cursor-not-allowed"
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
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {formData.spare_parts.length === 0 && (
                <p className="text-[10px] text-zinc-400 italic text-center py-2 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-100">
                  Busca en inventario o agrega uno manual.
                </p>
              )}
              {formData.spare_parts.map((part, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center animate-in slide-in-from-left-2 duration-200">
                  <div className="col-span-7 relative">
                    {part.part_id && (
                      <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 pointer-events-none" />
                    )}
                    <input
                      type="text"
                      placeholder="Descripción del repuesto"
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border border-zinc-200 focus:border-blue-500 outline-none transition-all text-sm bg-white",
                        part.part_id && "pl-8 text-blue-700 bg-blue-50/30 border-blue-100"
                      )}
                      value={part.descripcion}
                      onChange={(e) => handleSparePartChange(index, 'descripcion', e.target.value)}
                      disabled={!!part.part_id}
                    />
                  </div>
                  <div className="col-span-4 relative">
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
              Agregar otro repuesto
            </button>

            <div className="pt-2 flex justify-end">
              <div className="bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-100 flex items-center gap-3">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Total Inversión Estimada</span>
                <span className="text-sm font-black text-white">
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
                  shadowColor: `${primaryColor}40`
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
