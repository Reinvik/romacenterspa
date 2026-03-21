import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketStatus, Mechanic, Part, Customer, GarageSettings, Reminder, GarageNotification } from '../types';
import { supabase, supabaseGarage } from '../lib/supabase';

export const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];


export function useGarageStore(companyId?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<GarageNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<GarageSettings | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!companyId) return;
    try {
      if (!isSilent) setLoading(true);

      const fetchAll = async (table: string, orderCol: string = 'created_at', ascending: boolean = false) => {
        let allData: any[] = [];
        let from = 0;
        let hasMore = true;
        const limit = 1000;

        while (hasMore) {
          const { data, error } = await supabaseGarage
            .from(table)
            .select('*')
            .eq('company_id', companyId)
            .order(orderCol, { ascending })
            .range(from, from + limit - 1);

          if (error) throw error;
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += limit;
            if (data.length < limit) hasMore = false;
          } else {
            hasMore = false;
          }
        }
        return allData;
      };

      const [
        ticketsData,
        mechanicsData,
        partsData,
        customersData,
        { data: settingsData },
        remindersData,
        { data: notificationsData }
      ] = await Promise.all([
        fetchAll('garage_tickets', 'entry_date', false),
        supabaseGarage.from('garage_mechanics').select('*').eq('company_id', companyId).order('name', { ascending: true }).then(r => r.data),
        fetchAll('garage_parts', 'name', true),
        fetchAll('garage_customers', 'name', true),
        supabaseGarage.from('garage_settings').select('*').eq('company_id', companyId).maybeSingle(),
        supabaseGarage.from('garage_reminders').select('*').eq('company_id', companyId).order('planned_date', { ascending: true }).then(r => r.data),
        supabaseGarage.from('garage_notifications').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20)
      ]);

      // Map mechanic names to tickets if mechanic_id is present and mechanicsData is available
      const enrichedTickets = (ticketsData || []).map((t: any) => {
        // t.mechanic column effectively stores the mechanic ID (UUID) or Name (historical)
        let mechanic = (mechanicsData || []).find(m => m.id === t.mechanic);
        
        // Fallback: If not found by ID, try matching by name (case-insensitive)
        if (!mechanic && t.mechanic) {
            mechanic = (mechanicsData || []).find(m => (m.name || '').toUpperCase() === (t.mechanic || '').toUpperCase());
        }

        return {
          ...t,
          mechanic_id: mechanic ? mechanic.id : t.mechanic,
          mechanic: mechanic ? mechanic.name : (t.mechanic || 'Sin asignar')
        };
      });

      setTickets(enrichedTickets as Ticket[]);
      if (mechanicsData) setMechanics(mechanicsData as Mechanic[]);
      if (partsData) setParts(partsData as Part[]);
      if (customersData) setCustomers(customersData as Customer[]);
      
      // Enriquecer settings con el slug de la compañía
      if (settingsData) {
        const { data: companyData } = await supabase.from('companies').select('slug').eq('id', settingsData.company_id).single();
        setSettings({ ...settingsData, company_slug: companyData?.slug } as GarageSettings);
      }
      
      if (remindersData) setReminders(remindersData as Reminder[]);
      if (notificationsData) setNotifications(notificationsData as GarageNotification[]);
    } catch (error) {
      console.error('Error fetching garage data:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
    // Realtime disabled by user request for stability
  }, [fetchData]);

  const addTicket = async (ticket: Partial<Ticket>) => {
    try {
      // 1. Registrar/Actualizar Cliente automáticamente
      if (ticket.owner_name && ticket.owner_phone) {
        // Normalizar teléfono para la búsqueda
        const normalizedPhone = ticket.owner_phone.replace(/\D/g, '');
        
        // Primero intentamos buscar por teléfono (identificador más fiable)
        let { data: existingCustomer } = await supabaseGarage.from('garage_customers')
          .select('id, vehicles, last_mileage, last_vin, last_engine_id, last_model')
          .eq('company_id', companyId)
          .eq('phone', ticket.owner_phone)
          .maybeSingle();

        // Si no lo encuentra por teléfono exacto, intentamos por nombre (menos fiable, limitamos a 1)
        if (!existingCustomer) {
          const { data: byName } = await supabaseGarage.from('garage_customers')
            .select('id, vehicles, last_mileage, last_vin, last_engine_id, last_model')
            .eq('company_id', companyId)
            .eq('name', ticket.owner_name)
            .limit(1)
            .maybeSingle();
          existingCustomer = byName;
        }

        if (existingCustomer) {
          // Actualizar lista de vehículos y datos de historial si es necesario
          const vehicles = existingCustomer.vehicles || [];
          const updates: any = {
            last_visit: new Date().toISOString(),
            last_mileage: ticket.mileage || existingCustomer.last_mileage,
            last_vin: ticket.vin || existingCustomer.last_vin,
            last_engine_id: ticket.engine_id || existingCustomer.last_engine_id,
            last_model: ticket.model || existingCustomer.last_model
          };

          if (ticket.id && !vehicles.includes(ticket.id)) {
            updates.vehicles = [...vehicles, ticket.id];
          }

          await supabaseGarage.from('garage_customers')
            .update(updates)
            .eq('company_id', companyId)
            .eq('id', existingCustomer.id);
        } else {
          // Crear nuevo cliente con datos iniciales
          await supabaseGarage.from('garage_customers').insert([{
            company_id: companyId,
            name: ticket.owner_name,
            phone: ticket.owner_phone,
            vehicles: ticket.id ? [ticket.id] : [],
            last_visit: new Date().toISOString(),
            last_mileage: ticket.mileage,
            last_vin: ticket.vin,
            last_engine_id: ticket.engine_id,
            last_model: ticket.model
          }]);
        }
      }

      // 2. Comprobar si el vehículo ya tiene un ticket "vivo" o archivado
      const { data: existingTicket } = await supabaseGarage.from('garage_tickets')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', ticket.id)
        .maybeSingle();

      const initialHistory = [{
        status: ticket.status || 'Ingresado',
        date: new Date().toISOString(),
        user: 'Sistema / Recepción'
      }];

      if (existingTicket) {
        // Vehículo reingresado
        // 1. Archivar la sesión actual en el historial (si tiene contenido relevante)
        const currentLog = existingTicket.service_log || [];
        const hasWorkDone = (existingTicket.services && existingTicket.services.length > 0) || existingTicket.notes;
        
        let newLog = currentLog;
        if (hasWorkDone) {
          const newEntry = {
            date: existingTicket.close_date || existingTicket.last_status_change || new Date().toISOString(),
            notes: existingTicket.notes || '',
            parts: [
              ...(existingTicket.services || []).map(s => s.descripcion),
              ...(existingTicket.spare_parts || []).map(p => `Repuesto: ${p.descripcion}`)
            ],
            cost: existingTicket.cost || existingTicket.quotation_total || 0,
            mileage: existingTicket.mileage,
            job_photos: existingTicket.job_photos || []
          };
          // Evitar duplicados si el último log es idéntico en fecha y notas (opcional, pero ayuda)
          const lastLog = currentLog[currentLog.length - 1];
          if (!lastLog || lastLog.date !== newEntry.date || lastLog.notes !== newEntry.notes) {
            newLog = [...currentLog, newEntry];
          }
        }

        // 2. Actualizar con datos del nuevo ingreso
        const { error } = await supabaseGarage.from('garage_tickets')
          .update({
             status: ticket.status || 'Ingresado',
             mechanic: ticket.mechanic_id === 'Sin asignar' ? null : ticket.mechanic_id,
             owner_name: ticket.owner_name,
             owner_phone: ticket.owner_phone,
             notes: ticket.notes,
             parts_needed: ticket.parts_needed || [],
             entry_date: new Date().toISOString(),
             last_status_change: new Date().toISOString(),
             close_date: null,
             quotation_total: 0,
             quotation_accepted: false,
             vin: ticket.vin || existingTicket.vin,
             engine_id: ticket.engine_id || existingTicket.engine_id,
             mileage: ticket.mileage || existingTicket.mileage,
             services: ticket.services || [],
             spare_parts: [], // Resetear repuestos para nueva visita
             job_photos: [],  // Resetear fotos para nueva visita
             service_log: newLog
          })
          .eq('id', ticket.id);

        if (error) throw error;
      } else {
        // Vehículo nuevo
        const { error } = await supabaseGarage.from('garage_tickets').insert([{
          id: ticket.id,
          company_id: companyId,
          model: ticket.model,
          status: ticket.status || 'Ingresado',
          mechanic: ticket.mechanic_id === 'Sin asignar' ? null : ticket.mechanic_id,
          owner_name: ticket.owner_name,
          owner_phone: ticket.owner_phone,
          notes: ticket.notes,
          parts_needed: ticket.parts_needed || [],
          entry_date: new Date().toISOString(),
          last_status_change: new Date().toISOString(),
          vin: ticket.vin,
          engine_id: ticket.engine_id,
          mileage: ticket.mileage,
          services: ticket.services || []
        }]);

        if (error) throw error;
      }
      await fetchData();
    } catch (error) {
      console.error('Error adding ticket:', error);
      throw error;
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_tickets').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus, changedBy: string = 'Recepción/Admin') => {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabaseGarage.from('garage_tickets')
        .update({
          status,
          last_status_change: now,
          close_date: status === 'Finalizado' ? now : null
        })
        .eq('id', ticketId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const addMechanic = async (name: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_mechanics').insert([{ 
        name,
        company_id: companyId 
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding mechanic:', error);
      throw error;
    }
  };

  const deleteMechanic = async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_mechanics').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting mechanic:', error);
    }
  };

  const addPart = async (part: Partial<Part>) => {
    try {
      const { error } = await supabaseGarage.from('garage_parts').insert([{
        id: part.id,
        company_id: companyId,
        name: part.name,
        stock: part.stock,
        min_stock: part.min_stock,
        price: part.price
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding part:', error);
      throw error;
    }
  };

  const addCustomer = async (customer: Partial<Customer>) => {
    try {
      const { error } = await supabaseGarage.from('garage_customers').insert([{
        company_id: companyId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        vehicles: customer.vehicles || [],
        last_visit: new Date().toISOString()
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    try {
      const { error } = await supabaseGarage.from('garage_customers')
        .update({
          name: updates.name,
          phone: updates.phone,
          email: updates.email,
          last_visit: new Date().toISOString()
        })
        .eq('id', customerId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_customers').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  const updateSettings = async (updates: Partial<GarageSettings>) => {
    try {
      const { company_slug, ...settingsUpdates } = updates;

      if (settings?.id) {
        const { error } = await supabaseGarage.from('garage_settings')
          .update(settingsUpdates)
          .eq('id', settings.id);
        if (error) throw error;

        // Si se cambió el slug, actualizar la tabla companies
        if (company_slug && settings.company_id) {
          const { error: slugError } = await supabase
            .from('companies')
            .update({ slug: company_slug })
            .eq('id', settings.company_id);
          if (slugError) throw slugError;
        }
      } else {
        // Fallback for companies created before the trigger
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');
        
        // Obtenemos el profile para saber el company_id
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', session.user.id).single();
        if (!profile?.company_id) throw new Error('Usuario sin empresa asginada');

        const { error } = await supabaseGarage.from('garage_settings').insert([{
           ...updates,
           company_id: profile.company_id
        }]);
        if (error) throw error;
      }
      await fetchData();
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const updatePart = async (partId: string, updates: Partial<Part>) => {
    try {
      const { error } = await supabaseGarage.from('garage_parts')
        .update(updates)
        .eq('id', partId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating part:', error);
      throw error;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      // 1. Obtener el estado actual del ticket para comparar repuestos
      const { data: currentTicket, error: fetchError } = await supabaseGarage.from('garage_tickets')
        .select('parts_needed')
        .eq('id', ticketId)
        .single();

      if (fetchError) throw fetchError;

      const dbUpdates: any = {
        last_status_change: new Date().toISOString()
      };

      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.model !== undefined) dbUpdates.model = updates.model;
      if (updates.owner_name !== undefined) dbUpdates.owner_name = updates.owner_name;
      if (updates.owner_phone !== undefined) dbUpdates.owner_phone = updates.owner_phone;
      if (updates.parts_needed !== undefined) dbUpdates.parts_needed = updates.parts_needed;
      if (updates.close_date !== undefined) dbUpdates.close_date = updates.close_date;
      if (updates.quotation_total !== undefined) dbUpdates.quotation_total = updates.quotation_total;
      if (updates.quotation_accepted !== undefined) dbUpdates.quotation_accepted = updates.quotation_accepted;
      if (updates.vin !== undefined) dbUpdates.vin = updates.vin;
      if (updates.engine_id !== undefined) dbUpdates.engine_id = updates.engine_id;
      if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
      if (updates.job_photos !== undefined) dbUpdates.job_photos = updates.job_photos;
      if (updates.services !== undefined) dbUpdates.services = updates.services;

      if (updates.mechanic_id !== undefined) {
        dbUpdates.mechanic = updates.mechanic_id === 'Sin asignar' ? null : updates.mechanic_id;
      }

      // 2. Lógica de deducción de stock
      if (updates.parts_needed) {
        const oldParts = currentTicket.parts_needed || [];
        const newParts = updates.parts_needed;

        // Encontrar repuestos recién añadidos
        const addedParts = newParts.filter(p => !oldParts.includes(p));

        for (const partName of addedParts) {
          // Buscar el repuesto por nombre en el inventario actual (cargado en el store)
          const partToUpdate = parts.find(p => p.name === partName);
          if (partToUpdate && partToUpdate.stock > 0) {
            await supabaseGarage.from('garage_parts')
              .update({ stock: partToUpdate.stock - 1 })
              .eq('id', partToUpdate.id);
          }
        }
      }

      const { error } = await supabaseGarage.from('garage_tickets')
        .update(dbUpdates)
        .eq('id', ticketId);

      if (error) throw error;

      // 3. Sincronizar datos actualizados del ticket con el cliente
      if (dbUpdates.owner_name && dbUpdates.owner_phone) {
        const { data: customer } = await supabaseGarage.from('garage_customers')
          .select('id')
          .or(`phone.eq.${dbUpdates.owner_phone},name.eq.${dbUpdates.owner_name}`)
          .maybeSingle();
        
        if (customer) {
          await supabaseGarage.from('garage_customers')
            .update({
              last_mileage: dbUpdates.mileage,
              last_vin: dbUpdates.vin,
              last_engine_id: dbUpdates.engine_id,
              last_model: dbUpdates.model,
              last_visit: new Date().toISOString()
            })
            .eq('id', customer.id);
        }
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  const searchTicket = async (patente: string): Promise<Ticket | null> => {
    const normalizedInput = patente.replace(/[\s\.\-·]/g, '').toUpperCase();
    
    // 1. Buscar en estado local
    const local = tickets.find(t => {
      const normalizedTicketId = t.id.replace(/[\s\.\-·]/g, '').toUpperCase();
      return normalizedTicketId === normalizedInput;
    });

    if (local) return local;

    // 2. Fallback: Buscar en base de datos (para históricos fuera del límite de 5000)
    if (!companyId) return null;
    try {
      const { data, error } = await supabaseGarage
        .from('garage_tickets')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', normalizedInput)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;

      // Enriquecer con mecánico si es necesario
      const mechanic = mechanics.find(m => m.id === data.mechanic || m.name.toUpperCase() === (data.mechanic || '').toUpperCase());
      return {
        ...data,
        mechanic_id: mechanic ? mechanic.id : data.mechanic,
        mechanic: mechanic ? mechanic.name : (data.mechanic || 'Sin asignar')
      } as Ticket;
    } catch (e) {
      console.error('Error in deep searchTicket:', e);
      return null;
    }
  };

  const addReminder = async (reminder: Partial<Reminder>) => {
    try {
      // Collision prevention
      const nextDay = new Date(reminder.planned_date!);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const { data: existing } = await supabaseGarage
        .from('garage_reminders')
        .select('id')
        .eq('company_id', reminder.company_id)
        .gte('planned_date', reminder.planned_date)
        .lt('planned_date', nextDayStr)
        .ilike('planned_time', `${reminder.planned_time}%`)
        .maybeSingle();

      if (existing) {
        throw new Error('Ese horario ya está ocupado.');
      }

      const { error } = await supabaseGarage.from('garage_reminders').insert([{
        ...reminder,
        company_id: companyId
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      const { error } = await supabaseGarage.from('garage_reminders').update(updates).eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_reminders').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const uploadTicketPhoto = async (patente: string, file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${patente}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  return {
    tickets,
    mechanics,
    parts,
    customers,
    settings,
    reminders,
    notifications,
    loading,
    addTicket,
    updateTicketStatus,
    addMechanic,
    deleteMechanic,
    addPart,
    updatePart,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    updateSettings,
    updateTicket,
    deleteTicket,
    uploadTicketPhoto,
    updateVehicle: async (patente: string, updates: { ownerName?: string; ownerPhone?: string; model?: string }) => {
      try {
        // Encontrar el último ticket de esta patente para obtener su ID real de base de datos
        const lastTicket = tickets.find(t => t.id === patente);
        if (!lastTicket) throw new Error('Vehículo no encontrado');

        const dbUpdates: any = {};
        if (updates.ownerName !== undefined) dbUpdates.owner_name = updates.ownerName;
        if (updates.ownerPhone !== undefined) dbUpdates.owner_phone = updates.ownerPhone;
        if (updates.model !== undefined) dbUpdates.model = updates.model;

        // Actualizar todos los tickets de esta patente para mantener consistencia de dueño/modelo? 
        // El usuario quiere "modificar los datos para actualizar", usualmente se refiere a los datos del vehículo/dueño actual.
        // Actualizamos el ticket más reciente que es el que manda en la vista.
        const { error: tErr } = await supabaseGarage.from('garage_tickets')
          .update(dbUpdates)
          .eq('id', patente)
          .eq('company_id', companyId);

        if (tErr) throw tErr;

        // También actualizar en la tabla de clientes si existe
        const { data: customer } = await supabaseGarage.from('garage_customers')
          .select('id')
          .eq('company_id', companyId)
          .or(`phone.eq.${lastTicket.owner_phone},name.eq.${lastTicket.owner_name}`)
          .maybeSingle();

        if (customer) {
          const cUpdates: any = {};
          if (updates.ownerName !== undefined) cUpdates.name = updates.ownerName;
          if (updates.ownerPhone !== undefined) cUpdates.phone = updates.ownerPhone;
          if (updates.model !== undefined) cUpdates.last_model = updates.model;
          
          await supabaseGarage.from('garage_customers')
            .update(cUpdates)
            .eq('id', customer.id);
        }

        await fetchData();
      } catch (error) {
        console.error('Error updating vehicle:', error);
        throw error;
      }
    },
    deleteVehicle: async (patente: string) => {
      try {
        // Eliminar todos los tickets de esa patente para esa compañía
        const { error } = await supabaseGarage.from('garage_tickets')
          .delete()
          .eq('id', patente)
          .eq('company_id', companyId);

        if (error) throw error;
        await fetchData();
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        throw error;
      }
    },
    addReminder,
    updateReminder,
    deleteReminder,
    markNotificationAsRead,
    acceptQuotation: async (id: string, ticketModel: string) => {
      await updateTicket(id, {
        quotation_accepted: true
      });
      await updateTicketStatus(id, 'En Mantención', 'Gestión de Cotización (Auto)');
      // Insert notification
      await supabaseGarage.from('garage_notifications').insert([{
        ticket_id: id,
        message: `¡Cotización Aceptada! El vehículo ${ticketModel} (${id}) ha pasado a reparación.`
      }]);
    },
    searchTicket,
    searchTicketsHistory: async (patente: string): Promise<Ticket[]> => {
      const normalizedInput = patente.replace(/[\s\.\-·]/g, '').toUpperCase();
      if (!companyId) return [];
      try {
        const { data, error } = await supabaseGarage
          .from('garage_tickets')
          .select('*')
          .eq('company_id', companyId)
          .eq('id', normalizedInput)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return (data || []).map(d => {
           const mech = mechanics.find(m => m.id === d.mechanic || m.name.toUpperCase() === (d.mechanic || '').toUpperCase());
           return { ...d, mechanic: mech?.name || d.mechanic || 'Sin asignar' };
        });
      } catch (e) {
        console.error('Error in searchTicketsHistory:', e);
        return [];
      }
    },
    fetchActiveReminder: async (patente: string): Promise<Reminder | null> => {
      if (!companyId) return null;
      try {
        const normalizedInput = patente.replace(/[\s\.\-·]/g, '').toUpperCase();
        
        const { data, error } = await supabaseGarage
          .from('garage_reminders')
          .select('*')
          .eq('company_id', companyId)
          .eq('patente', normalizedInput)
          .eq('completed', false)
          .maybeSingle();

        if (error) throw error;
        return data as Reminder;
      } catch (e) {
        console.error('Error in fetchActiveReminder:', e);
        return null;
      }
    },
    refreshData: fetchData,
    fetchCompanies: useCallback(async () => {
      const { data, error } = await supabase.from('companies').select('id, name, slug').ilike('name', '%roma center%').order('name');
      if (error) throw error;
      return data;
    }, []),
    fetchPublicVehicleInfo: async (company_id: string, identificador: string) => {
      let customerData: any = null;
      let ticketData: any = null;

      // Normalizar input (remover espacios y guiones para patentes)
      const normalizedInput = identificador.trim().replace(/[-\s\.\-·]/g, '').toUpperCase();
      const numericInput = identificador.replace(/\D/g, '');

      // 1. Buscar en garage_tickets (historial de trabajos) para obtener datos rápidos del vehículo
      try {
        const { data: ticket } = await supabaseGarage
          .from('garage_tickets')
          .select('*')
          .eq('company_id', company_id)
          .eq('id', normalizedInput)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ticket) ticketData = ticket;
      } catch (e) {}

      // 2. Buscar en garage_customers (base de datos de clientes)
      // Nota: 'last_vehicle_id' no existe en la tabla, usamos 'vehicles'
      try {
        // Fallback: Buscar en el array de vehículos (columna jsonb o array)
        const { data: customers } = await supabaseGarage
          .from('garage_customers')
          .select('name, phone, last_model, vehicles')
          .eq('company_id', company_id)
          .contains('vehicles' as any, [normalizedInput]);
        
        if (customers && customers.length > 0) {
          customerData = customers[0];
        }
      } catch (e) {}

      // 3. Fallback: Intentar buscar por teléfono si el input es numérico
      if (!customerData && !ticketData) {
        // Chile: números móviles son de 9 dígitos, fijos de 8 o 9. Buscamos al menos 8.
        if (numericInput.length >= 8) {
            try {
                // Buscamos todos los que coincidan con el patrón, para evitar error de maybeSingle
                const { data: multipleByPhone } = await supabaseGarage
                    .from('garage_customers')
                    .select('name, phone, last_model, vehicles')
                    .eq('company_id', company_id)
                    .ilike('phone', `%${numericInput}%`);
                
                if (multipleByPhone && multipleByPhone.length > 0) {
                    // Priorizamos el que tenga vehículos asociados si hay varios
                    customerData = multipleByPhone.find(c => Array.isArray(c.vehicles) && c.vehicles.length > 0) || multipleByPhone[0];
                }
            } catch (e) {}
        }
      }

      if (!customerData && !ticketData) return null;

      // Determinamos el vehicle_id (patente)
      // Si vino de customerData, usamos el primero de su lista de vehículos
      const customerPlate = (Array.isArray(customerData?.vehicles) && customerData.vehicles.length > 0) 
        ? customerData.vehicles[0] 
        : null;

      return {
        owner_name: customerData?.name || ticketData?.owner_name || '',
        owner_phone: customerData?.phone || ticketData?.owner_phone || '',
        model: customerData?.last_model || ticketData?.model || '',
        vehicle_id: customerPlate || ticketData?.id || (numericInput.length >= 8 ? '' : normalizedInput)
      };
    },
    fetchPublicSettingsBySlug: async (slug: string) => {
      // 1. Encontrar la empresa por slug
      const { data: company, error: cError } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (cError) throw cError;

      // 2. Obtener los settings de esa empresa
      const { data: settings, error: sError } = await supabaseGarage
        .from('garage_settings')
        .select('*')
        .eq('company_id', company.id)
        .single();
      
      if (sError) throw sError;
      return settings;
    },
    addIntelligentReminder: async (reminder: any) => {
      // 0. Strict check if slot is already taken (Collision prevention)
      // Normalizamos la fecha a YYYY-MM-DD para la búsqueda
      const dateOnly = reminder.planned_date.includes('T') ? reminder.planned_date.split('T')[0] : reminder.planned_date;
      
      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const effectiveCompanyId = reminder.company_id || companyId;
      if (!effectiveCompanyId) {
        throw new Error('MISSING_COMPANY_ID');
      }

      const { data: existing } = await supabaseGarage
        .from('garage_reminders')
        .select('id')
        .eq('company_id', effectiveCompanyId)
        .gte('planned_date', dateOnly)
        .lt('planned_date', nextDayStr)
        .ilike('planned_time', `${reminder.planned_time}%`)
        .maybeSingle();

      if (existing) {
        throw new Error('SLOT_OCCUPIED');
      }

      // 1. Insert reminder
      const { data: newReminder, error } = await supabaseGarage
        .from('garage_reminders')
        .insert([{
            ...reminder,
            company_id: effectiveCompanyId,
            planned_date: dateOnly // Guardamos solo la fecha para consistencia
        }])
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error adding public reminder:', error);
        throw error;
      }

      // 1.5 "Inteligencia": Actualizar o crear registro del cliente/vehículo
      try {
        const normalizedPatente = reminder.patente?.trim().replace(/[-\s]/g, '').toUpperCase();
        const numericPhone = reminder.customer_phone?.replace(/\D/g, '');

        if (normalizedPatente || numericPhone) {
          // Intentar encontrar cliente existente principalmente por teléfono
          const { data: customers } = await supabaseGarage
            .from('garage_customers')
            .select('id, name, phone, last_model, vehicles')
            .eq('company_id', reminder.company_id)
            .ilike('phone', `%${numericPhone}%`);

          const existingCustomer = (customers && customers.length > 0) ? customers[0] : null;

          if (existingCustomer) {
            // Actualizar si hay cambios significativos o si el vehículo es nuevo para este cliente
            const currentVehicles = Array.isArray(existingCustomer.vehicles) ? existingCustomer.vehicles : [];
            const isNewVehicle = normalizedPatente && !currentVehicles.includes(normalizedPatente);
            
            const hasChanges = 
              existingCustomer.name !== reminder.customer_name || 
              existingCustomer.phone !== reminder.customer_phone ||
              existingCustomer.last_model !== reminder.vehicle_model ||
              isNewVehicle;

            if (hasChanges) {
              const updatedVehicles = isNewVehicle 
                ? [...currentVehicles, normalizedPatente] 
                : currentVehicles;

              await supabaseGarage
                .from('garage_customers')
                .update({
                  name: reminder.customer_name,
                  phone: reminder.customer_phone,
                  last_model: reminder.vehicle_model,
                  vehicles: updatedVehicles,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingCustomer.id);
            }
          } else if (reminder.customer_name && reminder.customer_phone) {
            // Crear nuevo cliente si no existe
            await supabaseGarage
              .from('garage_customers')
              .insert([{
                company_id: reminder.company_id,
                name: reminder.customer_name,
                phone: reminder.customer_phone,
                last_model: reminder.vehicle_model,
                vehicles: normalizedPatente ? [normalizedPatente] : []
              }]);
          }
        }
      } catch (upsertError) {
        console.warn('Silent failure on customer intelligence update:', upsertError);
      }

      // 2. Create notification for the workshop
      try {
        await supabaseGarage.from('garage_notifications').insert([{
          company_id: reminder.company_id,
          message: `NUEVA CITA: ${reminder.customer_name} ha agendado para el ${reminder.planned_date} a las ${reminder.planned_time} hrs (${reminder.vehicle_model}).`,
          read: false
        }]);
      } catch (notifyError) {
        console.error('Error creating notification for public booking:', notifyError);
      }

      // 3. Proactively refresh data if we are in the admin context
      if (companyId) {
        await fetchData();
      }
    },
    fetchOccupiedReminders: async (companyId: string, date: string) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const { data, error } = await supabaseGarage
        .from('garage_reminders')
        .select('planned_time')
        .eq('company_id', companyId)
        .gte('planned_date', date)
        .lt('planned_date', nextDayStr);
      
      if (error) throw error;
      // Normalizamos a HH:mm ya que Postgres puede devolver HH:mm:ss
      return (data || []).map(r => r.planned_time?.substring(0, 5));
    },
    clearFinishedTickets: async () => {
      try {
        const { error } = await supabaseGarage.from('garage_tickets')
          .update({ status: 'Entregado', close_date: new Date().toISOString() })
          .eq('status', 'Finalizado');
        if (error) throw error;
        await fetchData();
      } catch (error) {
        console.error('Error clearing finished tickets:', error);
        throw error;
      }
    }
  };
}
