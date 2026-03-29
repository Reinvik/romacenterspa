import React, { useState } from 'react';
import { Ticket, TicketStatus, Mechanic, Reminder, PaymentMethod, DocumentType } from '../types';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MoreVertical, 
  Settings2, 
  AlertCircle, 
  CheckCircle2, 
  Clock3, 
  Wrench, 
  User, 
  Phone, 
  Info, 
  History, 
  X, 
  BarChart3, 
  RefreshCw,
  CalendarCheck,
  Trash2 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ConfirmModal } from './ConfirmModal';
import { KanbanTicketCard } from './KanbanTicketCard';
import { TicketHistoryModal } from './TicketHistoryModal';
import { VehicleCRMModal } from './VehicleCRMModal';
import { KanbanReminderCard } from './KanbanReminderCard';
import { GarageSettings } from '../types';
import { FinishTicketModal } from './FinishTicketModal';

interface KanbanBoardProps {
  tickets: Ticket[];
  mechanics: Mechanic[];
  onUpdateStatus: (id: string, status: TicketStatus, changedBy?: string, paymentMethod?: PaymentMethod, documentType?: DocumentType) => void;
  onShowHistory?: (ticket: Ticket) => void;
  onShowCRM?: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  onDeleteTicket?: (id: string) => Promise<void>;
  onAddTicket: () => void;
  onClearFinished: () => Promise<void>;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onPromoteReminder?: (reminder: Reminder, targetStatus: TicketStatus) => Promise<void>;
  reminders?: Reminder[];
  settings: GarageSettings | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewDate: string;
  setViewDate: (date: string) => void;
  isMonitorMode?: boolean;
  setIsMonitorMode?: (val: boolean) => void;
}

const COLUMNS: { id: string; label: string; color: string; statuses: TicketStatus[] }[] = [
  { id: 'por-atender', label: 'Por Atender', color: 'bg-zinc-200 text-zinc-700', statuses: ['Ingresado', 'En Espera'] },
  { id: 'mantencion', label: 'En Mantención', color: 'bg-blue-100 text-blue-800', statuses: ['Elevador 1', 'Elevador 2', 'En Mantención', 'En Reparación'] },
  { id: 'Listo para Entrega', label: 'Listo para Entrega', color: 'bg-emerald-100 text-emerald-800', statuses: ['Listo para Entrega'] },
  { id: 'Finalizado', label: 'Finalizado', color: 'bg-zinc-800 text-zinc-300', statuses: ['Finalizado'] },
];

