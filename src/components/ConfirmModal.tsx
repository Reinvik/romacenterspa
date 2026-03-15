import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, isDestructive = true }: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
          </div>
          <p className="text-zinc-600 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onCancel(); }} 
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors shadow-sm ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
