import React, { useState, useEffect } from 'react';
import { Car, Wrench, Search, ArrowRight, ShieldCheck, Mail, Lock, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: () => void;
  onCustomerSearch: (patente: string) => void;
  onOpenBooking: () => void;
  branding?: {
    logo_url?: string;
    workshop_name?: string;
    theme_menu_highlight?: string;
    theme_menu_text?: string;
    logo_x_offset?: number;
    logo_y_offset?: number;
    logo_scale?: number;
  };
}

export function Login({ onLogin, onCustomerSearch, onOpenBooking, branding }: LoginProps) {
  const [patente, setPatente] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [companies, setCompanies] = useState<{name: string, slug: string}[]>([]);

  useEffect(() => {
    supabase.from('companies').select('name, slug').order('name').then(({data}) => {
      if (data) setCompanies(data);
    });
  }, []);

  // Paleta de colores Premium
  // Si es amarillo brillante (#f2ea18), lo pasamos a un Amarillo/Oro elegante y legible
  const getPremiumColor = (hex?: string) => {
    if (!hex || hex === '#10b981') return '#D6A621'; // Roma Gold default
    const cleanHex = hex.toLowerCase();
    // Amarillo Roma Center Exacto: #D6A621
    if (cleanHex === '#f2ea18' || cleanHex === '#ffff00' || cleanHex.includes('yellow') || window.location.search.includes('roma-center')) return '#D6A621'; 
    return hex;
  };

  const primaryColor = getPremiumColor(branding?.theme_menu_highlight || branding?.theme_menu_text);
  const primaryBg = primaryColor.startsWith('#') && primaryColor.length === 7 ? `${primaryColor}15` : '#d1fae530';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (patente.trim()) {
      onCustomerSearch(patente.trim());
    }
  };

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
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Fondo Decorativo con Gradientes Dinámicos */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: primaryColor }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 bg-blue-500"></div>

      {/* Selector de Taller Opcional */}
      <div className="absolute top-6 right-6 z-50">
        <select 
          className="bg-black/40 backdrop-blur-xl text-zinc-300 text-sm font-bold rounded-2xl px-5 py-2.5 border border-white/10 outline-none shadow-2xl cursor-pointer hover:bg-black/60 hover:text-white transition-all appearance-none pr-10 relative"
          onChange={(e) => {
             if (e.target.value) {
                window.location.href = `/?t=${e.target.value}`;
             } else {
                window.location.href = `/`;
             }
          }}
          value={new URLSearchParams(window.location.search).get('t') || ''}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='Length 19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '1.2rem'
          }}
        >
          <option value="" className="bg-zinc-900">🏢 Cambiar Taller</option>
          {companies.map(c => (
             c.slug && <option key={c.slug} value={c.slug} className="bg-zinc-900">{c.name}</option>
          ))}
        </select>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/5">

        {/* Customer Section - Glassmorphism */}
        <div className="bg-white/95 backdrop-blur-md p-8 md:p-14 flex flex-col items-center text-center relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-inner" style={{ backgroundColor: primaryBg }}>
            <Search className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 mb-4">
             Portal del Cliente
          </h2>
          <p className="text-zinc-500 mb-10 max-w-sm text-lg leading-relaxed">
            Consulta el estado de tu vehículo y agenda tu próxima visita con un clic.
          </p>

          <style>{`
            .brand-input-focus:focus {
              border-color: ${primaryColor} !important;
              box-shadow: 0 0 0 4px ${primaryBg} !important;
            }
            .glass-panel {
              background: rgba(255, 255, 255, 0.03);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.05);
            }
          `}</style>
          <form onSubmit={handleSearch} className="w-full max-w-xs space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: AB·CD·12"
                className="brand-input-focus w-full px-5 py-4 rounded-xl border-2 border-zinc-200 outline-none transition-all font-mono text-center text-xl uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-base"
                value={patente}
                onChange={e => setPatente(e.target.value.toUpperCase())}
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 text-white rounded-xl font-bold transition-colors shadow-md hover:shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              Consultar Estado
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onOpenBooking}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 rounded-xl font-bold transition-all shadow-sm"
              style={{ 
                borderColor: primaryColor,
                color: primaryColor
              }}
            >
              <Calendar className="w-5 h-5" />
              Agendar Visita
            </button>
          </form>
        </div>

        {/* Mechanic Section - Deep Black Integration */}
        <div className="bg-[#000000] p-8 md:p-14 flex flex-col items-center text-center text-zinc-100 relative border-l border-white/5">
          <div className="w-full h-32 flex items-center justify-center mb-6 overflow-visible mt-2">
            {branding?.logo_url && !logoError ? (
              <img 
                src={branding.logo_url} 
                alt="Logo" 
                onError={() => setLogoError(true)}
                className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                style={{
                  // Ignoramos offsets manuales aquí porque el nuevo diseño es centralizado
                  // y los offsets viejos rompen la visual. Escalamos un 20% adicional.
                  transform: `scale(${(branding.logo_scale || 1) * 1.2})`,
                  transformOrigin: 'center'
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-zinc-800 shadow-2xl">
                <img src="/logo3.png" alt="Roma Center Logo" className="w-16 h-16 object-contain" />
              </div>
            )}
          </div>
          
          {/* Seccion de Nombre: Solo si NO hay logo (o falló) para evitar duplicidad visual */}
          {(!branding?.logo_url || logoError) ? (
            <h2 className="text-3xl font-bold tracking-tight mb-3 text-white">
              {branding?.workshop_name || 'Panel Administrativo'}
            </h2>
          ) : (
            <div className="h-4"></div> /* Espaciado mínimo cuando hay logo */
          )}
          
          <p className="text-zinc-500 mb-10 max-w-sm text-base">
            Acceso exclusivo. Gestiona reparaciones, stock y clientes de forma profesional.
          </p>

          <form onSubmit={handleAdminLogin} className="w-full max-w-xs space-y-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input
                type="email"
                placeholder="Email corporativo"
                required
                className="w-full pl-12 pr-5 py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:bg-zinc-900 outline-none transition-all text-white placeholder:text-zinc-700"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input
                type="password"
                placeholder="Contraseña"
                required
                className="w-full pl-12 pr-5 py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:bg-zinc-900 outline-none transition-all text-white placeholder:text-zinc-700"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500/80 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-zinc-100 text-black rounded-xl font-black transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
              {loading ? 'AUTENTICANDO...' : 'INGRESAR AL TALLER'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
