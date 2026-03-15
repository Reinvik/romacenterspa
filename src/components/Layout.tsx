import React from 'react';
import { LayoutDashboard, Wrench, Package, Users, Settings, LogOut, Bell, Calendar, Menu, X, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { GarageNotification, GarageSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  notifications: GarageNotification[];
  markAsRead: (id: string) => Promise<void>;
  settings: GarageSettings | null;
  isSuperAdmin?: boolean;
  branding?: any;
}

export function Layout({ children, activeTab, setActiveTab, onLogout, notifications, markAsRead, settings, isSuperAdmin, branding }: LayoutProps) {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    setLogoError(false);
  }, [settings?.logo_url]);

  const menuTextColor = settings?.theme_menu_text || branding?.theme_menu_text || '#a1a1aa';
  const menuHighlightColor = settings?.theme_menu_highlight || branding?.theme_menu_highlight || '#D6A621';

  // Añadir opacidad de 10% (aprox 1A) a highlightColor si tiene formato hexadecimal
  const highlightBg = menuHighlightColor.startsWith('#') && menuHighlightColor.length === 7 
    ? `${menuHighlightColor}1A` 
    : 'rgba(16, 185, 129, 0.1)';

  const navItems = [
    { id: 'dashboard', label: 'Tablero Kanban', icon: LayoutDashboard },
    { id: 'inventory', label: 'Repuestos', icon: Package },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'mechanics', label: 'Mecánicos', icon: Wrench },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
  ];

  if (isSuperAdmin) {
    navItems.push({ id: 'users', label: 'Admin Usuarios', icon: Users });
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 text-zinc-900 font-sans overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-zinc-900 text-zinc-100 flex flex-col z-50 transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-64 shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden border border-zinc-700">
              {settings?.logo_url && !logoError ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <img src="/logo3.png" alt="Roma Center Logo" className="w-14 h-14 object-contain" />
              )}
            </div>
            <span className="font-bold text-lg tracking-tight leading-tight">{settings?.workshop_name || 'Roma Center SPA'}</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                style={{
                  color: isActive ? menuHighlightColor : menuTextColor,
                  backgroundColor: isActive ? highlightBg : 'transparent'
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors w-full font-medium hover:bg-zinc-800/50",
                  isActive && "font-bold shadow-sm"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => handleTabChange('settings')}
            style={{
              color: activeTab === 'settings' ? menuHighlightColor : menuTextColor,
              backgroundColor: activeTab === 'settings' ? highlightBg : 'transparent'
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full hover:bg-zinc-800/50",
              activeTab === 'settings' && "font-bold shadow-sm"
            )}
          >
            <Settings className="w-5 h-5" />
            Configuración
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-colors mt-1"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-zinc-800 truncate max-w-[150px] md:max-w-none">
              {navItems.find(i => i.id === activeTab)?.label || 'Configuración'}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4 relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-zinc-400 hover:text-zinc-600 transition-colors rounded-full hover:bg-zinc-100"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold" 
                      style={{ backgroundColor: menuHighlightColor }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-zinc-50 bg-zinc-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-zinc-900 text-sm">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: highlightBg, color: menuHighlightColor }}>
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400">No tienes notificaciones aún.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={cn(
                          "p-4 border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors cursor-pointer group",
                          !n.read && "relative"
                        )}
                        style={{ backgroundColor: !n.read ? highlightBg : undefined }}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className={cn("text-xs leading-relaxed", !n.read ? "text-zinc-900 font-semibold" : "text-zinc-600")}>
                            {n.message}
                          </p>
                          {!n.read && (
                            <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: menuHighlightColor }}></div>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-2 block">
                          {format(new Date(n.created_at), "d 'de' MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
