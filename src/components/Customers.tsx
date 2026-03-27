import React, { useState, useMemo, useEffect } from 'react';
import { Users, Search, Phone, Car, Calendar, Edit2, MessageCircle, Info, History, Trash2, ArrowDown } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddCustomerModal } from './AddCustomerModal';
import { ConfirmModal } from './ConfirmModal';
import { VehicleCRMModal } from './VehicleCRMModal';
import { EditVehicleModal } from './EditCustomerModal';
import { Customer, Ticket, TicketStatus, GarageSettings } from '../types';
import { supabaseGarage } from '../lib/supabase';

interface CustomersProps {
  customers: Customer[];
  tickets: Ticket[];
  settings: GarageSettings | null;
  onAddCustomer: (customer: any) => Promise<void>;
  onUpdateVehicle: (patente: string, updates: any) => Promise<void>;
  deleteVehicle: (patente: string) => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  searchTicket: (patente: string) => Promise<Ticket | null>;
}

const statusMap: Record<TicketStatus, string> = {
  'Ingresado': 'ingresado',
  'En Espera': 'en espera',
  'En Mantención': 'en proceso',
  'En Reparación': 'en proceso',
  'Elevador 1': 'en proceso',
  'Elevador 2': 'en proceso',
  'Listo para Entrega': 'listo para entrega',
  'Finalizado': 'entregado',
  'Entregado': 'entregado'
};

const LIMIT = 50;

