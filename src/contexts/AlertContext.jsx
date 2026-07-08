import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

const AlertContext = createContext();

export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState(null); // { type: 'alert' | 'confirm', title, message, variant, onConfirm, onCancel }

  const showAlert = useCallback((title, message, variant = 'info') => {
    setAlertConfig({
      type: 'alert',
      title,
      message,
      variant
    });
  }, []);

  const showConfirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setAlertConfig({
        type: 'confirm',
        title,
        message,
        variant: 'confirm',
        onConfirm: () => {
          setAlertConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setAlertConfig(null);
          resolve(false);
        }
      });
    });
  }, []);

  const closeAlert = useCallback(() => {
    if (alertConfig?.type === 'confirm' && alertConfig.onCancel) {
      alertConfig.onCancel();
    } else {
      setAlertConfig(null);
    }
  }, [alertConfig]);

  const getIcon = (variant) => {
    switch (variant) {
      case 'success': return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-8 h-8 text-rose-500" />;
      case 'confirm': return <HelpCircle className="w-8 h-8 text-indigo-500" />;
      default: return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  const getBgColor = (variant) => {
    switch (variant) {
      case 'success': return 'bg-emerald-50';
      case 'error': return 'bg-rose-50';
      case 'confirm': return 'bg-indigo-50';
      default: return 'bg-blue-50';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {alertConfig && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in flex flex-col relative p-8 text-center">
            
            {/* Close Button (only for alert) */}
            {alertConfig.type === 'alert' && (
              <button 
                onClick={closeAlert}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className={clsx("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner", getBgColor(alertConfig.variant))}>
              {getIcon(alertConfig.variant)}
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2">{alertConfig.title}</h2>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed whitespace-pre-line">
              {alertConfig.message}
            </p>

            {alertConfig.type === 'alert' ? (
              <button 
                onClick={closeAlert}
                className="w-full px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold rounded-xl transition-colors"
              >
                Tamam
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => alertConfig.onCancel()}
                  className="flex-1 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                >
                  İptal
                </button>
                <button 
                  onClick={() => alertConfig.onConfirm()}
                  className="flex-1 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-indigo-600/20"
                >
                  Evet, Onaylıyorum
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </AlertContext.Provider>
  );
}
