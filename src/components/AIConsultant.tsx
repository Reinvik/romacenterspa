import * as React from 'react';
import { Send, Bot, User, Key, Trash2, Sparkles, AlertCircle, Loader2, BarChart3, TrendingUp, ShieldCheck } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cn } from '../lib/utils';
import { Ticket, Part, Customer, SalaVenta, GarageSettings } from '../types';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface AIConsultantProps {
  tickets: Ticket[];
  parts: Part[];
  customers: Customer[];
  salaVentas: SalaVenta[];
  mechanics: any[];
  settings: GarageSettings | null;
}

export function AIConsultant({ tickets, parts, customers, salaVentas, mechanics, settings }: AIConsultantProps) {
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem('gemini_api_key') || '');
  const [isKeyValid, setIsKeyValid] = React.useState(!!apiKey);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showKeyInput, setShowKeyInput] = React.useState(!apiKey);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setIsKeyValid(!!key);
    setShowKeyInput(false);
  };

  const getWorkshopContext = () => {
    const activeTickets = tickets.filter(t => t.status !== 'Finalizado' && t.status !== 'Entregado');
    const finishedTickets = tickets.filter(t => t.status === 'Finalizado' || t.status === 'Entregado');

    // 1. Top Insumos/Repuestos
    const partCounts: Record<string, {name: string, count: number}> = {};
    salaVentas.forEach(sale => {
      sale.items?.forEach(item => {
        const itemAny = item as any;
        const key = itemAny.part_id || itemAny.id || item.nombre;
        if (!partCounts[key]) partCounts[key] = { name: item.nombre, count: 0 };
        partCounts[key].count += (item.cantidad || 1);
      });
    });
    finishedTickets.forEach(t => {
      t.spare_parts?.forEach(part => {
        const key = part.part_id || part.descripcion;
        if (!partCounts[key]) partCounts[key] = { name: part.descripcion, count: 0 };
        partCounts[key].count += (part.cantidad || 1);
      });
    });
    const topParts = Object.values(partCounts)
      .sort((a,b) => b.count - a.count)
      .slice(0, 5)
      .map(p => `- ${p.name}: ${p.count} uds.`);

    // 2. Top Marcas
    const brandCounts: Record<string, number> = {};
    finishedTickets.forEach(t => {
      const brand = t.model.split(' ')[0].toUpperCase();
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });
    const topBrands = Object.entries(brandCounts)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand, count]) => `- ${brand}: ${count} tickets`);
    
    // 3. Desglose por mecánico (Volumen de tickets operados)
    const mechanicPerformance = mechanics.map(m => {
      const closed = finishedTickets.filter(t => t.mechanic_id === m.id || t.mechanic === m.name).length;
      const active = activeTickets.filter(t => t.mechanic_id === m.id || t.mechanic === m.name).length;
      return `- ${m.name}: ${closed} cerrados, ${active} activos`;
    });

    const lowStockParts = parts.filter(p => p.stock <= p.min_stock);
    
    const context = `
Eres el "Cerebro Operativo" de ${settings?.workshop_name || 'Roma Center SPA'}. 
TU REGLA #1: Sé extremadamente conciso. Menos prosa, más datos y acción. Analiza solo rendimiento, volumen y eficiencia. IGNORA POR COMPLETO EL DINERO Y LOS COSTOS.

VOLUMEN Y RENDIMIENTO MECÁNICOS:
${mechanicPerformance.join('\n')}

TOP 5 MARCAS DE VEHÍCULOS (Histórico cerrado):
${topBrands.length > 0 ? topBrands.join('\n') : '- Sin datos suficientes'}

TOP 5 INSUMOS/SERVICIOS MÁS DEMANDADOS:
${topParts.length > 0 ? topParts.join('\n') : '- Sin datos suficientes'}

ESTADO GENERAL DEL TALLER:
- Vehículos en reparación (Activos): ${activeTickets.length}
- Inventario: ${parts.length} SKU totales. ${lowStockParts.length} repuestos en stock crítico o agotados.

DIRECTRICES:
1. Responde con viñetas o tablas si es posible. Evita párrafos largos.
2. Identifica cuellos de botella: mecánicos con demasiada carga, o bajo rendimiento, y sugiere reasignaciones.
3. Evalúa las marcas y repuestos más usados para asegurar que el taller se enfoque en ellos.
4. Habla siempre en Español (Chile). NUNCA menciones $ni valores económicos, concéntrate 100% en volumen y operaciones.
`;
    return context;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !apiKey || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

      const chat = model.startChat({
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      // Añadimos el contexto del taller en la primera interacción o como recordatorio sutil
      const fullPrompt = messages.length === 0 
        ? `${getWorkshopContext()}\n\nConsulta del usuario: ${input}`
        : input;

      const result = await chat.sendMessage(fullPrompt);
      const response = await result.response;
      const text = response.text();

      const aiMessage: Message = {
        role: 'model',
        content: text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error con Gemini:', error);
      const errorMessage: Message = {
        role: 'model',
        content: `Lo siento, hubo un error al conectar con Gemini. Por favor verifica tu API Key. Detalle: ${error.message || 'Error desconocido'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm('¿Estás seguro de que deseas borrar toda la conversación?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 leading-none">Consultor IA</h2>
            <p className="text-xs text-zinc-500 mt-1">Estrategia y Mejora Continua</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={cn(
              "p-2 rounded-lg transition-all border",
              isKeyValid ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-amber-600 border-amber-100 bg-amber-50"
            )}
            title="Configurar API Key"
          >
            <Key className="w-5 h-5" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Borrar chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* API Key Wizard */}
        {showKeyInput && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-emerald-600 p-4 flex items-center gap-3 text-white">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="font-bold">Configuración de Gemini</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-600">
                Para utilizar el Consultor IA, necesitas una API Key de Google Gemini. Es gratuita (tier estándar) y permite que la IA acceda a tus datos de forma segura.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tu API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Pega aquí tu API Key (AIza...)"
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    onClick={() => saveApiKey(apiKey)}
                    className="bg-zinc-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-black transition-colors"
                  >
                    Guardar
                  </button>
                </div>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:underline inline-block mt-2"
                >
                  Obtener API Key gratuita →
                </a>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !showKeyInput && (
          <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto border border-zinc-200 shadow-inner">
              <Bot className="w-10 h-10 text-zinc-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-zinc-900">¡Hola! Soy tu Consultor IA</h3>
              <p className="text-zinc-500">
                Tengo acceso a tus tickets, inventario y ventas. ¿En qué puedo ayudarte hoy?
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {[
                { title: "Rendimiento Mecánicos", desc: "¿Qué mecánico está resolviendo más tickets y cuál podría necesitar apoyo?", icon: User },
                { title: "Top Marcas", desc: "¿Cuáles son las marcas de vehículos que más nos visitan?", icon: TrendingUp },
                { title: "Insumos y Repuestos", desc: "¿Cuáles son los insumos que más estamos utilizando y qué compras priorizo?", icon: Sparkles },
                { title: "Eficiencia General", desc: "¿Qué cuellos de botella ves considerando el trabajo activo frente al inventario?", icon: BarChart3 }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => setInput(item.desc)}
                  className="p-4 bg-white border border-zinc-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-zinc-50 rounded-lg group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-zinc-800">{item.title}</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="max-w-6xl mx-auto space-y-6 w-full">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border",
                msg.role === 'user' ? "bg-zinc-900 text-white border-zinc-800" : "bg-white text-emerald-600 border-zinc-200"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl p-4 shadow-sm relative",
                msg.role === 'user' 
                  ? "bg-zinc-900 text-white" 
                  : "bg-white border border-zinc-200 text-zinc-800"
              )}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
                <div className={cn(
                  "text-[10px] mt-2 opacity-40",
                  msg.role === 'user' ? "text-right" : "text-left"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center border border-zinc-300">
                <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm w-32">
                <div className="h-4 bg-zinc-100 rounded animate-pulse" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-zinc-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto flex gap-3 w-full">
          <div className="flex-1 relative group">
            <input
              type="text"
              placeholder={isKeyValid ? "Pregúntame lo que quieras sobre el taller..." : "Configura tu API Key arriba para chatear"}
              disabled={!isKeyValid || isLoading}
              className="w-full bg-white border border-zinc-200 rounded-2xl pl-5 pr-12 py-4 shadow-xl shadow-zinc-200/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all disabled:opacity-50 text-zinc-800"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isKeyValid || isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-center text-zinc-400 mt-2">
          Consultor IA puede cometer errores. Verifica la información financiera crítica.
        </p>
      </div>

      {!isKeyValid && (
        <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] pointer-events-none flex items-center justify-center">
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-lg text-amber-800 flex items-center gap-3 animate-bounce">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">API KEY REQUERIDA</span>
            </div>
        </div>
      )}
    </div>
  );
}
