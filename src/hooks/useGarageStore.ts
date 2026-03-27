import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketStatus, Mechanic, Part, Customer, GarageSettings, Reminder, GarageNotification, SalaVenta, SalaVentaItem, PaymentMethod } from '../types';
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
  const [salaVentas, setSalaVentas] = useState<SalaVenta[]>([]);

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
        fetchAll('romaspa_tickets', 'entry_date', false),
        supabaseGarage.from('romaspa_mechanics').select('*').eq('company_id', companyId).order('name', { ascending: true }).then(r => r.data),
        fetchAll('romaspa_parts', 'name', true),
        fetchAll('romaspa_customers', 'name', true),
        supabaseGarage.from('romaspa_settings').select('*').eq('company_id', companyId).maybeSingle(),
        supabaseGarage.from('romaspa_reminders').select('*').eq('company_id', companyId).order('planned_date', { ascending: true }).then(r => r.data),
        supabaseGarage.from('romaspa_notifications').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20)
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

  const addTicket = useCallback(async (ticket: Partial<Ticket>) => {
    try {
      // 1. Registrar/Actualizar Cliente automáticamente
      if (ticket.owner_name && ticket.owner_phone) {
        // Normalizar teléfono para la búsqueda
        const normalizedPhone = ticket.owner_phone.replace(/\D/g, '');
        
        // Primero intentamos buscar por teléfono (identificador más fiable)
        let { data: existingCustomer } = await supabaseGarage.from('romaspa_customers')
          .select('id, vehicles, last_mileage, last_vin, last_engine_id, last_model')
          .eq('company_id', companyId)
          .eq('phone', ticket.owner_phone)
          .maybeSingle();

        // Si no lo encuentra por teléfono exacto, intentamos por nombre (menos fiable, limitamos a 1)
        if (!existingCustomer) {
          const { data: byName } = await supabaseGarage.from('romaspa_customers')
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

          await supabaseGarage.from('romaspa_customers')
            .update(updates)
            .eq('company_id', companyId)
            .eq('id', existingCustomer.id);
        } else {
          // Crear nuevo cliente con datos iniciales
          await supabaseGarage.from('romaspa_customers').insert([{
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

      // 2. Comprobar si el vehículo ya tiene un ticket "vivo" (no finalizado ni entregado)
      // Si el auto ya tiene un ticket activo, avisar o manejarlo. Si está cerrado, crear uno nuevo.
      const { data: activeTicket } = await supabaseGarage.from('romaspa_tickets')
        .select('*')
        .eq('company_id', companyId)
        .eq('patente', ticket.id) // Usar el campo patente para buscar
        .not('status', 'in', '("Finalizado","Entregado")')
        .maybeSingle();

      const newId = crypto.randomUUID(); // Generar ID único para cada sesión
      const plate = ticket.id!; // La patente viene en el campo id del formulario

      const initialHistory = [{
        status: ticket.status || 'Ingresado',
        date: new Date().toISOString(),
        user: 'Sistema / Recepción'
      }];

      if (activeTicket) {
        // Vehículo ya tiene un ticket activo: O lo actualizamos o creamos uno paralelo (decidimos actualizar el activo por seguridad de procesos)
        // Pero si el usuario quiere "más de un ticket", dejamos que cree uno nuevo con ID distinto.
        // Si el ticket anterior NO está en estados finales, lo consideramos el mismo.
        // Pero el requerimiento dice: "se puedan crear mas de un ticket por el mismo auto el mismo dia".
        // Entonces, creamos uno NUEVO si no hay colisión de ID (que no la hay por ser UUID).
      }

      // Siempre insertamos un nuevo registro para permitir múltiples tickets
      const { error } = await supabaseGarage.from('romaspa_tickets').insert([{
        id: newId,
        patente: plate,
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
        services: ticket.services || [],
        spare_parts: ticket.spare_parts || [],
        cost: ticket.cost || 0,
        status_history: initialHistory
      }]);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding ticket:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const deleteTicket = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabaseGarage
        .from('romaspa_tickets')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: TicketStatus, changedBy: string = 'Recepción/Admin', paymentMethod?: PaymentMethod) => {
    const now = new Date().toISOString();
    let originalTicket: Ticket | undefined;

    // 1. Optimistic Update Local
    setTickets(prev => {
      const target = prev.find(t => t.id === ticketId);
      if (target) {
        originalTicket = { ...target };
      }
      return prev.map(t => 
        t.id === ticketId 
          ? { ...t, status, last_status_change: now, close_date: status === 'Finalizado' ? now : null } 
          : t
      );
    });

    try {
      // 2. Fetch de Fondo a Supabase
      const { error } = await supabaseGarage.from('romaspa_tickets')
        .update({
          status,
          last_status_change: now,
          close_date: (status === 'Finalizado' || status === 'Entregado') ? originalTicket?.entry_date || now : null,
          payment_method: paymentMethod
        })
        .eq('id', ticketId);

      if (error) throw error;
      
      // 3. Sincronización Silenciosa (fetchData(true) evita el loader global)
      await fetchData(true);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      
      // 4. Rollback visual si falla DB
      if (originalTicket) {
        setTickets(prev => prev.map(t => t.id === ticketId ? originalTicket! : t));
      }
      alert('Error de conexión: No se pudo mover la tarjeta. Se ha revertido el movimiento.');
    }
  }, [fetchData]);

  const addMechanic = useCallback(async (name: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_mechanics').insert([{ 
        name,
        company_id: companyId 
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding mechanic:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const deleteMechanic = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_mechanics').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting mechanic:', error);
    }
  }, [fetchData]);

  const addPart = useCallback(async (part: Partial<Part>) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_parts').insert([{
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
  }, [companyId, fetchData]);

  const addCustomer = useCallback(async (customer: Partial<Customer>) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_customers').insert([{
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
  }, [companyId, fetchData]);

  const updateCustomer = useCallback(async (customerId: string, updates: Partial<Customer>) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_customers')
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
  }, [fetchData]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_customers').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }, [fetchData]);

  const updateSettings = useCallback(async (updates: Partial<GarageSettings>) => {
    try {
      const { company_slug, ...settingsUpdates } = updates;

      if (settings?.id) {
        const { error } = await supabaseGarage.from('romaspa_settings')
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

        const { error } = await supabaseGarage.from('romaspa_settings').insert([{
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
  }, [settings, fetchData]);

  const deletePart = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_parts').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting part:', error);
      throw error;
    }
  }, [fetchData]);

  const updatePart = useCallback(async (partId: string, updates: Partial<Part>) => {
    try {
      // Si el ID cambió, Supabase no permite actualizar la PK directamente de forma sencilla si hay FKs (aunque aquí no hay FKs estrictas en el schema public, mejor manejarlo como delete/insert para seguridad).
      if (updates.id && updates.id !== partId) {
        // 1. Obtener datos actuales
        const { data: currentPart } = await supabaseGarage.from('romaspa_parts').select('*').eq('id', partId).single();
        if (!currentPart) throw new Error('Repuesto no encontrado');

        // 2. Insertar nuevo con el nuevo ID
        const { error: insError } = await supabaseGarage.from('romaspa_parts').insert([{
           ...currentPart,
           ...updates,
           id: updates.id
        }]);
        if (insError) throw insError;

        // 3. Eliminar el viejo
        const { error: delError } = await supabaseGarage.from('romaspa_parts').delete().eq('id', partId);
        if (delError) {
            // Si falla el borrado, al menos tenemos el nuevo, pero intentamos limpiar
            console.error('Error deleting old part after ID change:', delError);
        }
      } else {
        const { error } = await supabaseGarage.from('romaspa_parts')
          .update(updates)
          .eq('id', partId);
        if (error) throw error;
      }
      await fetchData();
    } catch (error) {
      console.error('Error updating part:', error);
      throw error;
    }
  }, [fetchData]);

  const updateTicket = useCallback(async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      const dbUpdates: any = {
        last_status_change: new Date().toISOString()
      };

      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.model !== undefined) dbUpdates.model = updates.model;
      if (updates.owner_name !== undefined) dbUpdates.owner_name = updates.owner_name;
      if (updates.owner_phone !== undefined) dbUpdates.owner_phone = updates.owner_phone;
      if (updates.close_date !== undefined) dbUpdates.close_date = updates.close_date;
      if (updates.quotation_total !== undefined) dbUpdates.quotation_total = updates.quotation_total;
      if (updates.quotation_accepted !== undefined) dbUpdates.quotation_accepted = updates.quotation_accepted;
      if (updates.vin !== undefined) dbUpdates.vin = updates.vin;
      if (updates.engine_id !== undefined) dbUpdates.engine_id = updates.engine_id;
      if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
      if (updates.job_photos !== undefined) dbUpdates.job_photos = updates.job_photos;
      if (updates.services !== undefined) dbUpdates.services = updates.services;
      if (updates.spare_parts !== undefined) dbUpdates.spare_parts = updates.spare_parts;
      if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
      if (updates.payment_method !== undefined) dbUpdates.payment_method = updates.payment_method;

      if (updates.mechanic_id !== undefined) {
        dbUpdates.mechanic = updates.mechanic_id === 'Sin asignar' ? null : updates.mechanic_id;
      }

      const { error } = await supabaseGarage.from('romaspa_tickets')
        .update(dbUpdates)
        .eq('id', ticketId);

      if (error) throw error;

      // 3. Sincronizar datos actualizados del ticket con el cliente
      if (dbUpdates.owner_name && dbUpdates.owner_phone) {
        const { data: customer } = await supabaseGarage.from('romaspa_customers')
          .select('id')
          .or(`phone.eq.${dbUpdates.owner_phone},name.eq.${dbUpdates.owner_name}`)
          .maybeSingle();
        
        if (customer) {
          await supabaseGarage.from('romaspa_customers')
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
  }, [fetchData]);

  const searchTicket = useCallback(async (patente: string): Promise<Ticket | null> => {
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
        .from('romaspa_tickets')
        .select('*')
        .eq('company_id', companyId)
        .or(`id.eq.${normalizedInput},patente.eq.${normalizedInput}`)
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
  }, [companyId, tickets, mechanics]);

  const addReminder = useCallback(async (reminder: Partial<Reminder>) => {
    try {
      // Collision prevention
      const nextDay = new Date(reminder.planned_date!);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const { data: existing } = await supabaseGarage
        .from('romaspa_reminders')
        .select('id')
        .eq('company_id', reminder.company_id)
        .gte('planned_date', reminder.planned_date)
        .lt('planned_date', nextDayStr)
        .ilike('planned_time', `${reminder.planned_time}%`)
        .maybeSingle();

      if (existing) {
        throw new Error('Ese horario ya está ocupado.');
      }

      const { error } = await supabaseGarage.from('romaspa_reminders').insert([{
        ...reminder,
        company_id: companyId
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_reminders').update(updates).eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }, [fetchData]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_reminders').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }, [fetchData]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [fetchData]);

  const uploadTicketPhoto = useCallback(async (patente: string, file: File): Promise<string> => {
    try {
      // 1. Optimización del lado del cliente (Compresión)
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height = (MAX_WIDTH / width) * height;
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Error al comprimir imagen'));
            }, 'image/jpeg', 0.7); // Calidad 0.7 para balance óptimo
          };
        };
        reader.onerror = reject;
      });

      const fileExt = 'jpg'; // Forzamos jpg por la compresión
      const fileName = `${patente}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .upload(filePath, compressedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
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
  }, []);

  const updateVehicle = useCallback(async (patente: string, updates: { ownerName?: string; ownerPhone?: string; model?: string }) => {
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
      const { error: tErr } = await supabaseGarage.from('romaspa_tickets')
        .update(dbUpdates)
        .eq('id', patente)
        .eq('company_id', companyId);

      if (tErr) throw tErr;

      // También actualizar en la tabla de clientes si existe
      if (dbUpdates.owner_name && dbUpdates.owner_phone) {
        const { data: customer } = await supabaseGarage.from('romaspa_customers')
          .select('id')
          .or(`phone.eq.${dbUpdates.owner_phone},name.eq.${dbUpdates.owner_name}`)
          .maybeSingle();
        
        if (customer) {
          await supabaseGarage.from('romaspa_customers')
            .update({
              last_model: dbUpdates.model,
              last_visit: new Date().toISOString()
            })
            .eq('id', customer.id);
        }
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }, [companyId, tickets, fetchData]);

  const deleteVehicle = useCallback(async (patente: string) => {
    try {
      // Eliminar todos los tickets asociados a esta patente para esta empresa
      const { error } = await supabaseGarage.from('romaspa_tickets')
        .delete()
        .eq('id', patente)
        .eq('company_id', companyId);
      
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const acceptQuotation = useCallback(async (ticketId: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_tickets')
        .update({ 
            quotation_accepted: true,
            status: 'Presupuesto Aceptado',
            last_status_change: new Date().toISOString()
        })
        .eq('id', ticketId);
      
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error accepting quotation:', error);
      throw error;
    }
  }, [fetchData]);

  const searchTicketsHistory = useCallback(async (patenteOrPhone: string): Promise<Ticket[]> => {
    try {
      const cleanInput = patenteOrPhone.replace(/[\s\.\-·]/g, '').toUpperCase();
      const { data, error } = await supabaseGarage
        .from('romaspa_tickets')
        .select('*')
        .or(`id.ilike.%${cleanInput}%,owner_phone.ilike.%${cleanInput}%`)
        .order('entry_date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Ticket[];
    } catch (error) {
      console.error('Error searching tickets history:', error);
      return [];
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }, []);

  const addIntelligentReminder = useCallback(async (reminder: any) => {
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
      .from('romaspa_reminders')
      .select('id')
      .eq('company_id', effectiveCompanyId)
      .gte('planned_date', dateOnly)
      .lt('planned_date', nextDayStr)
      .ilike('planned_time', `${reminder.planned_time}%`)
      .maybeSingle();

    if (existing) {
      throw new Error('Ese horario ya fue reservado recientemente por otro usuario. Por favor intenta con otro bloque.');
    }

    // 1. Create the reminder
    const { data: newReminder, error } = await supabaseGarage
      .from('romaspa_reminders')
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

    // 2. Create a notification for the garage
    try {
      await supabaseGarage.from('romaspa_notifications').insert([{
        company_id: reminder.company_id,
        title: 'Nueva Reserva Web',
        message: `El cliente ${reminder.owner_name} ha reservado para el ${reminder.planned_date} a las ${reminder.planned_time} (Vehículo: ${reminder.vehicle_id})`,
        type: 'booking',
        read: false
      }]);
    } catch (notifyError) {
      console.error('Error creating notification for public booking:', notifyError);
    }

    // 3. Proactively refresh data if we are in the admin context
    if (companyId) {
      await fetchData();
    }
  }, [companyId, fetchData]);

  const fetchActiveReminder = useCallback(async (patenteOrPhone: string): Promise<Reminder | null> => {
    try {
        const cleanInput = patenteOrPhone.replace(/[\s\.\-·]/g, '').toUpperCase();
        const { data, error } = await supabaseGarage
            .from('romaspa_reminders')
            .select('*')
            .or(`patente.eq.${cleanInput},customer_phone.eq.${cleanInput}`)
            .gte('planned_date', new Date().toISOString().split('T')[0])
            .order('planned_date', { ascending: true })
            .limit(1)
            .maybeSingle();
        
        if (error) throw error;
        return data as Reminder;
    } catch (e) {
        return null;
    }
  }, []);

  const fetchPublicSettingsBySlug = useCallback(async (slug: string) => {
    // 1. Encontrar la empresa por slug
    const { data: company, error: cError } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (cError) throw cError;

    // 2. Obtener los settings de esa empresa
    const { data: settings, error: sError } = await supabaseGarage
      .from('romaspa_settings')
      .select('*')
      .eq('company_id', company.id)
      .single();
    
    if (sError) throw sError;
    return settings;
  }, []);

  const fetchOccupiedReminders = useCallback(async (companyId: string, date: string) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    const { data, error } = await supabaseGarage
      .from('romaspa_reminders')
      .select('planned_time')
      .eq('company_id', companyId)
      .gte('planned_date', date)
      .lt('planned_date', nextDayStr);
    
    if (error) throw error;
    // Normalizamos a HH:mm ya que Postgres puede devolver HH:mm:ss
    return (data || []).map(r => r.planned_time?.substring(0, 5));
  }, []);

  const fetchPublicVehicleInfo = useCallback(async (company_id: string, identificador: string) => {
    let customerData: any = null;
    let ticketData: any = null;

    // Normalizar input (remover espacios y guiones para patentes)
    const normalizedInput = identificador.trim().replace(/[-\s\.\-·]/g, '').toUpperCase();
    const numericInput = identificador.replace(/\D/g, '');

    // 1. Buscar en garage_tickets (historial de trabajos) para obtener datos rápidos del vehículo
    try {
      const { data: ticket } = await supabaseGarage
        .from('romaspa_tickets')
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
        .from('romaspa_customers')
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
                  .from('romaspa_customers')
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
  }, []);

  const clearFinishedTickets = useCallback(async () => {
    try {
      const { error } = await supabaseGarage.from('romaspa_tickets')
        .update({ status: 'Entregado', close_date: new Date().toISOString() })
        .eq('status', 'Finalizado');
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error clearing finished tickets:', error);
      throw error;
    }
  }, [fetchData]);

  const dismissPreventive = useCallback(async (ticketId: string) => {
    try {
      const { error } = await supabaseGarage.from('romaspa_tickets')
        .update({ 
            preventive_dismissed: true, 
            dismissed_at: new Date().toISOString() 
        })
        .eq('id', ticketId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error dismissing preventive:', error);
      throw error;
    }
  }, [fetchData]);

  const fetchSalaVentas = useCallback(async (days: number = 30) => {
    if (!companyId) return [];
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabaseGarage
        .from('romaspa_sala_ventas')
        .select('*')
        .eq('company_id', companyId)
        .gte('sold_at', since.toISOString())
        .order('sold_at', { ascending: false });
      if (error) throw error;
      const result = (data || []) as SalaVenta[];
      setSalaVentas(result);
      return result;
    } catch (error) {
      console.error('Error fetching sala ventas:', error);
      return [];
    }
  }, [companyId]);

  const addSalaVenta = useCallback(async (items: SalaVentaItem[], paymentMethod: PaymentMethod, notes?: string) => {
    if (!companyId) return;
    const total = items.reduce((acc, i) => acc + i.subtotal, 0);
    try {
      // 1. Insert the sale
      const { error } = await supabaseGarage.from('romaspa_sala_ventas').insert([{
        company_id: companyId,
        items,
        total,
        payment_method: paymentMethod,
        notes: notes || null,
        sold_at: new Date().toISOString()
      }]);
      if (error) throw error;

      // 2. Deduct stock for each item
      for (const item of items) {
        const part = parts.find(p => p.id === item.part_id);
        if (part) {
          const newStock = Math.max(0, part.stock - item.cantidad);
          await supabaseGarage.from('romaspa_parts')
            .update({ stock: newStock })
            .eq('id', item.part_id);
        }
      }

      // 3. Refresh data
      await Promise.all([fetchSalaVentas(), fetchData(true)]);
    } catch (error) {
      console.error('Error adding sala venta:', error);
      throw error;
    }
  }, [companyId, parts, fetchSalaVentas, fetchData]);

  return {
    tickets,
    mechanics,
    parts,
    customers,
    settings,
    reminders,
    notifications,
    loading,
    salaVentas,
    addTicket,
    updateTicketStatus,
    addMechanic,
    deleteMechanic,
    addPart,
    updatePart,
    deletePart,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    updateSettings,
    updateTicket,
    deleteTicket,
    uploadTicketPhoto,
    updateVehicle,
    deleteVehicle,
    addReminder,
    updateReminder,
    deleteReminder,
    markNotificationAsRead,
    acceptQuotation,
    clearFinishedTickets,
    dismissPreventive,
    refreshData: fetchData,
    searchTicket,
    searchTicketsHistory,
    fetchCompanies,
    addIntelligentReminder,
    fetchActiveReminder,
    fetchPublicSettingsBySlug,
    fetchOccupiedReminders,
    fetchPublicVehicleInfo,
    fetchSalaVentas,
    addSalaVenta
  };
}
