export type TicketStatus =
  | 'Ingresado'
  | 'En Espera'
  | 'En Mantención'
  | 'En Reparación'
  | 'Elevador 1'
  | 'Elevador 2'
  | 'Listo para Entrega'
  | 'Finalizado'
  | 'Entregado'; // Estado oculto para CRM

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia';
export type DocumentType = 'Boleta' | 'Factura';

export interface TicketHistoryEntry {
  status: TicketStatus;
  date: string; // ISO string
  user: string;
}

export interface ServiceLogEntry {
  date: string; // ISO de cuando se despachó o ingresó
  notes: string;
  parts: string[];
  cost?: number;
  mileage?: number;
  job_photos?: string[];
}

export interface ServiceItem {
  descripcion: string;
  costo: number;
  cantidad?: number; // Quantity, defaults to 1
  part_id?: string; // Optional link to inventory Part
}

export interface Ticket {
  id: string; // ID único (UUID o Patente Histórica)
  patente: string; // Placa del vehículo
  model: string;
  status: TicketStatus;
  mechanic_id: string | null;
  mechanic?: string; // Virtual field from join or local fallback
  entry_date: string; // ISO string
  last_status_change: string; // ISO string
  owner_name: string;
  owner_phone: string;
  notes: string;
  photo_url?: string;
  cost?: number; // Total real final
  quotation_total?: number;
  quotation_accepted?: boolean;
  parts_needed?: string[];
  close_date?: string; // ISO string
  vin?: string;
  engine_id?: string;
  mileage?: number;
  status_history?: TicketHistoryEntry[];
  service_log?: ServiceLogEntry[];
  vehicle_notes?: string;
  job_photos?: string[];
  services?: ServiceItem[];
  spare_parts?: ServiceItem[];
  preventive_dismissed?: boolean;
  dismissed_at?: string;
  created_at?: string;
  payment_method?: PaymentMethod;
  document_type?: DocumentType;
  customer_rating?: number;    // 1–5 estrellas (solo el día de creación)
  customer_feedback?: string;  // Comentario escrito del cliente
  rut_empresa?: string;
  razon_social?: string;
  email_empresa?: string;
  transfer_data?: string;
  is_completed_invoice?: boolean;
}

export interface Mechanic {
  id: string;
  name: string;
}

export interface Part {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  price: number;
  location?: string;
  assigned_to?: string; // Patente (Ticket ID)
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicles: string[]; // Array of Patentes
  last_visit: string; // ISO string
  last_mileage?: number;
  last_vin?: string;
  last_engine_id?: string;
  last_model?: string;
}

export interface Reminder {
  id: string;
  company_id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_model: string;
  patente: string;
  reminder_type: string;
  planned_date: string; // ISO string (Date only part)
  planned_time: string; // "HH:mm"
  completed: boolean;
  created_at: string;
}

export interface GarageNotification {
  id: string;
  company_id: string;
  ticket_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface GarageSettings {
  id: string;
  company_id: string;
  workshop_name: string;
  address: string;
  phone: string;
  whatsapp_template: string;
  logo_url?: string;
  logo_scale?: number;
  logo_x_offset?: number;
  logo_y_offset?: number;
  theme_menu_text?: string;
  theme_menu_highlight?: string;
  company_slug?: string;
  invoice_alert_time?: string;
  iva_percentage?: number;
}

// ─── Sala Ventas (Mostrador / POS) ───────────────────────────────────────────

export interface SalaVentaItem {
  part_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface SalaVenta {
  id: string;
  company_id: string;
  items: SalaVentaItem[];
  total: number;
  notes?: string;
  payment_method: PaymentMethod;
  document_type: DocumentType;
  sold_at: string; // ISO string
  created_at: string; // ISO string
  rut_empresa?: string;
  razon_social?: string;
  email_empresa?: string;
  transfer_data?: string;
  is_completed_invoice?: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
  is_blocked: boolean;
  created_at?: string;
}

export interface Garantia {
  id: string;
  company_id: string;
  fecha: string; // ISO string
  patente: string;
  nombre: string | null;
  detalle: string | null;
  monto: number;
  comentarios: string | null;
  created_at: string;
}
