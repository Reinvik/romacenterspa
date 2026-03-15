import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Mechanic, TicketStatus, Customer, Ticket, GarageSettings } from '../types';
import { X, Search, Info, UserPlus, History } from 'lucide-react';
import { CAR_BRANDS, CAR_MODELS } from '../lib/carData';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (ticket: any) => void;
  mechanics: Mechanic[];
  customers: Customer[];
  tickets: Ticket[];
  settings: GarageSettings | null;
}

export function AddTicketModal({ isOpen, onClose, onAdd, mechanics, customers, tickets, settings }: AddTicketModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    model: '',
    status: 'Ingresado' as TicketStatus,
    mechanic_id: 'Sin asignar',
    owner_name: '',
    owner_phone: '',
    notes: '',
    vin: '',
    engine_id: '',
    mileage: 0,
    entry_date: format(new Date(), 'yyyy-MM-dd'),
  });

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
      vin: ('last_vin' in customer ? customer.last_vin : (customer as Ticket).vin) || prev.vin,
      engine_id: ('last_engine_id' in customer ? customer.last_engine_id : (customer as Ticket).engine_id) || prev.engine_id,
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
    setFormData({
      id: '',
      model: '',
      status: 'Ingresado',
      mechanic_id: 'Sin asignar',
      owner_name: '',
      owner_phone: '',
      notes: '',
      vin: '',
      engine_id: '',
      mileage: 0,
      entry_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">N° Chasis (VIN)</label>
                <input
                  type="text"
                  placeholder="17 caracteres..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-mono text-sm uppercase bg-zinc-50/30 focus:ring-4"
                  style={{ 
                    borderColor: formData.vin ? primaryColor : undefined,
                    boxShadow: formData.vin ? `0 0 0 4px ${primaryColor}15` : undefined
                  }}
                  value={formData.vin}
                  onChange={e => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">N° Motor</label>
                <input
                  type="text"
                  placeholder="ID del motor..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all font-mono text-sm uppercase bg-zinc-50/30 focus:ring-4"
                  style={{ 
                    borderColor: formData.engine_id ? primaryColor : undefined,
                    boxShadow: formData.engine_id ? `0 0 0 4px ${primaryColor}15` : undefined
                  }}
                  value={formData.engine_id}
                  onChange={e => setFormData({ ...formData, engine_id: e.target.value.toUpperCase() })}
                />
              </div>
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Observaciones / Motivo Ingreso</label>
            <textarea
              required
              rows={3}
              placeholder="Describe el síntoma o el trabajo solicitado..."
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none font-medium"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
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
