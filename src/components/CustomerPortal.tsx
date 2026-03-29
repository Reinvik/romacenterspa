import React from 'react';
import { Ticket, TicketStatus, GarageSettings, Reminder } from '../types';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Car, Clock, ArrowLeft, CheckCircle2, Wrench, Package, AlertCircle, MapPin, Camera, Image as ImageIcon, Calendar, Phone, RotateCw, History } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomerPortalProps {
  ticket: Ticket | null;
  allTickets?: Ticket[];
  reminder: Reminder | null;
  settings: GarageSettings | null;
  onBack: () => void;
  onAcceptQuotation: (id: string, model: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function CustomerPortal({ ticket, allTickets = [], reminder, settings, onBack, onAcceptQuotation, onRefresh }: CustomerPortalProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
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
      const isoDate = dateStr.substring(0, 10);
      const today = format(new Date(), 'yyyy-MM-dd');

      if (isoDate === today) {
        return 'Hoy';
      }

      const date = parseISO(`${isoDate}T00:00:00`);
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
        <div className="w-full max-w-4xl">
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

  const displaySteps = [
    'Ingresado',
    'Mantención',
    'Listo para Entrega',
    'Finalizado'
  ];

  const getStepIndex = (status: TicketStatus) => {
    switch (status) {
      case 'Ingresado':
      case 'En Espera':
        return 0;
      case 'En Mantención':
      case 'En Reparación':
      case 'Elevador 1':
      case 'Elevador 2':
        return 1;
      case 'Listo para Entrega':
        return 2;
      case 'Finalizado':
      case 'Entregado':
        return 3;
      default:
        return 0;
    }
  };

  // Ordenar tickets por fecha de entrada descendente (más reciente arriba)
  const sortedTickets = [...allTickets].sort((a, b) => {
    const dateA = a.entry_date ? parseISO(a.entry_date).getTime() : 0;
    const dateB = b.entry_date ? parseISO(b.entry_date).getTime() : 0;
    return dateB - dateA;
  });

  // El ticket actual es el primero de la lista (el más reciente) o el pasado por prop
  const displayTicket = sortedTickets[0] || ticket;

  if (!displayTicket) return null;

  const currentIndex = getStepIndex(displayTicket.status);


  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-4 px-4 font-sans">
      <div className="w-full max-w-6xl">
        {/* Banner del Taller Optimizado */}
        <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-4 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {settings?.logo_url && !logoError ? (
              <img 
                src={settings.logo_url} 
                alt={settings.workshop_name} 
                onError={() => setLogoError(true)}
                className="w-12 h-12 rounded-xl border border-zinc-100 shadow-sm object-cover" 
              />
            ) : (
              <div className="w-12 h-12 rounded-xl border border-zinc-200 shadow-inner flex items-center justify-center bg-black">
                <img src="/logo3.png" alt="Roma Center SPA" className="w-8 h-8 object-contain" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight text-zinc-900 uppercase leading-none">
                {settings?.workshop_name || 'Roma Center SPA'}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                <MapPin className="w-3 h-3" />
                Av. El Rosal 6065, Maipú
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button
              onClick={onBack}
              className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-50 transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <a 
              href="https://wa.me/56993578563" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] rounded-full text-[11px] font-black uppercase tracking-wider transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
          {/* Header */}
          {/* Header con displayTicket */}
          <div className="bg-zinc-900 p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            {onRefresh && (
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await onRefresh();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-all active:scale-95 disabled:opacity-50"
                title="Actualizar estado"
              >
                <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{displayTicket.model}</h1>
              </div>
              <p className="text-zinc-400 font-medium flex items-center gap-2">
                Patente: <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded-md tracking-wider leading-none" style={{ color: primaryColor }}>{displayTicket.patente || displayTicket.id}</span>
              </p>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 min-w-[200px]">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1 text-center md:text-left">Reporte Actual</p>
              <p className="text-xl font-bold flex items-center justify-center md:justify-start gap-2" style={{ color: primaryColor }}>
                {displayTicket.status === 'Finalizado' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                {displayTicket.status}
              </p>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 uppercase tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-400" />
              Estado del Reporte
            </h3>
            
            {/* ... Rest of the existing ticket content ... */}
            <div className="relative mb-12">
              {/* (Existing Timeline UI) */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-100 -translate-y-1/2 rounded-full"></div>
              <div
                className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(currentIndex / (displaySteps.length - 1)) * 100}%`,
                  backgroundColor: primaryColor 
                }}
              ></div>

              <div className="relative flex justify-between">
                {displaySteps.map((status, index) => {
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div key={status} className="flex flex-col items-center gap-3 w-20 md:w-24">
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
                        "text-[10px] md:text-xs font-semibold text-center leading-tight",
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
                  Observaciones Técnicas
                </div>
                <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
                  {displayTicket.notes}
                </p>
                <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Apertura: {safeFormatDate(displayTicket.entry_date)}
                </div>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4 text-zinc-900 font-bold">
                  <Package className="w-5 h-5 text-zinc-500" />
                  Repuestos y Materiales
                </div>
                <div className="flex-1">
                  {displayTicket.spare_parts && displayTicket.spare_parts.length > 0 ? (
                    <div className="space-y-3">
                      {displayTicket.spare_parts.map((part, idx) => (
                        <div key={idx} className="flex justify-between items-center group">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            <span className="text-sm text-zinc-600 font-medium">
                              {part.descripcion}
                              {part.cantidad && part.cantidad > 1 && (
                                <span className="ml-2 text-xs font-bold text-zinc-400">x{part.cantidad}</span>
                              )}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-zinc-900">
                            ${((part.costo || 0) * (part.cantidad || 1)).toLocaleString('es-CL')}
                          </span>
                        </div>
                      ))}
                      <div className="pt-3 border-t border-zinc-100 flex justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Repuestos</span>
                          <div className="text-sm font-black text-zinc-900">
                            ${displayTicket.spare_parts.reduce((acc, curr) => acc + (curr.costo || 0) * (curr.cantidad || 1), 0).toLocaleString('es-CL')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : displayTicket.parts_needed && displayTicket.parts_needed.length > 0 ? (
                    <ul className="space-y-2">
                      {displayTicket.parts_needed.map((part, idx) => (
                        <li key={idx} className="text-sm text-zinc-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                          {part}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">
                      Sin repuestos registrados.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Nueva Sección: Servicios y Costos */}
            {displayTicket.services && displayTicket.services.length > 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                <div className="p-4 border-b border-zinc-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-tight">Servicios Detallados</h3>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {displayTicket.services.map((service, idx) => (
                      <div key={idx} className="flex justify-between items-center group">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform"></div>
                          <span className="text-sm text-zinc-600 font-medium">
                            {service.descripcion}
                            {service.cantidad && service.cantidad > 1 && (
                              <span className="ml-2 text-xs font-bold text-emerald-500/60">x{service.cantidad}</span>
                            )}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-zinc-900">
                          ${((service.costo || 0) * (service.cantidad || 1)).toLocaleString('es-CL')}
                        </span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-zinc-100 flex justify-end">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-400 uppercase">Total Servicios</span>
                        <div className="text-lg font-black text-emerald-600">
                          ${displayTicket.services.reduce((acc, curr) => acc + (curr.costo || 0) * (curr.cantidad || 1), 0).toLocaleString('es-CL')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Evidencia Fotográfica con displayTicket */}
            {displayTicket.job_photos && displayTicket.job_photos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden mt-6">
                <div className="p-4 border-b border-zinc-50 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-tight">Evidencia Fotográfica</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {displayTicket.job_photos.map((photo, index) => (
                      <a 
                        key={index} 
                        href={photo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="aspect-square rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 group transition-all hover:ring-2 hover:ring-emerald-500/20"
                      >
                        <img 
                          src={photo} 
                          alt={`Evidencia ${index + 1}`} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Historial de Reportes Antiguos Expandido */}
        {sortedTickets.length > 1 && (
          <div className="mt-12 space-y-8">
            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-widest flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                <History className="w-4 h-4 text-white" />
              </div>
              Historial de Servicios Anteriores
            </h3>
            
            <div className="space-y-6">
              {sortedTickets.slice(1).map((histTicket, idx) => (
                <div key={idx} className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden border-l-4" style={{ borderLeftColor: primaryColor }}>
                  <div className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                          <ImageIcon className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 leading-tight">Servicio del {safeFormatDate(histTicket.entry_date)}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md tracking-wider">
                              {histTicket.status}
                            </span>
                            {histTicket.mileage && (
                              <span className="text-[10px] font-black uppercase text-zinc-400">
                                {histTicket.mileage.toLocaleString('es-CL')} KM
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Inversión</p>
                        <p className="text-xl font-black text-zinc-900">
                           ${(
                             (histTicket.services?.reduce((acc, s) => acc + (s.costo || 0) * (s.cantidad || 1), 0) || 0) + 
                             (histTicket.spare_parts?.reduce((acc, s) => acc + (s.costo || 0) * (s.cantidad || 1), 0) || 0)
                           ).toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Notas del Historial */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Observaciones</p>
                         <p className="text-xs text-zinc-600 leading-relaxed italic">
                           {histTicket.notes || 'Sin observaciones registradas.'}
                         </p>
                      </div>

                      {/* Servicios del Historial */}
                      <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
                         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Servicios Realizados</p>
                         {histTicket.services && histTicket.services.length > 0 ? (
                           <ul className="space-y-1.5">
                             {histTicket.services.map((s, si) => (
                               <li key={si} className="text-xs text-zinc-600 flex justify-between">
                                 <span className="font-medium">
                                   • {s.descripcion}
                                   {s.cantidad && s.cantidad > 1 && (
                                     <span className="ml-1 text-[10px] font-bold text-zinc-400">x{s.cantidad}</span>
                                   )}
                                 </span>
                                 <span className="text-zinc-400 font-bold">${((s.costo || 0) * (s.cantidad || 1)).toLocaleString('es-CL')}</span>
                               </li>
                             ))}
                           </ul>
                         ) : (
                           <p className="text-[10px] text-zinc-400 italic">No hay servicios detallados.</p>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
