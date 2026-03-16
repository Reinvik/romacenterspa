import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Car, ArrowRight, ArrowLeft, CheckCircle, LocateFixed, Loader2, Phone, Building2, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CAR_BRANDS, CAR_MODELS } from '../lib/carData';
import { cn } from '../lib/utils';

interface PublicBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    fetchCompanies: () => Promise<{ id: string, name: string }[]>;
    onAddReminder: (reminder: any) => Promise<void>;
    fetchOccupied?: (companyId: string, date: string) => Promise<string[]>;
    fetchVehicleInfo?: (company_id: string, identificador: string) => Promise<any>;
    branding?: any;
}

const TIME_SLOTS = [
    '09:00', '10:00', '11:00', '12:00',
    '15:00', '16:00', '17:00', '18:00'
];

export function PublicBookingModal({ isOpen, onClose, fetchCompanies, onAddReminder, fetchOccupied, fetchVehicleInfo, branding }: PublicBookingModalProps) {
    const [step, setStep] = useState(1);
    const [companies, setCompanies] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [lookupValue, setLookupValue] = useState('');
    const [success, setSuccess] = useState(false);
    const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
    const [brandSearch, setBrandSearch] = useState('');
    
    const [formData, setFormData] = useState({
        company_id: '',
        company_name: '',
        planned_date: format(new Date(), 'yyyy-MM-dd'),
        planned_time: '',
        customer_name: '',
        customer_phone: '',
        vehicle_id: '', // Patente
        vehicle_model: '',
        notes: ''
    });

    // Branding Colors
    const primaryColor = branding?.theme_menu_highlight || '#D6A621';
    const primaryBg = `${primaryColor}15`;

    useEffect(() => {
        if (isOpen) {
            handleReset(); // Limpiar todo al abrir de nuevo
            setLoading(true);
            fetchCompanies().then(data => {
                // Filtrar para que solo exista Roma Center SPA
                const filtered = data.filter(c => c.name.toLowerCase().includes('roma center'));
                setCompanies(filtered);
                
                // Si encontramos a Roma Center, lo seleccionamos automáticamente y saltamos al paso 2
                const tParam = new URLSearchParams(window.location.search).get('t') || 'roma-spa';
                const romaCenter = filtered[0] || data.find(c => (c as any).slug === tParam || c.id === branding?.company_id);
                
                if (romaCenter) {
                    setFormData(prev => ({ ...prev, company_id: romaCenter.id, company_name: romaCenter.name }));
                    setStep(s => s === 1 ? 2 : s);
                }
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setLoading(false);
            });
        }
    }, [isOpen]); // Quitamos fetchCompanies de dependencias para evitar loops si cambia

    // Auto-completado por patente con debounce
    useEffect(() => {
        const patente = formData.vehicle_id.replace(/[\s\.\-·]/g, '');
        if (patente.length < 6 || !fetchVehicleInfo || !formData.company_id) return;

        const timer = setTimeout(() => {
            fetchVehicleInfo(patente, formData.company_id).then(info => {
                if (info) {
                    setFormData(prev => ({
                        ...prev,
                        customer_name: prev.customer_name || info.owner_name || '',
                        customer_phone: prev.customer_phone || info.owner_phone || '',
                        vehicle_model: prev.vehicle_model || info.model || ''
                    }));
                }
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.vehicle_id, formData.company_id, fetchVehicleInfo]);

    // Cargar disponibilidad cuando cambia la fecha o taller
    useEffect(() => {
        if (formData.company_id && formData.planned_date && fetchOccupied) {
            fetchOccupied(formData.company_id, formData.planned_date).then(slots => {
                setOccupiedSlots(slots);
            });
        }
    }, [formData.company_id, formData.planned_date, fetchOccupied]);

    // Auto-lookup when reaching Step 3 if we have data from Step 1/2
    useEffect(() => {
        if (step === 3) {
            const initialSearch = formData.vehicle_id || formData.customer_phone;
            if (initialSearch && initialSearch.length >= 4) {
                setLookupValue(initialSearch);
                handleQuickLookup(initialSearch);
            }
        }
    }, [step]);

    const handleQuickLookup = async (manualValue?: string) => {
        const val = manualValue || lookupValue;
        if (!val || val.length < 4) return;
        
        setSearching(true);
        try {
            const data = await fetchVehicleInfo(formData.company_id, val);
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    vehicle_id: data.vehicle_id || prev.vehicle_id,
                    customer_name: data.owner_name || prev.customer_name,
                    customer_phone: data.owner_phone || prev.customer_phone,
                    vehicle_model: data.model || prev.vehicle_model
                }));
            } else if (manualValue === undefined) {
                // Solo alertar si fue una búsqueda manual (click en botón)
                alert('No se encontraron datos previos. Por favor completa manualmente.');
            }
        } catch (err) {
            console.error('Lookup error:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setSuccess(false);
        setLookupValue('');
        setOccupiedSlots([]);
        setFormData({
            company_id: formData.company_id, // Mantener taller si ya estaba
            company_name: formData.company_name,
            planned_date: format(new Date(), 'yyyy-MM-dd'),
            planned_time: '',
            customer_name: '',
            customer_phone: '',
            vehicle_id: '',
            vehicle_model: '',
            notes: ''
        });
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const plannedDateISO = new Date(`${formData.planned_date}T${formData.planned_time}:00`).toISOString();
            
            await onAddReminder({
                company_id: formData.company_id,
                customer_name: formData.customer_name,
                customer_phone: formData.customer_phone,
                patente: formData.vehicle_id,
                vehicle_model: formData.vehicle_model,
                planned_date: formData.planned_date,
                planned_time: formData.planned_time,
                reminder_type: 'Cita Web',
                completed: false
            });
            setSuccess(true);
        } catch (err: any) {
            console.error('Full booking error:', err);
            if (err.message === 'SLOT_OCCUPIED') {
                alert('Lo sentimos, este horario acaba de ser reservado por otra persona. Por favor selecciona otro horario.');
                setStep(2); // Volver al paso de selección de fecha/hora
                // Gatillar refresco de slots
                if (formData.company_id && formData.planned_date && fetchOccupied) {
                    fetchOccupied(formData.company_id, formData.planned_date).then(slots => setOccupiedSlots(slots));
                }
            } else {
                alert(`Error al agendar la visita: ${err.message || 'Error desconocido'}. Por favor intenta de nuevo.`);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: primaryBg }}>
                        <CheckCircle className="w-10 h-10" style={{ color: primaryColor }} />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-2">¡Cita Agendada!</h2>
                    <p className="text-zinc-500 mb-8 leading-relaxed">
                        Tu visita a <strong>{formData.company_name}</strong> ha sido registrada para {
                            formData.planned_date === format(new Date(), 'yyyy-MM-dd') 
                                ? <span className="text-emerald-600 font-bold uppercase tracking-wider">Hoy</span>
                                : <span className="text-zinc-900 font-semibold">{format(parseISO(`${formData.planned_date.substring(0, 10)}T00:00:00`), "EEEE d 'de' MMMM", { locale: es })}</span>
                        } a las <span className="text-zinc-900 font-semibold">{formData.planned_time} hrs</span>.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-2xl font-black transition-all active:scale-95"
                        >
                            LISTO
                        </button>
                        <button
                            onClick={handleReset}
                            className="w-full py-4 text-white rounded-2xl font-black transition-all shadow-lg active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                        >
                            AGENDAR OTRO VEHÍCULO
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Agendar Visita</h2>
                        <div className="flex gap-2 mt-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={cn("h-1.5 w-10 rounded-full transition-all", step >= i ? "" : "bg-zinc-200")} style={{ backgroundColor: step >= i ? primaryColor : undefined }} />
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-200 rounded-2xl transition-all text-zinc-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    {/* STEP 1: Selección de Empresa */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                {/* Rome Center Branding Welcome */}
                                <div className="flex flex-col items-center text-center p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 mb-6">
                                    <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center p-1.5 border border-zinc-800 shadow-xl mb-4">
                                        <img src="/logo3.png" alt="Roma Center SPA" className="w-full h-full object-contain" />
                                    </div>
                                    <h3 className="text-xl font-black text-zinc-900 tracking-tight uppercase">Roma Center SPA</h3>
                                    <p className="text-xs text-zinc-500 font-bold flex flex-col items-center gap-1 mt-1">
                                        <span className="flex items-center gap-1">
                                            <LocateFixed className="w-3 h-3" style={{ color: primaryColor }} />
                                            Av. El Rosal 6065, Maipú
                                        </span>
                                        <span className="text-[10px] text-zinc-400">Santiago, Chile</span>
                                    </p>
                                    
                                    <a 
                                        href="https://wa.me/56993578563" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2 mt-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full text-[11px] font-black transition-all shadow-md hover:scale-105 active:scale-95"
                                    >
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.143c1.559.925 3.33 1.414 5.14 1.415 5.4 0 9.793-4.393 9.795-9.794.001-2.618-1.02-5.08-2.88-6.941-1.86-1.86-4.321-2.881-6.942-2.881-5.4 0-9.792 4.392-9.795 9.794-.001 2.015.526 3.984 1.524 5.73l-.991 3.619 3.712-.974zm11.235-6.175c-.3-.149-1.771-.873-2.046-.973-.275-.1-.475-.149-.675.149-.2.299-.774.973-.948 1.172-.175.199-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.487-.89-.794-1.49-1.774-1.666-2.074-.175-.3-.019-.462.131-.611.135-.134.299-.349.449-.524.15-.174.199-.299.299-.498.1-.2.05-.374-.025-.524-.075-.149-.675-1.623-.925-2.221-.244-.588-.492-.51-.675-.519-.174-.009-.374-.01-.574-.01s-.524.075-.798.374c-.275.299-1.047 1.023-1.047 2.495s1.072 2.893 1.222 3.093c.15.199 2.11 3.221 5.111 4.516.714.308 1.271.492 1.706.63.717.228 1.369.196 1.885.119.574-.085 1.771-.724 2.021-1.422.25-.698.25-1.297.175-1.422-.075-.125-.275-.199-.575-.349z"/></svg>
                                        Chatea con nosotros
                                    </a>
                                </div>

                                <label className="text-sm font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-widest">
                                    <Building2 className="w-4 h-4" style={{ color: primaryColor }} />
                                    Selecciona tu Taller
                                </label>
                                {loading ? (
                                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} /></div>
                                ) : (
                                    <div className="grid gap-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                        {companies.map(company => (
                                            <button
                                                key={company.id}
                                                onClick={() => {
                                                    setFormData({ ...formData, company_id: company.id, company_name: company.name });
                                                    handleNext();
                                                }}
                                                className={cn(
                                                    "w-full p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                                                    formData.company_id === company.id ? "bg-white shadow-xl" : "border-zinc-50 bg-zinc-50 hover:bg-white hover:border-zinc-200"
                                                )}
                                                style={{ borderColor: formData.company_id === company.id ? primaryColor : undefined }}
                                            >
                                                <span className="font-extrabold text-zinc-900 text-lg">{company.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Fecha y Hora Inteligente */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-widest">
                                    <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                                    Fecha de Visita
                                </label>
                                <div className="relative group min-h-[4rem]">
                                    <div className="absolute inset-x-0 inset-y-0 flex items-center px-4 pointer-events-none z-[30]">
                                        <span className="font-bold text-zinc-900 text-lg uppercase tracking-widest">
                                            {formData.planned_date 
                                                ? format(new Date(formData.planned_date + 'T12:00:00'), 'dd-MM-yyyy')
                                                : 'Seleccionar Fecha'}
                                        </span>
                                    </div>
                                    <input
                                        type="date"
                                        min={format(new Date(), 'yyyy-MM-dd')}
                                        className="w-full p-4 h-16 rounded-2xl border-2 border-zinc-100 focus:border-zinc-400 outline-none transition-all font-bold text-transparent bg-zinc-50 relative z-20 cursor-pointer appearance-none date-input-transparent"
                                        value={formData.planned_date}
                                        onChange={e => setFormData({ ...formData, planned_date: e.target.value, planned_time: '' })}
                                    />
                                    <style>{`
                                        .date-input-transparent::-webkit-calendar-picker-indicator {
                                            position: absolute;
                                            right: 1rem;
                                            width: 1.5rem;
                                            height: 1.5rem;
                                            cursor: pointer;
                                            opacity: 0.5;
                                        }
                                        .date-input-transparent::-webkit-inner-spin-button,
                                        .date-input-transparent::-webkit-datetime-edit {
                                            display: none;
                                        }
                                    `}</style>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-widest">
                                <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                                WHATSAPP (IMPORTANTE)
                            </p>
                            <input
                                required
                                type="tel"
                                placeholder="+56 9 9357 8563"
                                className="w-full p-6 h-20 rounded-[1.5rem] border-2 border-zinc-100 focus:border-zinc-400 outline-none transition-all font-bold text-xl text-zinc-900 bg-zinc-50"
                                value={formData.customer_phone}
                                onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                            />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-widest">
                                    <Clock className="w-4 h-4" style={{ color: primaryColor }} />
                                    Horarios Disponibles
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {TIME_SLOTS.map(slot => {
                                        const [hours, minutes] = slot.split(':').map(Number);
                                        const slotDate = new Date(formData.planned_date + 'T00:00:00');
                                        slotDate.setHours(hours, minutes, 0, 0);
                                        
                                        const now = new Date();
                                        const minTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Now + 4 hours

                                        const isPast = slotDate < minTime;
                                        const isOccupied = occupiedSlots.includes(slot) || isPast;
                                        const isSelected = formData.planned_time === slot;
                                        
                                        return (
                                            <button
                                                key={slot}
                                                disabled={isOccupied}
                                                onClick={() => setFormData({ ...formData, planned_time: slot })}
                                                className={cn(
                                                    "py-3 rounded-xl font-bold text-sm transition-all border-2 relative overflow-hidden",
                                                    isOccupied ? "bg-zinc-50 border-zinc-50 text-zinc-300 cursor-not-allowed" :
                                                    isSelected ? "text-white shadow-lg scale-105" : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                                                )}
                                                style={{ 
                                                    backgroundColor: isSelected ? primaryColor : undefined,
                                                    borderColor: isSelected ? primaryColor : undefined
                                                }}
                                            >
                                                <span className={isSelected ? "" : isOccupied ? "opacity-30" : ""}>{slot}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button onClick={handleBack} className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all">
                                    <ArrowLeft className="w-5 h-5" /> Atrás
                                </button>
                                <button 
                                    onClick={handleNext}
                                    disabled={!formData.planned_date || !formData.planned_time}
                                    className="flex-[2] py-4 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 active:scale-95"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    DATOS DE CONTACTO <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Datos de contacto */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {/* Autocomplete / Fast Lookup */}
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border-2 border-dashed border-emerald-100 mb-6">
                                <p className="text-[10px] font-black uppercase text-emerald-600 mb-2 tracking-widest text-center">Para Clientes Registrados</p>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                                        <input
                                            type="text"
                                            placeholder="Patente o Teléfono..."
                                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-emerald-200 focus:border-emerald-500 outline-none transition-all text-sm font-bold bg-white"
                                            value={lookupValue}
                                            onChange={e => setLookupValue(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleQuickLookup()}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleQuickLookup()}
                                        disabled={searching || lookupValue.length < 4}
                                        className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                                    >
                                        {searching ? '...' : (formData.customer_name ? 'Actualizar' : 'Buscar')}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Patente</label>
                                    <div className="relative">
                                        <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="AB CD 12"
                                            className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-zinc-100 focus:border-zinc-400 outline-none font-black text-zinc-900 uppercase bg-zinc-50/50"
                                            value={formData.vehicle_id}
                                            onChange={e => setFormData({ ...formData, vehicle_id: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Modelo del Auto</label>
                                    <input
                                        type="text"
                                        list="public-car-suggestions"
                                        placeholder="Ej: Toyota Yaris"
                                        className="w-full px-5 py-4 rounded-xl border-2 border-zinc-100 focus:border-zinc-400 outline-none font-bold bg-zinc-50/50"
                                        value={formData.vehicle_model}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormData({ ...formData, vehicle_model: val });
                                            
                                            if (!val) {
                                                setBrandSearch('');
                                                return;
                                            }

                                            const match = CAR_BRANDS.find(b => val.toLowerCase().startsWith(b.toLowerCase()));
                                            if (match) {
                                                setBrandSearch(match);
                                            }
                                        }}
                                    />
                                    <datalist id="public-car-suggestions">
                                        {!brandSearch && CAR_BRANDS.map(brand => (
                                            <option key={brand} value={brand} />
                                        ))}
                                        {brandSearch && CAR_MODELS[brandSearch]?.map(model => (
                                            <option key={model} value={`${brandSearch} ${model}`} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Tu Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-zinc-100 focus:border-zinc-400 outline-none font-bold bg-zinc-50/50"
                                        value={formData.customer_name}
                                        onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">WhatsApp (Importante)</label>
                                <input
                                    type="text"
                                    placeholder="+56 9..."
                                    className="w-full px-5 py-4 rounded-xl border-2 border-zinc-100 focus:border-zinc-400 outline-none font-bold bg-zinc-50/50"
                                    value={formData.customer_phone}
                                    onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">¿Cómo podemos ayudarte?</label>
                                <textarea
                                    className="w-full px-5 py-4 rounded-xl border-2 border-zinc-100 focus:border-zinc-400 outline-none resize-none font-medium bg-zinc-50/50"
                                    rows={2}
                                    placeholder="Cuéntanos brevemente el motivo..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button onClick={handleBack} className="flex-1 py-4 bg-zinc-50 text-zinc-500 rounded-2xl font-bold hover:bg-zinc-100 transition-all">
                                    Atrás
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={loading || !formData.customer_name || !formData.vehicle_id}
                                    className="flex-[2] py-4 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-50 active:scale-95"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                    CONFIRMAR CITA
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const Save = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
);