export function KanbanBoard({ 
  tickets, 
  mechanics, 
  onUpdateStatus, 
  onEditTicket, 
  onDeleteTicket,
  onAddTicket, 
  onClearFinished, 
  onUpdateNotes,
  onPromoteReminder,
  reminders = [],
  settings,
  searchTerm,
  setSearchTerm,
  viewDate,
  setViewDate,
  isMonitorMode = false,
  setIsMonitorMode
}: KanbanBoardProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<string | null>(null);
  const [historyTicket, setHistoryTicket] = useState<Ticket | null>(null);
  const [crmTicket, setCrmTicket] = useState<Ticket | null>(null);
  const [deleteConfirmTicket, setDeleteConfirmTicket] = useState<Ticket | null>(null);

  const filteredTickets = tickets.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = t.owner_name.toLowerCase().includes(searchLower) ||
                        t.owner_phone.includes(searchTerm) ||
                        t.model.toLowerCase().includes(searchLower) ||
                        (t.patente || t.id).toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;

    const getEffectiveDate = (ticket: any) => {
      // PRIORITY: If last_status_change is more recent than close_date,
      // it means the ticket was worked on recently (e.g., migrated tickets with old close_dates)
      const closeStr = ticket.close_date?.split('T')[0] || '';
      const lastChangeStr = ticket.last_status_change?.split('T')[0] || '';
      
      if (lastChangeStr && closeStr && lastChangeStr > closeStr) {
        return lastChangeStr;
      }
      
      if (closeStr) return closeStr;

      if (ticket.service_log && ticket.service_log.length > 0) {
        const logDates = ticket.service_log
          .map((s: any) => {
            const match = s.date?.match(/\d{4}-\d{2}-\d{2}/);
            return match ? match[0] : null;
          })
          .filter(Boolean)
          .sort((a: string, b: string) => b.localeCompare(a));
        
        if (logDates.length > 0) return logDates[0];
      }

      return (ticket.last_status_change || ticket.entry_date || format(new Date(), 'yyyy-MM-dd')).split('T')[0];
    };

    const isFinished = t.status === 'Finalizado' || t.status === 'Entregado';
    const completionDate = getEffectiveDate(t);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isViewingToday = viewDate === todayStr;

    // RULE 1: If viewing "Today", show all "Active" tickets (they represent current load)
    if (isViewingToday && !isFinished) return true;

    // RULE 2: If viewing a specific date, show tickets that were active OR finished on that day
    return completionDate === viewDate;
  }).sort((a, b) => {
    const dateA = new Date(a.entry_date).getTime();
    const dateB = new Date(b.entry_date).getTime();
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  const [softLockPending, setSoftLockPending] = useState<{id: string, status: TicketStatus, mechanic: string} | null>(null);
  const [finishConfirmPending, setFinishConfirmPending] = useState<{id: string, action: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTicketId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const reminderId = e.dataTransfer.getData('application/reminder-id');
    const userAction = selectedMechanic || 'Recepción/Admin';

    if (reminderId && onPromoteReminder) {
      const reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
        let targetStatus: TicketStatus = statusId as TicketStatus;
        if (statusId === 'por-atender') targetStatus = 'En Espera';
        onPromoteReminder(reminder, targetStatus);
      }
      setDraggedTicketId(null);
      return;
    }

    if (id && draggedTicketId === id) {
      const ticket = tickets.find(t => t.id === id);
      
      let targetStatus: TicketStatus = statusId as TicketStatus;
      if (statusId === 'por-atender') targetStatus = 'En Espera';

      // 1-ticket limit for Elevators
      if (targetStatus === 'Elevador 1' || targetStatus === 'Elevador 2') {
        const existingInSlot = tickets.filter(t => 
          (targetStatus === 'Elevador 1' ? ['Elevador 1', 'En Mantención', 'En Reparación'].includes(t.status) : t.status === 'Elevador 2')
        );
        
        // If slot is full and it's not the same ticket moving within the same logic
        if (existingInSlot.length >= 1 && !existingInSlot.some(t => t.id === id)) {
          // You could add a toast here if available
          setDraggedTicketId(null);
          return;
        }
      }

      if (targetStatus === 'Finalizado') {
        const ticket = tickets.find(t => t.id === id);
        if (ticket && ticket.status !== 'Finalizado') {
          setFinishConfirmPending({ id, action: userAction });
          return;
        }
      }

      if (ticket && selectedMechanic && ticket.mechanic !== selectedMechanic && ticket.mechanic !== 'Sin asignar') {
        setSoftLockPending({ id, status: targetStatus, mechanic: ticket.mechanic });
      } else {
        onUpdateStatus(id, targetStatus, userAction);
      }
    }
    setDraggedTicketId(null);
  };

  const filteredReminders = reminders.filter(r => {
    const rDate = r.planned_date.includes('T') ? r.planned_date : `${r.planned_date}T00:00:00`;
    const isSameDay = format(parseISO(rDate), 'yyyy-MM-dd') === viewDate;
    if (!isSameDay || r.completed) return false;

    if (searchTerm.length >= 2) {
      const searchLower = searchTerm.toLowerCase();
      return r.customer_name.toLowerCase().includes(searchLower) ||
             r.customer_phone.includes(searchTerm) ||
             r.patente.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const renderTicketList = (columnTickets: Ticket[], dropStatus?: string, label?: string) => {
    const groups: Record<string, Ticket[]> = {};
    columnTickets.forEach(t => {
      // Use the SAME logic as the filter above to determine the grouping date
      const closeStr = t.close_date?.split('T')[0] || '';
      const lastChangeStr = t.last_status_change?.split('T')[0] || '';
      
      let dateForGrouping = '';
      if (lastChangeStr && closeStr && lastChangeStr > closeStr) {
        dateForGrouping = lastChangeStr;
      } else if (closeStr) {
        dateForGrouping = closeStr;
      } else if (t.service_log && t.service_log.length > 0) {
        const logDates = t.service_log
          .map(s => s.date?.match(/\d{4}-\d{2}-\d{2}/)?.[0])
          .filter(Boolean)
          .sort((a, b) => b!.localeCompare(a!));
        if (logDates.length > 0) dateForGrouping = logDates[0]!;
      }

      if (!dateForGrouping) {
        dateForGrouping = (t.last_status_change || t.entry_date || todayStr).split('T')[0];
      }

      // Final fallback/force for 2026 tickets with 2025 dates (migration logic)
      const ticketCreatedStr = t.created_at || '';
      if (ticketCreatedStr >= '2026-03-01' && dateForGrouping < '2026-03-01') {
        dateForGrouping = ticketCreatedStr.split('T')[0];
      }

      const day = dateForGrouping || todayStr;
      if (!groups[day]) groups[day] = [];
      groups[day].push(t);
    });
    const sortedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return (
      <div 
        className={cn(
          "flex-1 overflow-y-auto space-y-4 min-h-[150px] transition-all duration-200",
          dropStatus && "p-2 rounded-xl border-2 border-dashed border-zinc-200/50 hover:border-blue-400/50 hover:bg-blue-50/20 bg-zinc-50/50"
        )}
        onDragOver={dropStatus ? handleDragOver : undefined}
        onDrop={dropStatus ? (e) => handleDrop(e, dropStatus) : undefined}
      >
        {label && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
            <span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-bold">{columnTickets.length}</span>
          </div>
        )}
        {sortedDays.map(day => (
          <div key={day} className="space-y-2">
            <div className="flex items-center gap-2 sticky top-0 bg-transparent backdrop-blur-sm py-1 z-10">
              <div className="h-px flex-1 bg-zinc-300/50"></div>
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                {day === todayStr ? 'Hoy' : format(parseISO(day), "d 'de' MMM", { locale: es })}
              </span>
              <div className="h-px flex-1 bg-zinc-300/50"></div>
            </div>
            {groups[day].map((ticket) => (
              <KanbanTicketCard
                key={ticket.id}
                ticket={ticket}
                settings={settings}
                selectedMechanic={selectedMechanic}
                isDragged={draggedTicketId === ticket.id}
                onDragStart={handleDragStart}
                onEdit={onEditTicket}
                onDelete={(t) => setDeleteConfirmTicket(t)}
                onShowHistory={setHistoryTicket}
                onShowCRM={setCrmTicket}
              />
            ))}
          </div>
        ))}
        {columnTickets.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-200/30 rounded-xl text-zinc-400 text-[10px] font-bold uppercase tracking-widest py-8">
            Arrastra aquí
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* ── Toolbar: Zoom + Monitor Toggle ───────────────────── */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-2 mb-2 flex-shrink-0 px-1",
        isMonitorMode && "fixed bottom-6 left-6 z-50 mb-0 px-0 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-zinc-200 shadow-2xl opacity-40 hover:opacity-100 transition-all duration-300 scale-90",
        !isMonitorMode && "sm:flex hidden"
      )}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.4, +(prev - 0.1).toFixed(1)))}
              className="px-1.5 py-0.5 hover:bg-white rounded transition-colors text-zinc-600 text-xs font-bold"
            >−</button>
            <span className="text-[9px] font-black font-mono w-8 text-center text-zinc-500 select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1, +(prev + 0.1).toFixed(1)))}
              className="px-1.5 py-0.5 hover:bg-white rounded transition-colors text-zinc-600 text-xs font-bold"
            >+</button>
          </div>

          <button
            onClick={() => setIsMonitorMode?.(!isMonitorMode)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border shadow-sm bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
          >
            <BarChart3 className="w-3 h-3" />
            {isMonitorMode ? 'Salir Monitor' : 'Monitor'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto relative scrollbar-hide snap-x snap-mandatory lg:snap-none">
        <div
          className={cn(
            "h-full min-w-max transition-transform duration-300 ease-out origin-top-left",
            zoomLevel !== 1 ? "absolute inset-0" : "flex flex-col relative"
          )}
          style={zoomLevel !== 1 ? {
            transform: `scale(${zoomLevel})`,
            width: `${(1 / zoomLevel) * 100}%`,
            height: `${(1 / zoomLevel) * 100}%`,
          } : undefined}
        >
          {mechanics.length > 0 && (
            <div className="flex justify-start sm:justify-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide flex-shrink-0 w-full px-2">
              <button
                onClick={() => setSelectedMechanic(null)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border",
                  selectedMechanic === null
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                )}
              >
                Todos
              </button>
              {mechanics.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMechanic(selectedMechanic === m.name ? null : m.name)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border",
                    selectedMechanic === m.name
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                      : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px]",
                    selectedMechanic === m.name ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-500"
                  )}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  {m.name}
                </button>
              ))}
            </div>
          )}

          {/* Columns row */}
          <div className="flex gap-2 lg:gap-3 px-2 lg:px-0 h-full pb-2">
            {/* Agenda column */}
            <div className="flex-1 min-w-[240px] max-w-[280px] sm:min-w-[200px] bg-amber-50/50 rounded-xl p-2 sm:p-3 flex flex-col border border-amber-200/40 snap-center lg:snap-align-none">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800">
                    Agenda
                  </span>
                  <span className="text-xs font-medium text-amber-600 bg-white px-1.5 py-0.5 rounded-full shadow-sm border border-amber-200">
                    {filteredReminders.length}
                  </span>
                </div>
                <CalendarCheck className="w-4 h-4 text-amber-300" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-[150px]">
                {filteredReminders
                  .sort((a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime())
                  .map((reminder) => (
                    <KanbanReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      settings={settings}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/reminder-id', reminder.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    />
                  ))}
                {filteredReminders.length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-amber-200/50 rounded-xl text-amber-400 text-xs font-medium">
                    Sin citas...
                  </div>
                )}
              </div>
            </div>

            {/* Kanban status columns */}
            {COLUMNS.map((column) => {
              const columnTickets = filteredTickets.filter((t) => column.statuses.includes(t.status));

              if (column.id === 'mantencion') {
                const e1Tickets = columnTickets.filter(t => ['Elevador 1', 'En Mantención', 'En Reparación'].includes(t.status));
                const e2Tickets = columnTickets.filter(t => t.status === 'Elevador 2');

                return (
                  <div
                    key={column.id}
                    className="flex-1 min-w-[280px] bg-zinc-100/30 rounded-2xl p-3 flex flex-col border border-zinc-200/50 snap-center lg:snap-align-none shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm", column.color)}>
                          {column.label}
                        </span>
                        <span className="text-xs font-bold text-zinc-500 bg-white px-2 py-0.5 rounded-full shadow-sm border border-zinc-200">
                          {columnTickets.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 flex-1">
                      {/* Elevador 1 Slot */}
                      <div className={cn(
                        "flex-1 flex flex-col min-h-[140px] rounded-xl border-2 border-dashed transition-all p-2",
                        e1Tickets.length > 0 ? "border-blue-200 bg-blue-50/20" : "border-zinc-200 bg-zinc-50/50"
                      )}>
                        <div className="flex items-center justify-between mb-1 px-1">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Elevador 1</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            e1Tickets.length >= 1 ? "bg-amber-100 text-amber-700" : "bg-zinc-200 text-zinc-500"
                          )}>
                            {e1Tickets.length}/1
                          </span>
                        </div>
                        {renderTicketList(e1Tickets, 'Elevador 1')}
                      </div>

                      {/* Elevador 2 Slot */}
                      <div className={cn(
                        "flex-1 flex flex-col min-h-[140px] rounded-xl border-2 border-dashed transition-all p-2",
                        e2Tickets.length > 0 ? "border-indigo-200 bg-indigo-50/20" : "border-zinc-200 bg-zinc-50/50"
                      )}>
                        <div className="flex items-center justify-between mb-1 px-1">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Elevador 2</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            e2Tickets.length >= 1 ? "bg-amber-100 text-amber-700" : "bg-zinc-200 text-zinc-500"
                          )}>
                            {e2Tickets.length}/1
                          </span>
                        </div>
                        {renderTicketList(e2Tickets, 'Elevador 2')}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={column.id}
                  className="flex-1 min-w-[260px] max-w-[300px] bg-zinc-100/30 rounded-2xl p-4 flex flex-col border border-zinc-200/50 snap-center lg:snap-align-none shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm", column.color)}>
                        {column.label}
                      </span>
                      <span className="text-xs font-bold text-zinc-500 bg-white px-2 py-0.5 rounded-full shadow-sm border border-zinc-200">
                        {columnTickets.length}
                      </span>
                    </div>
                    {column.id === 'Finalizado' && columnTickets.length > 0 && (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        disabled={clearing}
                        title="Limpiar finalizados"
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                      >
                        <Trash2 className={cn("w-4 h-4", clearing && "animate-spin")} />
                      </button>
                    )}
                  </div>

                  {renderTicketList(columnTickets, column.id === 'por-atender' ? 'por-atender' : column.id)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        title="Limpiar Finalizados"
        message={`¿Estás seguro que deseas eliminar los tickets finalizados? Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          setClearing(true);
          try { await onClearFinished(); } finally { setClearing(false); }
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <FinishTicketModal
        isOpen={!!finishConfirmPending}
        onConfirm={(method, documentType) => {
          if (finishConfirmPending) {
            onUpdateStatus(finishConfirmPending.id, 'Finalizado', finishConfirmPending.action, method, documentType);
            setFinishConfirmPending(null);
          }
        }}
        onCancel={() => setFinishConfirmPending(null)}
      />

      <ConfirmModal
        isOpen={!!softLockPending}
        title="Confirmar Movimiento"
        message={`Este vehículo está asignado a ${softLockPending?.mechanic}. ¿Confirmas el movimiento?`}
        onConfirm={() => {
          if (softLockPending) {
            onUpdateStatus(softLockPending.id, softLockPending.status, selectedMechanic || 'Recepción/Admin');
            setSoftLockPending(null);
          }
        }}
        onCancel={() => setSoftLockPending(null)}
      />

      <TicketHistoryModal
        isOpen={historyTicket !== null}
        onClose={() => setHistoryTicket(null)}
        ticket={historyTicket}
      />

      <VehicleCRMModal
        isOpen={crmTicket !== null}
        onClose={() => setCrmTicket(null)}
        ticket={crmTicket}
        onUpdateNotes={onUpdateNotes}
      />

      <ConfirmModal
        isOpen={!!deleteConfirmTicket}
        title="Eliminar Ticket"
        message={`¿Estás seguro que deseas eliminar el ticket ${deleteConfirmTicket?.patente || deleteConfirmTicket?.id} (${deleteConfirmTicket?.model})? Esta acción es permanente y solo debe usarse para tickets mal creados.`}
        onConfirm={async () => {
          if (deleteConfirmTicket && onDeleteTicket) {
            setIsDeleting(true);
            try {
              await onDeleteTicket(deleteConfirmTicket.id);
            } finally {
              setIsDeleting(false);
              setDeleteConfirmTicket(null);
            }
          }
        }}
        onCancel={() => setDeleteConfirmTicket(null)}
      />
    </div>
  );
}
