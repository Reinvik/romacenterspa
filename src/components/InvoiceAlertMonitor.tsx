import React, { useEffect, useState } from 'react';
import { SalaVenta, GarageSettings } from '../types';
import { Bell, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface InvoiceAlertMonitorProps {
    salaVentas: SalaVenta[];
    settings: GarageSettings | null;
}

export function InvoiceAlertMonitor({ salaVentas, settings }: InvoiceAlertMonitorProps) {
    const [showModal, setShowModal] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!settings?.invoice_alert_time) return;

        const checkAlert = () => {
            const now = new Date();
            const todayStr = format(now, 'yyyy-MM-dd');
            const alertTimeStr = settings.invoice_alert_time || '19:00';
            
            // Parse alert time
            const [hours, minutes] = alertTimeStr.split(':').map(Number);
            const alertTime = new Date(now);
            alertTime.setHours(hours, minutes, 0, 0);

            // Check if already notified today
            const lastNotification = localStorage.getItem('last_invoice_notification_date');
            if (lastNotification === todayStr) return;

            // Check if current time is >= alert time
            if (now >= alertTime) {
                // Check for pending invoices
                const pending = salaVentas.filter(s => 
                    s.document_type === 'Factura' && 
                    !s.is_completed_invoice
                );

                if (pending.length > 0) {
                    setPendingCount(pending.length);
                    setShowModal(true);
                    sendBrowserNotification(pending.length);
                    localStorage.setItem('last_invoice_notification_date', todayStr);
                }
            }
        };

        const interval = setInterval(checkAlert, 60000); // Check every minute
        checkAlert(); // Initial check

        return () => clearInterval(interval);
    }, [salaVentas, settings]);

    const sendBrowserNotification = (count: number) => {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            new Notification("Facturas Pendientes", {
                body: `Hay ${count} factura(s) que aún no han sido realizadas.`,
                icon: "/pwa-192x192.png" // Opcional: ruta al logo
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    };

    return (
        <AnimatePresence>
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-zinc-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-12 bg-red-500/10 blur-[80px] -z-10 rounded-full" />
                        
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                    Atención: Facturas Pendientes
                                </h2>
                                <p className="text-zinc-400">
                                    Se ha alcanzado la hora de revisión ({settings?.invoice_alert_time}) y aún quedan <span className="text-red-400 font-bold">{pendingCount}</span> factura(s) por marcar como realizadas.
                                </p>
                            </div>

                            <div className="w-full bg-zinc-800/50 rounded-2xl p-4 border border-zinc-800">
                                <p className="text-sm text-zinc-500 italic">
                                    Por favor, revisa el historial de Sala de Ventas y marca las facturas correspondientes.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                ENTENDIDO
                            </button>
                        </div>

                        <button 
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