export function Customers({ customers, tickets, settings, onAddCustomer, onUpdateVehicle, deleteVehicle, onUpdateNotes, searchTicket }: CustomersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [crmTicket, setCrmTicket] = useState<Ticket | null>(null);

  // Server-side pagination states
  const [crmTickets, setCrmTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchCRMData = async (term: string, pageIndex: number, append: boolean = false) => {
    if (!settings?.company_id) return;

    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      const from = pageIndex * LIMIT;
      const to = from + LIMIT - 1;

      let query = supabaseGarage
        .from('romaspa_tickets')
        .select('*')
        .eq('company_id', settings.company_id);

      if (term) {
        query = query.or(`id.ilike.%${term}%,owner_name.ilike.%${term}%,owner_phone.ilike.%${term}%`);
      }

      const { data, error } = await query
        .order('entry_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (append) {
          setCrmTickets(prev => [...prev, ...data]);
        } else {
          setCrmTickets(data);
        }
        setHasMore(data.length === LIMIT);
      }
    } catch (error) {
      console.error('Error fetching CRM data:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (settings?.company_id) {
      setPage(0);
      fetchCRMData(searchTerm, 0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, settings?.company_id]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchTerm(searchInput);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCRMData(searchTerm, nextPage, true);
  };

  const handleShowCRM = async (patente: string) => {
    const found = await searchTicket(patente);
    if (found) {
      setCrmTicket(found);
    } else {
      alert('Sin historial registrado para este vehículo todavía.');
    }
  };

  const suggestedModels = useMemo(() => {
    const models = new Set<string>();
    tickets.forEach(t => t.model && models.add(t.model));
    customers.forEach(c => c.last_model && models.add(c.last_model));
    return Array.from(models).sort();
  }, [tickets, customers]);

  const handleEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleWhatsApp = (ownerPhone: string, ownerName: string, model: string) => {
    if (!settings) return;

    const vehicleTickets = crmTickets.filter(t => t.owner_phone === ownerPhone || t.owner_name === ownerName);
    const lastTicket = vehicleTickets.length > 0 ? vehicleTickets[0] : null;

    const friendlyStatus = lastTicket ? statusMap[lastTicket.status] : 'en proceso';
    const vehicleModel = lastTicket ? lastTicket.model : (model || 'su vehículo');

    const message = settings.whatsapp_template
      .replace(/{{cliente}}/g, ownerName)
      .replace(/{{vehiculo}}/g, vehicleModel)
      .replace(/{{estado}}/g, friendlyStatus)
      .replace(/{{nombre_taller}}/g, settings.workshop_name || 'nuestro taller')
      .replace(/{{telefono_taller}}/g, settings.phone || '');

    const encodedMessage = encodeURIComponent(message);
    
    let cleanPhone = ownerPhone.replace(/\D/g, '');
    if (cleanPhone.length === 9 && cleanPhone.startsWith('9')) {
      cleanPhone = '56' + cleanPhone;
    }
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const uniqueVehicles = useMemo(() => {
    const vehicleMap = new Map<string, {
      id: string;
      ownerName: string;
      ownerPhone: string;
      model: string;
      lastVisit: string;
      lastMileage: number | null;
      fullHistory: Ticket[];
      customerData?: Customer;
    }>();

    crmTickets.forEach(ticket => {
      const patente = ticket.id;
      const existing = vehicleMap.get(patente);
      
      if (!existing || new Date(ticket.close_date || ticket.entry_date) > new Date(existing.lastVisit)) {
        vehicleMap.set(patente, {
          id: patente,
          ownerName: ticket.owner_name,
          ownerPhone: ticket.owner_phone,
          model: ticket.model,
          lastVisit: ticket.close_date || ticket.entry_date,
          lastMileage: ticket.mileage,
          fullHistory: existing ? [...existing.fullHistory, ticket] : [ticket]
        });
      } else {
        existing.fullHistory.push(ticket);
      }
    });

    vehicleMap.forEach((v, patente) => {
      const customer = customers.find(c => 
        c.phone === v.ownerPhone || 
        c.vehicles.includes(patente) || 
        c.name === v.ownerName
      );
      if (customer) v.customerData = customer;
    });

    return Array.from(vehicleMap.values())
      .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
  }, [crmTickets, customers]);

  // Skeleton Loaders components
  const TableSkeleton = () => (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={`sk-table-${i}`} className="flex items-center px-6 py-4 border-b border-zinc-100">
          <div className="w-1/5"><div className="h-8 bg-zinc-200 rounded w-24"></div></div>
          <div className="w-1/4 space-y-2">
            <div className="h-4 bg-zinc-200 rounded w-32"></div>
            <div className="h-3 bg-zinc-200 rounded w-24"></div>
          </div>
          <div className="w-1/4 space-y-2">
            <div className="h-5 bg-zinc-200 rounded w-28"></div>
          </div>
          <div className="w-1/4 space-y-2">
            <div className="h-4 bg-zinc-200 rounded w-20"></div>
            <div className="h-3 bg-zinc-200 rounded w-16"></div>
          </div>
          <div className="w-1/6 flex justify-center gap-2">
             <div className="h-8 w-8 bg-zinc-200 rounded-lg"></div>
             <div className="h-8 w-8 bg-zinc-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const MobileSkeleton = () => (
    <div className="animate-pulse divide-y divide-zinc-100 md:hidden">
      {[...Array(4)].map((_, i) => (
        <div key={`sk-mob-${i}`} className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div className="h-8 bg-zinc-200 rounded w-24"></div>
            <div className="h-8 w-8 bg-zinc-200 rounded-lg"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
            <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
            <div className="h-4 bg-zinc-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Gestión de Vehículos (CRM)</h2>
          <p className="text-zinc-500 mt-1">Historial centralizado por patente y datos del último propietario.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          <Users className="w-5 h-5" />
          Nuevo Registro
        </button>
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={onAddCustomer}
        suggestedModels={suggestedModels}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-4 bg-zinc-50/50">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md flex gap-2">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
               <input
                 type="text"
                 placeholder="Buscar por patente, dueño o celular..."
                 className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                 value={searchInput}
                 onChange={e => setSearchInput(e.target.value)}
               />
            </div>
            <button
               type="submit"
               className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors text-sm whitespace-nowrap"
            >
              Buscar
            </button>
          </form>
        </div>

        {isLoading ? (
          <>
             <MobileSkeleton />
             <div className="hidden md:block">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                     <th className="px-6 py-4">Patente</th>
                     <th className="px-6 py-4">Propietario / Contacto</th>
                     <th className="px-6 py-4">Vehículo</th>
                     <th className="px-6 py-4 text-left">Estado / Visita</th>
                     <th className="px-6 py-4 text-center">Acciones</th>
                   </tr>
                 </thead>
                 <tbody>
                    <tr><td colSpan={5} className="p-0"><TableSkeleton /></td></tr>
                 </tbody>
               </table>
             </div>
          </>
        ) : (
          <>
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-zinc-100">
              {uniqueVehicles.length === 0 ? (
                <div className="px-6 py-8 text-center text-zinc-500 font-medium">
                  No se encontraron vehículos.
                </div>
              ) : (
                uniqueVehicles.map((vehicle) => (
                  <div key={`mob-${vehicle.id}`} className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="group/plate flex items-center bg-white border-[2px] border-zinc-900 rounded-md shadow-sm overflow-hidden ring-1 ring-zinc-100">
                          <div className="w-1.5 h-full bg-blue-600 self-stretch py-1"></div>
                          <div className="px-3 py-1 text-sm font-mono font-black text-zinc-900 tracking-widest uppercase">
                            {vehicle.id}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShowCRM(vehicle.id)}
                          className="p-2.5 bg-zinc-900 text-white rounded-xl active:scale-95 transition-transform"
                        >
                          <History className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                        <Users className="w-4 h-4 text-zinc-400" />
                        {vehicle.ownerName}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        {vehicle.ownerPhone}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                        <Car className="w-4 h-4 text-emerald-500" />
                        {vehicle.model}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-50 flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400">
                       <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Ult: {format(parseISO(vehicle.lastVisit), "dd/MM/yyyy")}
                       </div>
                       {vehicle.lastMileage && (
                         <div className="flex items-center gap-1">
                            <History className="w-3 h-3" />
                            {vehicle.lastMileage.toLocaleString()} KM
                         </div>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Patente</th>
                    <th className="px-6 py-4">Propietario / Contacto</th>
                    <th className="px-6 py-4">Vehículo</th>
                    <th className="px-6 py-4 text-left">Estado / Visita</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {uniqueVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 font-medium">
                        No se encontraron vehículos.
                      </td>
                    </tr>
                  ) : (
                    uniqueVehicles.map((vehicle) => (
                      <tr key={`desk-${vehicle.id}`} className="hover:bg-zinc-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="group/plate inline-flex items-center bg-white border-[2px] border-zinc-900 rounded-md shadow-sm hover:bg-zinc-50 transition-all active:scale-95 overflow-hidden ring-1 ring-zinc-100 cursor-pointer"
                               onClick={() => handleShowCRM(vehicle.id)}>
                            <div className="w-1.5 h-full bg-blue-600 self-stretch py-1"></div>
                            <div className="px-3 py-1 flex items-center gap-2">
                              <span className="text-sm font-mono font-black text-zinc-900 tracking-widest uppercase">
                                {vehicle.id}
                              </span>
                              <History className="w-4 h-4 text-zinc-400 group-hover/plate:text-zinc-900 transition-colors" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-zinc-900">{vehicle.ownerName}</span>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <Phone className="w-3.5 h-3.5 text-zinc-400" />
                              {vehicle.ownerPhone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-fit">
                              <Car className="w-4 h-4 text-emerald-500" />
                              {vehicle.model}
                            </div>
                            {vehicle.lastMileage && (
                               <span className="text-[10px] font-bold text-blue-600 px-2">
                                 {vehicle.lastMileage.toLocaleString()} KM
                               </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-zinc-400" />
                              {format(parseISO(vehicle.lastVisit), "dd/MM/yyyy")}
                            </span>
                            <span className="text-[10px] text-zinc-500 mt-0.5 font-bold uppercase">
                              Hace {formatDistanceToNow(parseISO(vehicle.lastVisit), { locale: es })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(vehicle)}
                              className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Editar Datos"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setVehicleToDelete(vehicle.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Registro"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleShowCRM(vehicle.id)}
                              className="p-2 text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Ver Historial Completo"
                            >
                              <Info className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleWhatsApp(vehicle.ownerPhone, vehicle.ownerName, vehicle.model)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* Load More Button */}
        {!isLoading && hasMore && (
          <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 flex justify-center">
             <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 font-medium rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isLoadingMore ? (
                   <span className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></span>
                ) : (
                   <ArrowDown className="w-4 h-4 text-zinc-400" />
                )}
                {isLoadingMore ? 'Cargando...' : 'Cargar más registros'}
             </button>
          </div>
        )}
      </div>

      <EditVehicleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        vehicle={selectedVehicle}
        onUpdate={onUpdateVehicle}
        suggestedModels={suggestedModels}
      />

      <ConfirmModal
        isOpen={vehicleToDelete !== null}
        title="Eliminar Registro de Vehículo"
        message={`¿Estás seguro que deseas eliminar el registro del vehículo ${vehicleToDelete}? Se eliminará todo su historial.`}
        onConfirm={async () => {
          if (vehicleToDelete) {
            try {
              await deleteVehicle(vehicleToDelete);
              setVehicleToDelete(null);
            } catch (error) {
              alert('Error al eliminar vehículo');
            }
          }
        }}
        onCancel={() => setVehicleToDelete(null)}
      />

      <VehicleCRMModal
        isOpen={crmTicket !== null}
        onClose={() => setCrmTicket(null)}
        ticket={crmTicket}
        onUpdateNotes={onUpdateNotes}
        settings={settings}
      />
    </div>
  );
}
