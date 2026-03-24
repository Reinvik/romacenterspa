import React, { useState, useEffect } from 'react';
import { GarageSettings } from '../types';
import { Save, Building2, MapPin, Phone, MessageSquare, Loader2, CheckCircle, Palette, Download, FileSpreadsheet, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Ticket, Part } from '../types';
import { cn } from '../lib/utils';

interface SettingsFormProps {
    settings: GarageSettings | null;
    onUpdate: (updates: Partial<GarageSettings>) => Promise<void>;
    tickets?: Ticket[];
    parts?: Part[];
}

export function SettingsForm({ settings, onUpdate, tickets, parts }: SettingsFormProps) {
    const [formData, setFormData] = useState<Partial<GarageSettings>>({
        workshop_name: '',
        address: '',
        phone: '',
        whatsapp_template: '',
        logo_url: '',
        logo_scale: 1,
        logo_x_offset: 50,
        logo_y_offset: 50,
        theme_menu_text: '#a1a1aa',
        theme_menu_highlight: '#10b981',
        company_slug: ''
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'design' | 'security' | 'export'>('general');
    
    // Password Change State
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                workshop_name: settings.workshop_name || '',
                address: settings.address || '',
                phone: settings.phone || '',
                whatsapp_template: settings.whatsapp_template || '',
                logo_url: settings.logo_url || '',
                logo_scale: settings.logo_scale ?? 1,
                logo_x_offset: settings.logo_x_offset ?? 50,
                logo_y_offset: settings.logo_y_offset ?? 50,
                theme_menu_text: settings.theme_menu_text || '#a1a1aa',
                theme_menu_highlight: settings.theme_menu_highlight || '#10b981',
                company_slug: settings.company_slug || ''
            });
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const downloadCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            alert('No hay datos para exportar.');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header] === null || row[header] === undefined ? '' : row[header];
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportTickets = () => {
        if (!tickets) {
            alert('Cargando tickets...');
            return;
        }
        
        const exportData = tickets.map(t => ({
            Patente: t.id,
            Cliente: t.owner_name,
            Telefono: t.owner_phone,
            Modelo: t.model,
            KM: t.mileage,
            Estado: t.status,
            'Fecha Ingreso': t.entry_date ? new Date(t.entry_date).toLocaleDateString() : '',
            'Ultimo Cambio Estado': t.last_status_change ? new Date(t.last_status_change).toLocaleDateString() : '',
            Mecanico: t.mechanic || 'Sin asignar',
            Notas: t.notes || ''
        }));

        downloadCSV(exportData, 'tickets_roma_center');
    };

    const handleExportParts = () => {
        if (!parts) {
            alert('Cargando repuestos...');
            return;
        }

        const exportData = parts.map(p => ({
            Codigo: p.id,
            Nombre: p.name,
            Stock: p.stock,
            'Stock Minimo': p.min_stock,
            Precio: p.price
        }));

        downloadCSV(exportData, 'repuestos_roma_center');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden font-sans">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    Configuración del Taller
                </h2>
                <p className="text-zinc-500 text-sm mt-1">Personaliza la información de tu taller y las comunicaciones con los clientes.</p>
                <div className="flex gap-2 mt-6">
                    <button 
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={cn("px-4 py-2 rounded-xl border font-bold text-sm transition-all", activeTab === 'general' ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300")}
                    >General</button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('design')}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all", activeTab === 'design' ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300")}
                    >
                        <Palette className="w-4 h-4" /> Diseño
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all", activeTab === 'security' ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300")}
                    >
                        <Lock className="w-4 h-4" /> Seguridad
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('export')}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all", activeTab === 'export' ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300")}
                    >
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-w-2xl">
                {activeTab === 'general' ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-zinc-400" />
                            Nombre del Taller
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Nexus Garage"
                             className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all text-zinc-800 focus:ring-2"
                            style={{ 
                                borderColor: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `${formData.theme_menu_highlight}40` : undefined,
                                boxShadow: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `0 0 0 2px ${formData.theme_menu_highlight}20` : undefined
                            }}
                            value={formData.workshop_name}
                            onChange={e => setFormData({ ...formData, workshop_name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-zinc-400" />
                            Teléfono del Taller
                        </label>
                        <input
                            type="text"
                            placeholder="+569 1234 5678"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all text-zinc-800 font-mono focus:ring-2"
                            style={{ 
                                borderColor: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `${formData.theme_menu_highlight}40` : undefined,
                                boxShadow: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `0 0 0 2px ${formData.theme_menu_highlight}20` : undefined
                            }}
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-zinc-400" />
                            URL del Logo
                        </label>
                        <input
                            type="text"
                            placeholder="https://ejemplo.com/mi-logo.png"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all text-zinc-800 focus:ring-2"
                            style={{ 
                                borderColor: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `${formData.theme_menu_highlight}40` : undefined,
                                boxShadow: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `0 0 0 2px ${formData.theme_menu_highlight}20` : undefined
                            }}
                            value={formData.logo_url}
                            onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                        />
                    </div>

                    {/* Controles de Logo */}
                    {formData.logo_url && (
                        <div className="md:col-span-2 space-y-4 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl mt-2">
                            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-200 pb-2">Ajuste de Logo</h3>
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                {/* Preview */}
                                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Previsualización</span>
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-zinc-300 bg-white shadow-sm flex items-center justify-center p-1 relative">
                                        <img 
                                            src={formData.logo_url} 
                                            alt="Preview" 
                                            className="w-full h-full"
                                            style={{
                                                objectFit: 'cover',
                                                objectPosition: `${formData.logo_x_offset}% ${formData.logo_y_offset}%`,
                                                transformOrigin: `${formData.logo_x_offset}% ${formData.logo_y_offset}%`,
                                                transform: `scale(${formData.logo_scale})`
                                            }}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                                
                                {/* Sliders */}
                                <div className="flex-1 space-y-4 w-full">
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                             <label className="text-xs font-semibold text-zinc-600">Zoom (Tamaño)</label>
                                             <span className="text-xs font-mono px-1 rounded" style={{ backgroundColor: `${formData.theme_menu_highlight}15`, color: formData.theme_menu_highlight }}>{formData.logo_scale}x</span>
                                         </div>
                                         <input 
                                             type="range" min="0.5" max="3" step="0.1"
                                             value={formData.logo_scale}
                                             onChange={e => setFormData({ ...formData, logo_scale: parseFloat(e.target.value) })}
                                             className="w-full"
                                             style={{ accentColor: formData.theme_menu_highlight }}
                                         />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                             <label className="text-xs font-semibold text-zinc-600">Ajuste Horizontal</label>
                                             <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-1 rounded">{formData.logo_x_offset}%</span>
                                         </div>
                                         <input 
                                             type="range" min="0" max="100" step="1"
                                             value={formData.logo_x_offset}
                                             onChange={e => setFormData({ ...formData, logo_x_offset: parseInt(e.target.value) })}
                                             className="w-full"
                                             style={{ accentColor: formData.theme_menu_highlight }}
                                         />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                             <label className="text-xs font-semibold text-zinc-600">Ajuste Vertical</label>
                                             <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-1 rounded">{formData.logo_y_offset}%</span>
                                         </div>
                                         <input 
                                             type="range" min="0" max="100" step="1"
                                             value={formData.logo_y_offset}
                                             onChange={e => setFormData({ ...formData, logo_y_offset: parseInt(e.target.value) })}
                                             className="w-full"
                                             style={{ accentColor: formData.theme_menu_highlight }}
                                         />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            Dirección
                        </label>
                        <input
                            type="text"
                            placeholder="Av. Principal #123, Ciudad"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all text-zinc-800 focus:ring-2"
                            style={{ 
                                borderColor: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `${formData.theme_menu_highlight}40` : undefined,
                                boxShadow: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `0 0 0 2px ${formData.theme_menu_highlight}20` : undefined
                            }}
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-zinc-400" />
                            Plantilla de WhatsApp
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Mensaje que se enviará a los clientes..."
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all text-zinc-800 resize-none focus:ring-2"
                            style={{ 
                                borderColor: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `${formData.theme_menu_highlight}40` : undefined,
                                boxShadow: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `0 0 0 2px ${formData.theme_menu_highlight}20` : undefined
                            }}
                            value={formData.whatsapp_template}
                            onChange={e => setFormData({ ...formData, whatsapp_template: e.target.value })}
                        />
                        <div className="flex gap-2 flex-wrap mt-2">
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded border border-zinc-200">Variables: </span>
                            <code className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200" style={{ color: formData.theme_menu_highlight }}>{"{{cliente}}"}</code>
                            <code className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200" style={{ color: formData.theme_menu_highlight }}>{"{{vehiculo}}"}</code>
                            <code className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200" style={{ color: formData.theme_menu_highlight }}>{"{{estado}}"}</code>
                            <code className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200" style={{ color: formData.theme_menu_highlight }}>{"{{nombre_taller}}"}</code>
                            <code className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200" style={{ color: formData.theme_menu_highlight }}>{"{{telefono_taller}}"}</code>
                        </div>
                    </div>
                </div>

                </>
                ) : activeTab === 'export' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <p className="text-sm text-zinc-600 mb-6">Exporta tus datos en formato CSV para usarlos en Excel u otras aplicaciones.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-4 hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                   <FileSpreadsheet className="w-6 h-6" />
                               </div>
                               <div>
                                   <h3 className="font-bold text-zinc-900">Tickets / Ordenes</h3>
                                   <p className="text-xs text-zinc-500">Historial completo de servicios y vehículos.</p>
                               </div>
                           </div>
                           <button
                               type="button"
                               onClick={handleExportTickets}
                               className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 hover:border-blue-400 hover:text-blue-600 text-zinc-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
                           >
                               <Download className="w-4 h-4" />
                               Exportar Tickets (.csv)
                           </button>
                       </div>

                       <div className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-4 hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                   <FileSpreadsheet className="w-6 h-6" />
                               </div>
                               <div>
                                   <h3 className="font-bold text-zinc-900">Inventario / Repuestos</h3>
                                   <p className="text-xs text-zinc-500">Listado de productos, stock y precios.</p>
                               </div>
                           </div>
                           <button
                               type="button"
                               onClick={handleExportParts}
                               className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200 hover:border-emerald-400 hover:text-emerald-600 text-zinc-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
                           >
                               <Download className="w-4 h-4" />
                               Exportar Repuestos (.csv)
                           </button>
                       </div>
                    </div>
                </div>
                ) : activeTab === 'security' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900">Seguridad de la Cuenta</h3>
                        <p className="text-sm text-zinc-500 mt-1">Actualiza tu contraseña para mantener tu cuenta segura.</p>
                    </div>

                    <div className="space-y-4 max-w-sm">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Nueva Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordData.new}
                                    onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all pr-10"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700">Confirmar Nueva Contraseña</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.confirm}
                                onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 transition-all"
                                placeholder="Repite la contraseña"
                            />
                        </div>

                        {passwordError && (
                            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 italic">
                                {passwordError}
                            </p>
                        )}

                        {passwordSaved && (
                            <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-medium">
                                ¡Contraseña actualizada con éxito!
                            </p>
                        )}

                        <button
                            type="button"
                            disabled={passwordLoading || !passwordData.new || passwordData.new !== passwordData.confirm || passwordData.new.length < 6}
                            onClick={async () => {
                                setPasswordLoading(true);
                                setPasswordError(null);
                                setPasswordSaved(false);
                                try {
                                    const { error } = await supabase.auth.updateUser({
                                        password: passwordData.new
                                    });
                                    if (error) throw error;
                                    setPasswordSaved(true);
                                    setPasswordData({ current: '', new: '', confirm: '' });
                                } catch (err: any) {
                                    setPasswordError(err.message || 'Error al actualizar la contraseña');
                                } finally {
                                    setPasswordLoading(false);
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                            Actualizar Contraseña
                        </button>
                    </div>
                </div>
                ) : (
                <div className="space-y-6">
                     <p className="text-sm text-zinc-600 mb-6">Personaliza los colores de la barra lateral para que coincidan con la identidad corporativa de tu marca.</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-5 rounded-2xl border border-zinc-200 bg-zinc-50">
                            <label className="text-sm font-semibold text-zinc-900 block">Color de Texto del Menú</label>
                            <p className="text-xs text-zinc-500 pb-2">El color de los enlaces cuando no están seleccionados.</p>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="color" 
                                    value={formData.theme_menu_text || '#a1a1aa'} 
                                    onChange={e => setFormData({ ...formData, theme_menu_text: e.target.value })}
                                    className="w-12 h-12 rounded bg-transparent cursor-pointer"
                                />
                                <span className="font-mono text-zinc-600 text-sm uppercase bg-white border border-zinc-200 px-3 py-1.5 rounded-lg">{formData.theme_menu_text || '#a1a1aa'}</span>
                            </div>
                        </div>

                        <div className="space-y-3 p-5 rounded-2xl border border-zinc-200 bg-zinc-50">
                            <label className="text-sm font-semibold text-zinc-900 block">Color de Destacado (Highlight)</label>
                            <p className="text-xs text-zinc-500 pb-2">El color del texto y resaltado de la página seleccionada.</p>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="color" 
                                    value={formData.theme_menu_highlight || '#10b981'} 
                                    onChange={e => setFormData({ ...formData, theme_menu_highlight: e.target.value })}
                                    className="w-12 h-12 rounded bg-transparent cursor-pointer"
                                />
                                <span className="font-mono text-zinc-600 text-sm uppercase bg-white border border-zinc-200 px-3 py-1.5 rounded-lg">{formData.theme_menu_highlight || '#10b981'}</span>
                            </div>
                        </div>
                     </div>

                     <div className="pt-6 border-t border-zinc-100 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-900 block">Identificador de mi Taller (Slug)</label>
                            <p className="text-xs text-zinc-500 pb-2">Este nombre se usará en tu URL personalizada. Ej: <code>nexusgarage.com?t=nombre-taller</code></p>
                            <input
                                type="text"
                                placeholder="mi-taller"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none transition-all text-zinc-800 font-mono focus:ring-2"
                                style={{ 
                                    borderColor: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `${formData.theme_menu_highlight}40` : undefined,
                                    boxShadow: formData.theme_menu_highlight && formData.theme_menu_highlight !== '#10b981' ? `0 0 0 2px ${formData.theme_menu_highlight}20` : undefined
                                }}
                                value={formData.company_slug}
                                onChange={e => setFormData({ ...formData, company_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            />
                        </div>

                        {formData.company_slug && (
                        <div className="p-4 rounded-2xl" style={{ backgroundColor: `${formData.theme_menu_highlight}10`, border: `1px solid ${formData.theme_menu_highlight}20` }}>
                                <label className="text-[10px] font-bold uppercase mb-1 block" style={{ color: formData.theme_menu_highlight }}>Tu Link de Login Personalizado</label>
                                <div className="flex items-center justify-between gap-4">
                                     <code className="text-xs break-all" style={{ color: formData.theme_menu_highlight }}>
                                        {window.location.origin}/?t={formData.company_slug}
                                    </code>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/?t=${formData.company_slug}`);
                                            alert('¡Enlace copiado!');
                                        }}
                                        className="text-xs font-bold transition-colors shrink-0"
                                        style={{ color: formData.theme_menu_highlight }}
                                    >Copiar Link</button>
                                </div>
                            </div>
                        )}
                     </div>
                </div>
                )}

                {activeTab !== 'export' && (
                <div className="pt-6 flex items-center justify-between border-t border-zinc-100">
                    {saved && (
                        <span className="text-sm font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2" style={{ color: formData.theme_menu_highlight }}>
                            <CheckCircle className="w-4 h-4" />
                            Configuración guardada correctamente
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="ml-auto flex items-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
                )}
            </form>
        </div>
    );
}
