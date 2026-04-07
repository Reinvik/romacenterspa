import React, { useEffect, useState } from 'react';
import { RefreshCcw, X, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Versión actual de la aplicación (Debe coincidir con public/version.json inicialmente)
const CURRENT_VERSION = '1.1.0';

export function AppUpdateNotifier() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [newVersion, setNewVersion] = useState('');

    useEffect(() => {
        const checkUpdate = async () => {
            try {
                // Fetch version.json con cache busting
                const response = await fetch(`/version.json?t=${Date.now()}`);
                if (!response.ok) return;
                
                const data = await response.json();
                
                if (data.version && data.version !== CURRENT_VERSION) {
                    setNewVersion(data.version);
                    setUpdateAvailable(true);
                }
            } catch (err) {
                console.error('Error al verificar actualizaciones:', err);
            }
        };

        // Verificar cada 5 minutos
        const interval = setInterval(checkUpdate, 300000);
        checkUpdate(); // Verificación inicial

        return () => clearInterval(interval);
    }, []);

    const handleUpdate = () => {
        // Recargar la página limpiando caché (en la medida de lo posible)
        window.location.reload();
    };

    return (
        <AnimatePresence>
            {updateAvailable && (
                <motion.div
                    initial={{ opacity: 0, x: 100, y: 100, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 100, y: 100, scale: 0.8 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-6 right-6 z-[999] group pointer-events-auto"
                >
                    <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden flex flex-col gap-4 max-w-[280px]">
                        {/* Efecto de luz premium */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700" />
                        
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 group-hover:border-emerald-500/40 transition-colors shadow-inner">
                                <RefreshCcw className="w-6 h-6 text-emerald-400 group-hover:rotate-180 transition-transform duration-1000" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white text-xs font-black uppercase tracking-widest">
                                    Actualización
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-zinc-500 font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">v{CURRENT_VERSION}</span>
                                    <ArrowUpCircle className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">v{newVersion}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                                Hay una nueva versión del sistema disponible con mejoras y nuevas funciones.
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleUpdate}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <RefreshCcw className="w-3 h-3" />
                                    ACTUALIZAR
                                </button>
                                <button
                                    onClick={() => setUpdateAvailable(false)}
                                    className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-white rounded-xl border border-zinc-700 transition-colors"
                                    title="Cerrar"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
