import React, { useState } from 'react';
import { 
  Car, 
  Wrench, 
  Search, 
  Calendar, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone,
  Instagram,
  Facebook,
  LocateFixed,
  Mail,
  Lock,
  Loader2,
  X,
  ShieldCheck as ShieldIcon
} from 'lucide-react';
import { PublicBookingModal } from './PublicBookingModal';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';

interface LandingPageProps {
  onPortalAccess: () => void;
  onAdminAccess: () => void;
  onCustomerSearch: (patente: string) => void;
  fetchCompanies: () => Promise<{ id: string, name: string }[]>;
  onAddReminder: (reminder: any) => Promise<void>;
  fetchOccupied?: (companyId: string, date: string) => Promise<string[]>;
  fetchVehicleInfo?: (patente: string, company_id: string) => Promise<any>;
  branding?: any;
}

export function LandingPage({ 
  onPortalAccess, 
  onAdminAccess, 
  onCustomerSearch,
  fetchCompanies,
  onAddReminder,
  fetchOccupied,
  fetchVehicleInfo,
  branding 
}: LandingPageProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [patente, setPatente] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);

  const getPremiumColor = (hex?: string) => {
    if (!hex || hex === '#10b981') return '#D6A621'; // Roma Gold default
    return hex;
  };

  const primaryColor = getPremiumColor(branding?.theme_menu_highlight);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      onAdminAccess();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };
  const services = [
    {
      title: 'Cambio de Aceite y Filtros',
      description: 'Te asesoramos sobre el aceite exacto que necesita tu motor. Trabajamos rápido y solo con marcas certificadas.',
      details: 'Utilizamos lubricantes de alta gama (Shell, Castrol, Liqui Moly) adaptados a las especificaciones de tu fabricante. Incluye revisión de niveles y cambio de filtro de aire/aceite para maximizar la vida útil del motor.',
      icon: <Clock className="w-6 h-6" />,
      tag: 'Especialidad',
      features: ['Aceites Sintéticos', 'Filtros Originales', 'Revisión de Niveles']
    },
    {
      title: 'Mecánica Rápida y Frenos',
      description: 'Revisiones por kilometraje, cambio de pastillas y afinamiento. Lo necesario para que andes seguro por la calle.',
      details: 'Detectamos desgastes antes de que se conviertan en fallas costosas. Revisamos frenos, amortiguación, correas y sistema de refrigeración para garantizar un viaje seguro.',
      icon: <ShieldCheck className="w-6 h-6" />,
      tag: 'Seguridad',
      features: ['Frenos y Pastillas', 'Suspensión', 'Correas de Accesorio']
    },
    {
      title: 'Repuestos y Baterías',
      description: 'Tenemos lo esencial a mano para que tu auto no se quede parado. Filtros, plumillas, baterías y más.',
      details: 'Contamos con repuestos para las marcas más populares del mercado chileno. Desde ampolletas y bujías hasta kits de distribución completos, con garantía de calidad.',
      icon: <LocateFixed className="w-6 h-6" />,
      tag: 'Accesorios',
      features: ['Stock Inmediato', 'Partes Eléctricas', 'Kits de Distribución']
    },
    {
      title: 'Revisión y Diagnóstico',
      description: '¿Sientes un ruido o prendió una luz? Te explicamos de forma clara y honesta qué le pasa a tu vehículo y cómo solucionarlo.',
      details: '¿No sabes qué mantenimiento necesita tu auto? Nuestros técnicos realizan un diagnóstico visual y te entregan una hoja de ruta clara, priorizando lo más crítico para tu bolsillo y seguridad.',
      icon: <Wrench className="w-6 h-6" />,
      tag: 'Consultoría',
      features: ['Diagnóstico Visual', 'Presupuesto Detallado', 'Priorización de Fallas']
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-zinc-900 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/logo3.png" alt="Roma Center Logo" className="w-14 h-14 object-contain" />
            </div>
            <span className="text-xl font-black tracking-tighter text-zinc-900 uppercase">Roma Center<span style={{ color: primaryColor }}>.</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#servicios" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest">Servicios</a>
            <a href="#ubicacion" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-widest">Ubicación</a>
            <button 
              onClick={() => setIsBookingOpen(true)}
              className="px-6 py-2.5 bg-zinc-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-zinc-200"
            >
              Agendar Cita
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10 space-y-8 animate-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              <Star className="w-3 h-3 fill-current" style={{ color: primaryColor }} />
              <span className="text-[10px] font-black uppercase tracking-wider">Servicio Automotriz Premium</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-zinc-900 leading-[1.1] tracking-tighter">
              Tu Lubricentro de <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #f59e0b)` }}>Confianza en Maipú.</span>
            </h1>
            <p className="text-xl text-zinc-500 max-w-lg leading-relaxed font-medium">
              Cuidamos tu auto como si fuera el nuestro. Servicio rápido, transparente y con los mejores productos para que sigas rodando sin preocupaciones. Sin enredos ni cobros ocultos.
            </p>
            
            <div className="flex flex-col gap-6 pt-4 max-w-md">
              <button 
                onClick={() => setIsBookingOpen(true)}
                className="flex items-center justify-center gap-3 px-8 py-5 text-white rounded-[24px] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95"
                style={{ backgroundColor: primaryColor, boxShadow: `0 20px 25px -5px ${primaryColor}40` }}
              >
                <Calendar className="w-5 h-5" />
                Agendar Mi Visita
              </button>

              <div className="relative group space-y-3">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-amber-600 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Consulta estado (Patente)"
                    className="w-full pl-14 pr-6 py-5 bg-white border-2 border-zinc-100 rounded-[24px] outline-none transition-all font-bold text-lg uppercase tracking-widest placeholder:text-zinc-400 placeholder:normal-case shadow-sm group-hover:border-zinc-200"
                    style={{ focusBorderColor: primaryColor } as any}
                    value={patente}
                    onChange={(e) => setPatente(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && patente) {
                        onCustomerSearch(patente.replace(/[\s\.\-·]/g, '').toUpperCase());
                      }
                    }}
                  />
                </div>
                
                <div className={cn(
                  "overflow-hidden transition-all duration-500 ease-out",
                  patente.length > 0 ? "max-h-20 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
                )}>
                  <button 
                    onClick={() => {
                      if (patente) {
                        onCustomerSearch(patente.replace(/[\s\.\-·]/g, '').toUpperCase());
                      }
                    }}
                    className="w-full py-5 bg-zinc-900 hover:bg-black text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-zinc-200 active:scale-95 flex items-center justify-center gap-2 group/btn"
                  >
                    Consultar Estado
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative lg:h-[600px] animate-in zoom-in duration-1000">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-amber-100/50 rounded-full blur-3xl -z-10"></div>
            <div className="relative h-full rounded-[40px] overflow-hidden shadow-2xl shadow-zinc-200 border-8 border-white group">
              <img 
                src="/assets/fotoprincipal.jpeg" 
                alt="Principal Roma Center" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/20 backdrop-blur-xl rounded-3xl border border-white/30 text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-900">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest opacity-80">Desde Mayo 2022</p>
                    <p className="font-bold">Trayectoria y Confianza en Maipú</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-24 bg-zinc-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>Nuestras Especialidades</h2>
            <h3 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">Soluciones integrales para mantenerte en movimiento.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, idx) => (
              <div key={idx} className="group p-8 bg-white rounded-[32px] border border-zinc-100 transition-all duration-500 flex flex-col items-start gap-6 hover:border-amber-500 hover:shadow-2xl">
                <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-500 shadow-inner">
                  {service.icon}
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>{service.tag}</p>
                  <h4 className="text-xl font-bold text-zinc-900">{service.title}</h4>
                  <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                    {service.description}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedService(service)}
                  className="mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors"
                >
                  Más Info
                  <ChevronRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="ubicacion" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>Encuéntranos</h2>
              <h3 className="text-4xl font-black text-zinc-900 tracking-tight leading-tight">Estamos ubicados en el corazón de la comuna.</h3>
              <p className="text-zinc-500 text-lg font-medium leading-relaxed">
                Visítanos y vive la experiencia Roma Center. Nuestras instalaciones están diseñadas para ofrecerte la mejor atención mientras cuidamos tu vehículo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="mt-1 w-12 h-12 bg-zinc-900 rounded-2xl flex-shrink-0 flex items-center justify-center text-white">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 mb-1">Dirección</h4>
                  <p className="text-sm text-zinc-500 font-medium">Av. El Rosal 6065, Maipú<br />Santiago, Chile</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 mb-1">Contacto</h4>
                  <p className="text-sm text-zinc-500 font-medium">+56 9 9357 8563<br />contacto@romacenterspa.cl</p>
                </div>
              </div>
            </div>
          </div>

          <a 
            href="https://www.google.com/maps/search/?api=1&query=Roma+Center+Lubricentro+Av.+El+Rosal+6065+Maipu"
            target="_blank"
            rel="noopener noreferrer"
            className="h-[400px] bg-zinc-100 rounded-[40px] overflow-hidden relative group border-8 border-zinc-50 shadow-xl block"
          >
             <div className="absolute inset-0 bg-[url('/assets/romacenter1.jpg')] bg-cover bg-center group-hover:scale-105 transition-all duration-700"></div>
             <div className="absolute inset-0 bg-amber-900/10 group-hover:bg-transparent transition-all duration-700"></div>
             <div className="absolute bottom-6 left-6 p-4 bg-white rounded-2xl shadow-xl flex items-center gap-3 hover:scale-105 transition-transform active:scale-95">
               <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                 <MapPin className="w-5 h-5" />
               </div>
              <span className="text-sm font-black text-zinc-900 pr-2">Abrir en Waze / Maps</span>
             </div>
          </a>
        </div>
      </section>

      {/* Spirit Section */}
      <section className="py-24 bg-zinc-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/assets/romacenter3.jpg')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-zinc-900/60"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 space-y-8">
          <h2 className="text-sm font-black uppercase tracking-[0.4em]" style={{ color: primaryColor }}>Nuestro Espíritu</h2>
          <blockquote className="text-3xl md:text-3xl font-black tracking-tight leading-tight italic">
            "Nacimos en 2022 con una meta súper clara: ser ese lubricentro al que vas tranquilo, sabiendo que te van a atender bien, rápido y con la verdad por delante. En Roma Center no te inventamos fallas; queremos ser tu taller de cabecera en Maipú, ese que recomiendas a tu familia y amigos."
          </blockquote>
          <div className="flex flex-col items-center justify-center gap-4 pt-4">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Es nuestra Filosofía en Roma Center</p>
            <div className="flex items-center gap-4">
                <div className="h-px w-12 bg-amber-500/30"></div>
                <p className="text-xs font-black uppercase tracking-widest style={{ color: primaryColor }}">Margarita (dueña)</p>
                <div className="h-px w-12 bg-amber-500/30"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-white py-20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-8 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden">
                  <img src="/logo3.png" alt="Roma Center Logo" className="w-14 h-14 object-contain" />
                </div>
                <span className="text-2xl font-black tracking-tighter uppercase">Roma Center<span style={{ color: primaryColor }}>.</span></span>
              </div>
              <p className="text-zinc-400 text-lg max-w-md font-medium">
                Tu lubricentro amigo en Maipú. Comprometidos con el trabajo bien hecho y la honestidad desde el primer día.
              </p>
              <div className="flex items-center gap-4 justify-center md:justify-start">
                <a href="#" className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center hover:bg-amber-600 transition-colors">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="#" className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center hover:bg-amber-600 transition-colors">
                  <Facebook className="w-6 h-6" />
                </a>
              </div>
            </div>
            <div className="text-center md:text-left space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Compañía</h4>
              <nav className="flex flex-col gap-4">
                <a href="#" className="font-bold hover:text-amber-500 transition-colors">Servicios</a>
                <a href="#" className="font-bold hover:text-amber-500 transition-colors">Nosotros</a>
                <a href="#" className="font-bold hover:text-amber-500 transition-colors">Contacto</a>
              </nav>
            </div>
            <div className="text-center md:text-left space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Acceso Staff</h4>
              <form onSubmit={handleAdminLogin} className="space-y-3 max-w-[240px] mx-auto md:mx-0">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-sm focus:border-amber-500 outline-none transition-all placeholder:text-zinc-600"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-[10px] font-bold uppercase">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ShieldIcon className="w-3 h-3" />
                  )}
                  {loading ? 'Entrando...' : 'Ingresar al Taller'}
                </button>
              </form>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">© 2026 Roma Center Spa. Todos los derechos reservados.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[10px] text-zinc-500 font-black uppercase tracking-widest hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="text-[10px] text-zinc-500 font-black uppercase tracking-widest hover:text-white transition-colors">Términos</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PublicBookingModal 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        fetchCompanies={fetchCompanies}
        onAddReminder={onAddReminder}
        fetchOccupied={fetchOccupied}
        fetchVehicleInfo={fetchVehicleInfo}
        branding={branding}
      />

      {/* Service Detail Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedService(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 shadow-inner">
                    {selectedService.icon}
                  </div>
                  <button 
                    onClick={() => setSelectedService(null)}
                    className="p-3 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="inline-flex px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                    {selectedService.tag}
                  </div>
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{selectedService.title}</h3>
                  <p className="text-zinc-500 text-lg leading-relaxed font-medium">
                    {selectedService.details}
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">¿Qué incluye?</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedService.features.map((feature: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                        <span className="font-bold text-zinc-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setSelectedService(null);
                    setIsBookingOpen(true);
                  }}
                  className="w-full py-5 text-white rounded-[24px] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 20px 25px -5px ${primaryColor}40` }}
                >
                  <Calendar className="w-5 h-5" />
                  Agendar este servicio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
