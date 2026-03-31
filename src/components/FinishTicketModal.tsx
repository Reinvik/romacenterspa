import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Banknote, FileText, Check, Send } from 'lucide-react';
import { PaymentMethod, DocumentType } from '../types';

interface FinishTicketModalProps {
  isOpen: boolean;
  onConfirm: (paymentMethod: PaymentMethod, documentType: DocumentType, rutEmpresa?: string, razonSocial?: string, transferData?: string) => void;
  onCancel: () => void;
}

export function FinishTicketModal({ isOpen, onConfirm, onCancel }: FinishTicketModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tarjeta');
  const [documentType, setDocumentType] = useState<DocumentType>('Boleta');
  const [rutEmpresa, setRutEmpresa] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [transferData, setTransferData] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 border border-zinc-100">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">Finalizar Trabajo</h3>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Confirmación de Cierre</p>
            </div>
          </div>
          
          <p className="text-zinc-600 text-sm leading-relaxed mb-6 font-medium">
            ¿Cómo se realizó el pago y qué tipo de documento se emite?
          </p>

          <div className="space-y-4">
            {/* Payment Method Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('Efectivo')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  paymentMethod === 'Efectivo' 
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                    : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span className="font-black text-xs uppercase tracking-wider">Efectivo</span>
              </button>

              <button
                onClick={() => setPaymentMethod('Tarjeta')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  paymentMethod === 'Tarjeta' 
                    ? 'bg-blue-50 border-blue-500 shadow-sm' 
                    : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="font-black text-xs uppercase tracking-wider">Tarjeta</span>
              </button>

              <button
                onClick={() => setPaymentMethod('Transferencia')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all col-span-2 ${
                  paymentMethod === 'Transferencia' 
                    ? 'bg-purple-50 border-purple-500 shadow-sm' 
                    : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200'
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="font-black text-xs uppercase tracking-wider">Transferencia</span>
              </button>
            </div>

            {/* Transfer Details */}
            {paymentMethod === 'Transferencia' && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-1">Datos de Transferencia</label>
                <textarea
                  value={transferData}
                  onChange={(e) => setTransferData(e.target.value)}
                  placeholder="Ej: Banco Estado, Op: 123456"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all resize-none h-20"
                />
              </div>
            )}

            {/* Document Type Selection (Boleta/Factura) */}
            <div className="pt-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2 px-1">Tipo de Documento</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDocumentType('Boleta')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    documentType === 'Boleta' 
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' 
                      : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="font-black text-xs uppercase tracking-wider">Boleta</span>
                  {documentType === 'Boleta' && <Check className="w-3 h-3 ml-auto" />}
                </button>

                <button
                  onClick={() => setDocumentType('Factura')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    documentType === 'Factura' 
                      ? 'bg-amber-500 border-amber-500 text-white shadow-md' 
                      : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="font-black text-xs uppercase tracking-wider">Factura</span>
                  {documentType === 'Factura' && <Check className="w-3 h-3 ml-auto" />}
                </button>
              </div>
            </div>

            {/* Business Info for Factura */}
            {documentType === 'Factura' && (
              <div className="space-y-4 pt-4 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-1">RUT Empresa</label>
                  <input
                    type="text"
                    value={rutEmpresa}
                    onChange={(e) => setRutEmpresa(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-1">Razón Social</label>
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Empresa S.A."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-zinc-900 font-bold placeholder:text-zinc-300 transition-all uppercase"
                  />
                </div>
              </div>
            )}
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
            onClick={() => onConfirm(paymentMethod, documentType, rutEmpresa || undefined, razonSocial || undefined, transferData || undefined)} 
            className="flex-[1.5] px-4 py-3.5 text-xs font-black text-white bg-zinc-900 hover:bg-black rounded-2xl transition-all shadow-lg uppercase tracking-widest active:scale-95"
          >
            Confirmar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
