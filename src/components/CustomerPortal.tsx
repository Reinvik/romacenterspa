import React from 'react';
import { Ticket, TicketStatus, GarageSettings, Reminder } from '../types';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Car, Clock, ArrowLeft, CheckCircle2, Wrench, Package, AlertCircle, MapPin, Camera, Image as ImageIcon, Calendar, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomerPortalProps {
  ticket: Ticket | null;
  reminder: Reminder | null;
  settings: GarageSettings | null;
  onBack: () => void;
  onAcceptQuotation: (id: string, model: string) => Promise<void>;
}

export function CustomerPortal({ ticket, reminder, settings, onBack, onAcceptQuotation }: CustomerPortalProps) {
  const [loading, setLoading] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);

  const primaryColor = settings?.theme_menu_highlight || '#D6A621';

  const safeFormatDate = (dateStr: string | undefined | null) => {
    try {
      if (!dateStr) return 'N/A';
      return format(parseISO(dateStr), "dd 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const safeFormatDateSimplified = (dateStr: string | undefined | null) => {
    try {
      if (!dateStr) return 'N/A';
      const date = parseISO(`${dateStr.substring(0, 10)}T00:00:00`);
      return format(date, "dd/MM/yyyy");
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  if (!ticket && !reminder) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-zinc-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Vehículo no encontrado</h2>
          <p className="text-zinc-500 mb-8">
            No encontramos ningún vehículo ni cita con esa patente en nuestro sistema. Por favor, verifica e intenta nuevamente.
          </p>
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl font-bold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (reminder && !ticket) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-8 px-4 font-sans">
        <div className="w-full max-w-2xl">
           <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 border border-zinc-200 shadow-inner flex items-center justify-center bg-black">
              <img src="/logo3.png" alt="Roma Center SPA" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">Roma Center SPA</h1>
            <p className="text-sm text-zinc-500 font-medium">Av. El Rosal 6065, Maipú</p>
          </div>

          <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-medium mb-8">
            <ArrowLeft className="w-5 h-5" /> Volver al Inicio
          </button>

          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden text-center p-12">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
               <Calendar className="w-10 h-10 text-amber-600" />
            </div>
            
            <h2 className="text-3xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Cita Programada</h2>
            <p className="text-zinc-500 mb-10 text-lg font-medium leading-relaxed">
              Tenemos registrada una visita para tu vehículo <strong>{reminder.vehicle_model}</strong> con patente <span className="text-zinc-900 font-bold">{reminder.patente}</span>.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-12">
              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest text-center">Fecha</p>
                <p className="text-lg font-bold text-zinc-900">
                  {reminder.planned_date ? safeFormatDateSimplified(reminder.planned_date) : 'Sin fecha'}
                </p>
              </div>
              <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest text-center">Hora estimada</p>
                <p className="text-lg font-bold text-zinc-900">
                  {reminder.planned_time} hrs
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100/50 mb-10 flex items-start gap-4 text-left">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 mb-1 leading-tight">Tu lugar está reservado</p>
                <p className="text-sm text-emerald-700/80 font-medium">¡Te esperamos! Recuerda traer tu vehículo a la hora señalada para garantizar la rapidez del servicio.</p>
              </div>
            </div>

            <a 
              href={`https://wa.me/56993578563?text=Hola,%20consulto%20por%20mi%20cita%20del%20${safeFormatDateSimplified(reminder.planned_date)}%20patente%20${reminder.patente}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-[24px] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95"
            >
              <Phone className="w-5 h-5" />
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }
  const primaryBg = primaryColor.startsWith('#') && primaryColor.length === 7 ? `${primaryColor}15` : 'rgba(16, 185, 129, 0.1)';

  const statusOrder: TicketStatus[] = [
    'Ingresado',
    'En Espera',
    'En Mantención',
    'Listo para Entrega',
    'Finalizado'
  ];

  const currentIndex = Math.max(0, statusOrder.indexOf(ticket.status));


  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-8 px-4 font-sans">
      <div className="w-full max-w-3xl">
        {/* Banner del Taller */}
        {settings && (
          <div className="text-center mb-6">
            {settings.logo_url && !logoError ? (
              <img 
                src={settings.logo_url} 
                alt={settings.workshop_name} 
                onError={() => setLogoError(true)}
                className="w-16 h-16 rounded-2xl mx-auto mb-3 border border-zinc-200 shadow-sm object-cover" 
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl mx-auto mb-3 border border-zinc-200 shadow-inner flex items-center justify-center bg-black">
                <img src="/logo3.png" alt="Roma Center SPA" className="w-16 h-16 object-contain" />
              </div>
            )}
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
              {settings.workshop_name}
            </h1>
            <p className="text-sm text-zinc-500 font-medium flex flex-col items-center justify-center gap-1 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Av. El Rosal 6065, Maipú
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400">Santiago, Chile</span>
            </p>
            
            {/* Botón WhatsApp */}
            <a 
              href="https://wa.me/56993578563" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full text-xs font-bold transition-all shadow-md hover:scale-105"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.559.925 3.33 1.414 5.14 1.415 5.4 0 9.793-4.393 9.795-9.794.001-2.618-1.02-5.08-2.88-6.941-1.86-1.86-4.321-2.881-6.942-2.881-5.4 0-9.792 4.392-9.795 9.794-.001 2.015.526 3.984 1.524 5.73l-.991 3.619 3.712-.974zm11.235-6.175c-.3-.149-1.771-.873-2.046-.973-.275-.1-.475-.149-.675.149-.2.299-.774.973-.948 1.172-.175.199-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.487-.89-.794-1.49-1.774-1.666-2.074-.175-.3-.019-.462.131-.611.135-.134.299-.349.449-.524.15-.174.199-.299.299-.498.1-.2.05-.374-.025-.524-.075-.149-.675-1.623-.925-2.221-.244-.588-.492-.51-.675-.519-.174-.009-.374-.01-.574-.01s-.524.075-.798.374c-.275.299-1.047 1.023-1.047 2.495s1.072 2.893 1.222 3.093c.15.199 2.11 3.221 5.111 4.516.714.308 1.271.492 1.706.63.717.228 1.369.196 1.885.119.574-.085 1.771-.724 2.021-1.422.25-.698.25-1.297.175-1.422-.075-.125-.275-.199-.575-.349z"/></svg>
              Conectar al WhatsApp
            </a>
          </div>
        )}

        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al inicio
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
          {/* Header */}
          <div className="bg-zinc-900 p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{ticket.model}</h1>
              </div>
              <p className="text-zinc-400 font-medium flex items-center gap-2">
                Patente: <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded-md tracking-wider leading-none" style={{ color: primaryColor }}>{ticket.id}</span>
              </p>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 min-w-[200px]">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1 text-center md:text-left">Estado Actual</p>
              <p className="text-xl font-bold flex items-center justify-center md:justify-start gap-2" style={{ color: primaryColor }}>
                {ticket.status === 'Finalizado' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                {ticket.status}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Progreso de la Reparación</h3>

            {/* Timeline */}
            <div className="relative mb-12">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-100 -translate-y-1/2 rounded-full"></div>
              <div
                className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(currentIndex / (statusOrder.length - 1)) * 100}%`,
                  backgroundColor: primaryColor 
                }}
              ></div>

              <div className="relative flex justify-between">
                {statusOrder.map((status, index) => {
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div key={status} className="flex flex-col items-center gap-3 w-24">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors z-10 bg-white",
                        isCompleted ? "z-20" : "border-zinc-200 text-zinc-300"
                      )} style={{ 
                        borderColor: isCompleted ? primaryColor : undefined,
                        color: isCompleted ? primaryColor : undefined,
                        backgroundColor: isCurrent ? primaryBg : undefined,
                        boxShadow: isCurrent ? `0 0 0 4px ${primaryBg}` : undefined
                      }}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                      </div>
                      <span className={cn(
                        "text-xs font-semibold text-center leading-tight",
                        isCurrent ? "font-bold" : (isCompleted ? "text-zinc-700" : "text-zinc-400")
                      )} style={{ color: isCurrent ? primaryColor : undefined }}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-2 mb-4 text-zinc-900 font-bold">
                  <Wrench className="w-5 h-5 text-zinc-500" />
                  Detalles del Ingreso
                </div>
                <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
                  {ticket.notes}
                </p>
                <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Ingresado el {safeFormatDate(ticket.entry_date)}
                </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-2 mb-4 text-zinc-900 font-bold">
                  <Package className="w-5 h-5 text-zinc-500" />
                  Repuestos Necesarios
                </div>
                {ticket.parts_needed && ticket.parts_needed.length > 0 ? (
                  <ul className="space-y-2">
                    {ticket.parts_needed.map((part, idx) => (
                      <li key={idx} className="text-sm text-zinc-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                        {part}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 italic">
                    Aún no se han definido repuestos o no son necesarios.
                  </p>
                )}
              </div>
            </div>

            {/* Quotation Section */}
            {ticket.status === 'En Espera' && ticket.quotation_total !== undefined && ticket.quotation_total > 0 && (
              <div className="mt-8 p-8 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-between gap-6" 
                   style={{ backgroundColor: primaryBg, borderColor: `${primaryColor}20` }}>
                <div className="text-center md:text-left">
                  <h4 className="font-bold text-xl mb-1" style={{ color: primaryColor }}>Cotización del Servicio</h4>
                  <p className="font-medium text-zinc-600">El diagnóstico está listo. Puedes autorizar el trabajo ahora.</p>
                </div>
                <div className="flex flex-col items-center md:items-end gap-3">
                  <div className="text-3xl font-black" style={{ color: primaryColor }}>
                    ${ticket.quotation_total.toLocaleString('es-CL')}
                  </div>
                  {ticket.quotation_accepted ? (
                    <div className="flex items-center gap-2 font-bold bg-white px-4 py-2 rounded-xl border shadow-sm"
                         style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>
                      <CheckCircle2 className="w-5 h-5" />
                      Cotización Aceptada
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await onAcceptQuotation(ticket.id, ticket.model);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full md:w-auto px-8 py-3 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
                    >
                      {loading ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Aceptar y Comenzar Reparación
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
