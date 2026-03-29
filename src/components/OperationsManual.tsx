import React from 'react';
import { motion } from 'framer-motion';
import { 
  Scroll, 
  Target, 
  Zap, 
  ShieldAlert, 
  ScrollText, 
  UserCircle2, 
  Wrench, 
  FileDown,
  Eye,
  HandMetal,
  Stethoscope,
  XCircle,
  AlertTriangle,
  Monitor,
  Clock,
  ArrowRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface OperationsManualProps {
  themeColor?: string;
}

export function OperationsManual({ themeColor = '#10b981' }: OperationsManualProps) {
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    const addTitle = (text: string, size = 18) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', 'bold');
      doc.text(text, margin, y);
      y += size / 2 + 5;
    };

    const addSubtitle = (text: string, size = 14) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', 'bold');
      doc.text(text, margin, y);
      y += size / 2 + 4;
    };

    const addParagraph = (text: string, size = 11) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(text, 170);
      doc.text(lines, margin, y);
      y += (lines.length * (size / 2)) + 5;
    };

    const addBullet = (text: string, size = 11) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(`• ${text}`, 165);
        doc.text(lines, margin + 5, y);
        y += (lines.length * (size / 2)) + 5;
    };

    // Header
    addTitle('MANUAL DE OPERACIONES Y ESTÁNDARES DE ATENCIÓN');
    addSubtitle('Roma Center SpA | Plataforma: Nexus Garage');
    y += 5;
    addParagraph('Objetivo: Asegurar una comunicación transparente, profesional y estandarizada. Nuestra meta es eliminar la incertidumbre y utilizar Nexus Garage para respaldar cada diagnóstico, evitando reclamos y malos entendidos.');

    y += 10;
    addSubtitle('LAS REGLAS DE ORO');
    addBullet('Contacto Visual (3 Segundos): Al saludar y despedirse, mirar a los ojos directamente. El resto del tiempo se puede mirar el motor o la tablet.');
    addBullet('Manos Libres: Al hablar con el cliente, dejar herramientas sobre la mesa. Hablar con herramientas genera barreras intimidantes.');
    addBullet('Técnica Cirujano: Trato formal ("Usted"). Prohibido modismos como "Compadre" o "Jefe". Eleva el estatus del taller.');

    y += 10;
    addSubtitle('LÍNEAS ROJAS');
    addBullet('Efecto Tragedia: Prohibido resoplar o adelantar diagnósticos costosos sin revisar a fondo.');
    addBullet('Jerga Excesiva: No usar tecnicismos sin explicarlos en palabras simples.');
    addBullet('Entregas en Silencio: El cierre es el momento de demostrar el valor del trabajo.');
    addBullet('Precios al Ojo: Nunca dar cotizaciones en el aire. Cargar siempre en Nexus Garage.');
    addBullet('Mala Práctica: Si no está en la tablet, no existe. El sistema manda.');

    if (y > 220) { doc.addPage(); y = 20; }
    y += 10;
    addSubtitle('PROTOCOLOS DE ATENCION');
    addSubtitle('Estándar:', 12);
    addParagraph('Fase 1 (Ingreso): Presentarse como técnico especialista y registrar fallas en tablet.');
    addParagraph('Fase 2 (Diagnóstico): Mostrar fotos en link y explicar origen del problema de forma simple.');
    addParagraph('Fase 3 (Entrega): Mencionar repuestos, control de calidad y valor del historial digital.');

    y += 10;
    addSubtitle('PIT STOP (Servicio Rápido):', 12);
    addBullet('Regla Cero: Monitor con Kanban siempre encendido en sala de espera.');
    addBullet('Recepción: Confirmar reserva y mostrar avance en tiempo real en monitor.');
    addBullet('Upsell: Mostrar desgaste de piezas físicamente con tablet en mano.');
    addBullet('Cierre: Enfatizar recordatorios automáticos de WhatsApp.');

    doc.save('Manual_Operaciones_Roma_Center.pdf');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      {/* Header with Download */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-10 bg-white border border-zinc-200 rounded-3xl md:rounded-[2.5rem] shadow-sm overflow-hidden relative group/header">
        <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full -mr-16 -mt-16 group-hover/header:scale-150 transition-transform duration-700 ease-out" />
        <div className="flex items-center gap-4 md:gap-6 relative z-10">
          <div className="p-3 md:p-5 rounded-2xl md:rounded-3xl shrink-0" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
            <ScrollText className="w-8 h-8 md:w-12 md:h-12" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tighter leading-tight">Manual de Operaciones</h2>
            <p className="text-sm md:text-lg text-zinc-500 font-medium">Excelencia Clínica y Estándares Roma Center</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadPDF}
          className="flex items-center justify-center gap-3 px-6 md:px-10 py-3 md:py-5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl md:rounded-[2rem] font-bold transition-all shadow-xl active:scale-95 group relative z-10 w-full md:w-auto overflow-hidden"
        >
          <FileDown className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
          <span className="text-sm md:text-base">Descargar Manual PDF</span>
        </button>
      </div>

      {/* Objetivo */}
      <div className="p-6 md:p-12 bg-zinc-900 text-white rounded-3xl md:rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 md:p-12 opacity-5 md:opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <Target className="w-32 h-32 md:w-64 md:h-64" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3 text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">
            <div className="w-8 md:w-16 h-[1px]" style={{ backgroundColor: themeColor }}></div>
            Visión Institucional
          </div>
          <p className="text-xl md:text-4xl font-light leading-snug max-w-5xl">
            Nuestra meta es <span className="text-zinc-400 font-normal">eliminar la incertidumbre</span> y utilizar la plataforma 
            <span className="font-bold mx-2" style={{ color: themeColor }}>Nexus Garage</span> para respaldar cada diagnóstico. 
            Somos especialistas técnicos con <span className="italic">excelencia clínica</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reglas de Oro */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-zinc-900 flex items-center gap-3 px-4">
            <Zap className="w-6 h-6" style={{ color: themeColor }} />
            Reglas de Oro
          </h3>
          <div className="space-y-4">
            <RuleCard 
              icon={<Eye className="w-7 h-7" />}
              title="Contacto Visual de 3 Segundos"
              description="Mirar a los ojos al saludar y despedirse proyeta honestidad y transparencia inmediata."
              themeColor={themeColor}
            />
            <RuleCard 
              icon={<HandMetal className="w-7 h-7" />}
              title="Manos Libres vs Herramientas"
              description="Dejar herramientas al hablar. Evita barreras visuales y posturas que intimiden al cliente."
              themeColor={themeColor}
            />
            <RuleCard 
              icon={<Stethoscope className="w-7 h-7" />}
              title="Técnica 'Médico Cirujano'"
              description="Trato formal (Usted). Sin modismos informales. Eleva el estatus y profesionalismo del taller."
              themeColor={themeColor}
            />
          </div>
        </div>

        {/* Líneas Rojas */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-red-600 flex items-center gap-3 px-4">
            <ShieldAlert className="w-6 h-6" />
            Líneas Rojas
          </h3>
          <div className="bg-red-50 border border-red-100 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 space-y-6">
            <RedLineItem label="Efecto Tragedia" text="Prohibido resoplar o adelantar diagnósticos costosos sin haber revisado con detención." />
            <RedLineItem label="Jerga Incomprensible" text="Si el cliente no entiende la reparación, el valor del servicio se pierde por completo." />
            <RedLineItem label="Entrega en Silencio" text="Cerrar el ciclo es vital. Explicar el trabajo realizado es el 50% de la venta." />
            <RedLineItem label="Precios al Ojo" text="Nunca dar valores al aire. La respuesta es: 'Lo cargaré en su ficha para el valor exacto'." />
            <RedLineItem label="Mala Práctica" text="Si no está en el sistema, el trabajo no existe. El sistema es nuestra única ley." />
          </div>
        </div>
      </div>

    {/* Protocolos de Atención */}
      <div className="space-y-8 pt-8 px-2 md:px-0">
        <h3 className="text-2xl md:text-3xl font-black text-zinc-900 text-center tracking-tighter">Protocolos de Atención</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Estándar */}
          <div className="bg-white border border-zinc-200 rounded-3xl md:rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="p-6 md:p-10 bg-zinc-50 border-b border-zinc-200 group-hover:bg-white transition-colors">
              <div className="flex items-center gap-4 mb-3">
                <Wrench className="w-6 h-6 md:w-8 md:h-8 text-zinc-900" />
                <span className="font-black text-xl md:text-2xl tracking-tighter uppercase">Atención Estándar</span>
              </div>
              <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed">Reparaciones generales o diagnósticos complejos.</p>
            </div>
            <div className="p-6 md:p-10 space-y-8 md:space-y-12">
              <ProtocolStep 
                num="1" 
                title="El Ingreso" 
                quote="Hola, mi nombre es [Nombre] y seré el técnico especialista a cargo de su vehículo hoy."
                action="Anotar en Nexus Garage y avisar sobre diagnóstico digital."
              />
              <ProtocolStep 
                num="2" 
                title="Diagnóstico" 
                quote="Como puede ver en las fotografías que le enviamos a su link, el problema está en..."
                action="Justificar con evidencia digital y esperar aprobación."
              />
              <ProtocolStep 
                num="3" 
                title="La Entrega" 
                quote="Su vehículo ya está listo y acaba de pasar nuestro Control de Calidad final."
                action="Recordar que historial y garantía quedan guardados para siempre."
              />
            </div>
          </div>

          {/* Pit Stop */}
          <div className="bg-white border border-zinc-200 rounded-3xl md:rounded-[3rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="p-6 md:p-10 group-hover:bg-white transition-colors" style={{ backgroundColor: `${themeColor}05`, borderBottom: `1px solid ${themeColor}15` }}>
              <div className="flex items-center gap-4 mb-3">
                <Clock className="w-6 h-6 md:w-8 md:h-8" style={{ color: themeColor }} />
                <span className="font-black text-xl md:text-2xl tracking-tighter uppercase">Protocolo Pit Stop</span>
              </div>
              <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed">Servicios rápidos (30-60 min). Alta rotación.</p>
            </div>
            <div className="p-6 md:p-10 space-y-8 md:space-y-12">
              <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center gap-4" style={{ backgroundColor: `${themeColor}10`, border: `1px solid ${themeColor}20` }}>
                <Monitor className="w-5 h-5 md:w-8 md:h-8 shrink-0" style={{ color: themeColor }} />
                <p className="text-xs md:text-base font-black leading-tight">REGLA CERO: Monitor visible con Kanban de Nexus Garage siempre activo.</p>
              </div>
              <ProtocolStep 
                num="1" 
                title="Recepción" 
                quote="Su patente ya aparece en el monitor y en 30 minutos su vehículo estará listo."
                action="Bajar ansiedad mostrando control total del tiempo."
              />
              <ProtocolStep 
                num="2" 
                title="Upsell Digital" 
                quote="Notamos que su [Pieza] requiere cambio. Aquí le muestro el detalle en su ficha."
                action="Inspección visual con tablet y pieza física en mano."
              />
              <ProtocolStep 
                num="3" 
                title="Cierre de Ciclo" 
                quote="El registro quedó guardado. Recibirá un recordatorio por WhatsApp en unos meses."
                action="Fidelizar y asegurar la vida útil del vehículo."
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RuleCard({ icon, title, description, themeColor }: { icon: React.ReactNode, title: string, description: string, themeColor: string }) {
  return (
    <div className="p-5 md:p-8 bg-white border border-zinc-200 rounded-3xl md:rounded-[2.5rem] flex items-start md:items-center gap-4 md:gap-6 hover:border-zinc-300 hover:shadow-xl transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-50 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="shrink-0 p-3 md:p-5 rounded-2xl md:rounded-3xl bg-zinc-50 group-hover:scale-110 transition-transform relative z-10" style={{ color: themeColor }}>
        {icon}
      </div>
      <div className="space-y-1 relative z-10">
        <h4 className="font-bold text-base md:text-xl text-zinc-900 tracking-tight">{title}</h4>
        <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );
}

