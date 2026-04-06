import React, { useState } from 'react';
import { ShieldCheck, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode;
}

export function AdminVerificationModal({ 
  isOpen, 
  onClose, 
  onVerified,
  title = "Verificación de Administrador",
  message = "Esta acción requiere privilegios de superadmin. Por favor ingrese la clave maestra.",
  children
}: AdminVerificationModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Clave maestra para Romacenterspa
    const MASTER_KEY = 'Nexus123';

    setTimeout(() => {
      if (password === MASTER_KEY || password === 'adminromaspa' || password === 'romacenter-mo' || password === 'adminmolivares') {
        onVerified();
        setPassword('');
        onClose();
      } else {
        setError(true);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                {message}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    autoFocus
                    type="password"
                    placeholder="Ingrese clave de autorización"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(false);
                    }}
                    className={`w-full bg-black/40 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-5 py-4 text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-600`}
                  />
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 text-red-400 text-xs mt-2 ml-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Clave incorrecta. Intente nuevamente.
                    </motion.div>
                  ) || (
                    <div className="text-[10px] text-zinc-500 mt-2 ml-1 uppercase font-bold tracking-widest">
                       Seguridad Romacenterspa
                    </div>
                  )}
                </div>
                
                {children}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!password || loading}
                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Verificar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
