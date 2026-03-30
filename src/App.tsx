import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Layout } from './components/Layout';
import { format } from 'date-fns';
import { KanbanBoard } from './components/KanbanBoard';
import { AddTicketModal } from './components/AddTicketModal';
import { Login } from './components/Login';
import { CustomerPortal } from './components/CustomerPortal';
import { Inventory } from './components/Inventory';
import { Customers } from './components/Customers';
import { useGarageStore } from './hooks/useGarageStore';
import { useAuth } from './hooks/useAuth';
import { UsersAdmin } from './components/UsersAdmin';
import { Ticket, Reminder, TicketStatus } from './types';

import { Mechanics } from './components/Mechanics';
import { AddMechanicModal } from './components/AddMechanicModal';
import { EditTicketModal } from './components/EditTicketModal';
import { SettingsForm } from './components/SettingsForm';
import { Agenda } from './components/Agenda';
import { PublicBookingModal } from './components/PublicBookingModal';
import { LandingPage } from './components/LandingPage';
import { Sales } from './components/Sales';
import { SalaVentas } from './components/SalaVentas';
import { AIConsultant } from './components/AIConsultant';

type ViewState = 'landing' | 'login' | 'customer' | 'dashboard';

export default function App() {
  const [view, setView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('roma_garage_view');
    return (saved as ViewState) || 'landing';
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('roma_garage_tab') || 'dashboard';
  });
  
  useEffect(() => {
    localStorage.setItem('roma_garage_view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('roma_garage_tab', activeTab);
  }, [activeTab]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMechanicModalOpen, setIsAddMechanicModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [publicBranding, setPublicBranding] = useState<any>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [searchedPatente, setSearchedPatente] = useState<string | null>(null);
  const [currentCustomerTicket, setCurrentCustomerTicket] = useState<Ticket | null>(null);
  const [currentCustomerTickets, setCurrentCustomerTickets] = useState<Ticket[]>([]);
  const [currentCustomerReminder, setCurrentCustomerReminder] = useState<Reminder | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isMonitorMode, setIsMonitorMode] = useState(false);

  const { isSuperAdmin, profile } = useAuth();

  const {
    // Garage operations
    tickets, mechanics, parts, customers, settings, loading, reminders, notifications,
    addTicket, updateTicketStatus, updateTicket, searchTicket,
    addPart, updatePart, deletePart,
    addCustomer, updateCustomer, deleteCustomer,
    updateVehicle, deleteVehicle,
    updateSettings,
    addMechanic, deleteMechanic,
    acceptQuotation, markNotificationAsRead,
    clearFinishedTickets, deleteTicket,
    searchTicketsHistory,
    fetchCompanies, addIntelligentReminder, fetchActiveReminder, fetchPublicSettingsBySlug, fetchOccupiedReminders, fetchPublicVehicleInfo,
    addReminder, deleteReminder, updateReminder, refreshData, uploadTicketPhoto,
    salaVentas, addSalaVenta, fetchSalaVentas,
    saveCustomerFeedback
  } = useGarageStore(profile?.company_id);

  // Monitor Mode Auto-refresh
  useEffect(() => {
    let interval: any;
    if (isMonitorMode && activeTab === 'dashboard') {
      interval = setInterval(() => {
        refreshData();
      }, 10000); // 10 seconds
    }
    return () => clearInterval(interval);
  }, [isMonitorMode, activeTab, refreshData]);

  useEffect(() => {
    // Detect public branding from URL slug (?t=slug)
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('t') || 'roma-spa';
    if (slug) {
      fetchPublicSettingsBySlug(slug).then(data => {
        setPublicBranding(data || {
          theme_menu_highlight: '#D6A621',
          theme_menu_text: '#a1a1aa',
          workshop_name: 'Roma Center SPA'
        });
      }).catch(err => {
        console.error('Error fetching public branding:', err);
        setPublicBranding({
          theme_menu_highlight: '#D6A621',
          theme_menu_text: '#a1a1aa',
          workshop_name: 'Roma Center SPA'
        });
      });
    }
  }, [fetchPublicSettingsBySlug]);

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsEditModalOpen(true);
  };

  const handleLogin = () => {
    setView('dashboard');
  };

  const handleCustomerSearch = async (patenteOrPhone: string) => {
    try {
      const tickets = await searchTicketsHistory(patenteOrPhone);
      const reminder = await fetchActiveReminder(patenteOrPhone);

      if (tickets.length > 0) {
        // Ordenar: No finalizados primero, luego por fecha de creación desc
        const sorted = [...tickets].sort((a, b) => {
          if (a.status !== 'Finalizado' && b.status === 'Finalizado') return -1;
          if (a.status === 'Finalizado' && b.status !== 'Finalizado') return 1;
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        
        setCurrentCustomerTickets(sorted);
        setCurrentCustomerTicket(sorted[0]);
        setCurrentCustomerReminder(null);
        setView('customer');
      } else if (reminder) {
        setCurrentCustomerReminder(reminder);
        setCurrentCustomerTicket(null);
        setCurrentCustomerTickets([]);
        setView('customer');
      } else {
        alert('No se encontró información para esa patente o teléfono.');
      }
    } catch (err) {
      console.error('Error in customer search:', err);
    }
  };

  const handleRefreshPortal = async () => {
    const identifier = currentCustomerTicket?.patente || currentCustomerTicket?.id || currentCustomerReminder?.patente;
    if (identifier) {
      await handleCustomerSearch(identifier);
    }
  };

  const handleBackToLogin = () => {
    setView('landing');
    setSearchedPatente(null);
    setCurrentCustomerTicket(null);
    setCurrentCustomerReminder(null);
    setActiveTab('dashboard');
  };

  const handlePromoteReminder = async (reminder: Reminder, targetStatus: TicketStatus) => {
    try {
      await addTicket({
        id: reminder.patente,
        model: reminder.vehicle_model,
        owner_name: reminder.customer_name,
        owner_phone: reminder.customer_phone,
        status: targetStatus,
        notes: `Cita Programada: ${reminder.reminder_type}. Agendada para ${new Date(reminder.planned_date).toLocaleString()}`
      });
      await updateReminder(reminder.id, { completed: true });
    } catch (err) {
      console.error('Error promoting reminder to ticket:', err);
      alert('Error al convertir la cita en ticket activo.');
    }
  };

  if (view === 'landing') {
    return (
      <LandingPage 
        onPortalAccess={() => setView('login')}
        onAdminAccess={handleLogin}
        onCustomerSearch={handleCustomerSearch}
        fetchCompanies={fetchCompanies}
        onAddReminder={addIntelligentReminder}
        fetchOccupied={fetchOccupiedReminders}
        fetchVehicleInfo={fetchPublicVehicleInfo}
        branding={publicBranding}
      />
    );
  }

  if (view === 'login') {
    return (
      <>
        <Login 
          onLogin={handleLogin} 
          onCustomerSearch={handleCustomerSearch} 
          onOpenBooking={() => setIsBookingModalOpen(true)}
          branding={publicBranding}
        />
        <PublicBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          fetchCompanies={fetchCompanies}
          onAddReminder={addIntelligentReminder}
          fetchOccupied={fetchOccupiedReminders}
          fetchVehicleInfo={fetchPublicVehicleInfo}
          branding={publicBranding}
        />
      </>
    );
  }

  if (view === 'customer') {
    return (
      <CustomerPortal
        ticket={currentCustomerTicket}
        allTickets={currentCustomerTickets}
        reminder={currentCustomerReminder}
        settings={settings}
        onBack={handleBackToLogin}
        onAcceptQuotation={acceptQuotation}
        onRefresh={handleRefreshPortal}
        onSaveFeedback={saveCustomerFeedback}
      />
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleBackToLogin}
      notifications={notifications}
      markAsRead={markNotificationAsRead}
      settings={settings}
      isSuperAdmin={isSuperAdmin}
      branding={publicBranding}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      viewDate={viewDate}
      setViewDate={setViewDate}
      onAddTicket={() => setIsAddModalOpen(true)}
      onRefresh={refreshData}
      reminders={reminders}
      isMonitorMode={isMonitorMode}
      setIsMonitorMode={setIsMonitorMode}
    >
      {activeTab === 'dashboard' && (
        <KanbanBoard
          tickets={tickets}
          mechanics={mechanics}
          reminders={reminders}
          settings={settings}
          onUpdateStatus={updateTicketStatus}
          onEditTicket={handleEditTicket}
          onDeleteTicket={deleteTicket}
          onAddTicket={() => setIsAddModalOpen(true)}
          onClearFinished={clearFinishedTickets}
          onUpdateNotes={async (id, notes) => {
            await updateTicket(id, { vehicle_notes: notes });
          }}
          onPromoteReminder={handlePromoteReminder}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          viewDate={viewDate}
          setViewDate={setViewDate}
          isMonitorMode={isMonitorMode}
          setIsMonitorMode={setIsMonitorMode}
        />
      )}

      {activeTab === 'sales' && (
        <Sales 
          tickets={tickets} 
          parts={parts} 
          settings={settings}
          salaVentas={salaVentas}
          mechanics={mechanics}
        />
      )}

      {activeTab === 'sala_ventas' && (
        <SalaVentas
          parts={parts}
          tickets={tickets}
          onAddSalaVenta={addSalaVenta}
          fetchSalaVentas={fetchSalaVentas}
          salaVentas={salaVentas}
          settings={settings}
        />
      )}

      {activeTab === 'inventory' && (
        <Inventory 
          parts={parts} 
          settings={settings} 
          onAddPart={addPart} 
          onUpdatePart={updatePart} 
          onDeletePart={deletePart} 
        />
      )}

      {activeTab === 'agenda' && (
        <Agenda 
          tickets={tickets} 
          mechanics={mechanics} 
          customers={customers} 
          reminders={reminders}
          settings={settings}
          addReminder={addIntelligentReminder}
          updateReminder={updateReminder}
          deleteReminder={deleteReminder}
          fetchOccupiedReminders={fetchOccupiedReminders}
        />
      )}

      {activeTab === 'customers' && (
        <Customers
          customers={customers}
          tickets={tickets}
          settings={settings}
          onAddCustomer={addCustomer}
          onUpdateVehicle={updateVehicle}
          deleteVehicle={deleteVehicle}
          onUpdateNotes={async (id, notes) => {
            await updateTicket(id, { vehicle_notes: notes });
          }}
          searchTicket={searchTicket}
        />
      )}

      {activeTab === 'mechanics' && (
        <Mechanics
          mechanics={mechanics}
          tickets={tickets}
          onAdd={() => setIsAddMechanicModalOpen(true)}
          onDelete={deleteMechanic}
          onUpdateTicket={updateTicket}
        />
      )}

      {activeTab === 'settings' && (
        <div className="p-8">
          <SettingsForm 
            settings={settings} 
            onUpdate={updateSettings} 
            tickets={tickets}
            parts={parts}
          />
        </div>
      )}

      {activeTab === 'users' && isSuperAdmin && (
        <div className="p-8">
          <UsersAdmin />
        </div>
      )}

      {activeTab === 'ai_consultant' && (
        <div className="h-full">
          <AIConsultant 
            tickets={tickets}
            parts={parts}
            customers={customers}
            salaVentas={salaVentas}
            mechanics={mechanics}
            settings={settings}
          />
        </div>
      )}

      <AddTicketModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addTicket}
        mechanics={mechanics}
        customers={customers}
        tickets={tickets}
        settings={settings}
        parts={parts}
        onUpdatePart={updatePart}
      />

      <AddMechanicModal
        isOpen={isAddMechanicModalOpen}
        onClose={() => setIsAddMechanicModalOpen(false)}
        onAdd={addMechanic}
      />
      <EditTicketModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        ticket={editingTicket}
        mechanics={mechanics}
        parts={parts}
        onUpdate={updateTicket}
        onUploadPhoto={uploadTicketPhoto}
        onUpdatePart={updatePart}
        settings={settings}
      />
    </Layout>
  );
}