function RedLineItem({ label, text }: { label: string, text: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-1.5 rounded-full bg-red-100 shrink-0 mt-0.5">
        <XCircle className="w-5 h-5 text-red-600" />
      </div>
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase text-red-700 tracking-[0.2em]">EL {label}</span>
        <p className="text-sm text-red-900 font-bold leading-snug">{text}</p>
      </div>
    </div>
  );
}

function ProtocolStep({ num, title, quote, action }: { num: string, title: string, quote: string, action: string }) {
  return (
    <div className="flex gap-4 md:gap-8">
      <div className="shrink-0 w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-base md:text-xl shadow-lg">
        {num}
      </div>
      <div className="space-y-4 pt-1 flex-1">
        <h4 className="font-black text-zinc-900 uppercase tracking-tighter text-xs md:text-sm">{title}</h4>
        <div className="bg-zinc-50 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-zinc-100 border-l-4 border-l-zinc-300 italic text-xs md:text-base text-zinc-600 leading-relaxed relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Scroll className="w-12 h-12 md:w-20 md:h-20" />
          </div>
          "{quote}"
        </div>
        <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black text-zinc-400">
          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 shrink-0" style={{ color: '#10b981' }} />
          <span className="uppercase tracking-[0.15em] md:tracking-widest">{action}</span>
        </div>
      </div>
    </div>
  );
}
