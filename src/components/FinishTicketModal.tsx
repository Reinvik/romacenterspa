import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Banknote, X } from 'lucide-react';
import { PaymentMethod } from '../types';

interface FinishTicketModalProps {
  isOpen: boolean;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  onCancel: () => void;
}

export function FinishTicketModal({ isOpen, onConfirm, onCancel }: FinishTicketModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tarjeta');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 border border-zinc-100">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">Finalizar Trabajo</h3>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Confirmación de Cierre</p>
            </div>
          </div>
          
          <p className="text-zinc-600 text-sm leading-relaxed mb-8 font-medium">
            ¿Cómo se realizó el pago de este servicio? Se registrará para la cuadratura de caja diaria.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('Efectivo')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                paymentMethod === 'Efectivo' 
                  ? 'bg-emerald-50 border-emerald-500 shadow-md translate-y-[-2px]' 
                  : 'bg-white border-zinc-100 hover:border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors ${paymentMethod === 'Efectivo' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <span className={`font-black text-sm ${paymentMethod === 'Efectivo' ? 'text-emerald-900' : 'text-zinc-500'}`}>Efectivo</span>
              </div>
              {paymentMethod === 'Efectivo' && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
            </button>

            <button
              onClick={() => setPaymentMethod('Tarjeta')}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                paymentMethod === 'Tarjeta' 
                  ? 'bg-blue-50 border-blue-500 shadow-md translate-y-[-2px]' 
                  : 'bg-white border-zinc-100 hover:border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors ${paymentMethod === 'Tarjeta' ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className={`font-black text-sm ${paymentMethod === 'Tarjeta' ? 'text-blue-900' : 'text-zinc-500'}`}>Tarjeta</span>
              </div>
              {paymentMethod === 'Tarjeta' && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
            </button>
          </div>
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 px-4 py-3.5 text-xs font-black text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-2xl transition-all uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(paymentMethod)} 
            className="flex-[1.5] px-4 py-3.5 text-xs font-black text-white bg-zinc-900 hover:bg-black rounded-2xl transition-all shadow-lg uppercase tracking-widest active:scale-95"
          >
            Confirmar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
