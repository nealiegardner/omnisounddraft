
import React, { useState, useRef } from 'react';
import { CheckCircle, Upload, Plus, Database, Activity, Save, Check } from 'lucide-react';

interface NotebookViewProps {
  liveNotes: string;
  knowledge: string;
  setKnowledge: (k: string) => void;
}

const NotebookView: React.FC<NotebookViewProps> = ({ 
  liveNotes, 
  knowledge,
  setKnowledge
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const timestamp = new Date().toLocaleString();
        const separator = `\n\n// --- UPLOAD: ${file.name} (${timestamp}) ---\n`;
        setKnowledge(knowledge + separator + text);
        setTimeout(() => {
          setIsUploading(false);
          handleSync();
        }, 800);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col pb-10 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Intel Context Editor (Manual & Upload) */}
      <section className="px-5">
         <div className="flex items-center justify-between ml-1 mb-3">
            <h2 className="text-[13px] font-bold text-ios-gray uppercase tracking-widest">Intel Context</h2>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors ${isSyncing ? 'bg-ios-green/10' : 'bg-ios-blue/10'}`}>
               <Database size={10} className={isSyncing ? 'text-ios-green' : 'text-ios-blue'} />
               <span className={`text-[10px] font-black uppercase ${isSyncing ? 'text-ios-green' : 'text-ios-blue'}`}>
                 {isSyncing ? 'Synced' : 'Active Engine'}
               </span>
            </div>
         </div>
         
         <div className="ios-glass rounded-[28px] shadow-ios-float border border-white/60 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white/20">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-ios-blue/10 rounded-lg flex items-center justify-center">
                    <Database size={16} className="text-ios-blue" />
                  </div>
                  <span className="text-xs font-black text-black tracking-tight uppercase">Knowledge Base</span>
               </div>
               
               <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".txt,.md,.json,.csv,.log"
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ios-blue active:scale-75 transition-all bg-ios-blue/10"
                  >
                    {isUploading ? <Activity size={16} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
                  </button>
                  <button 
                    onClick={handleSync}
                    className={`h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                      isSyncing ? 'bg-ios-green text-white shadow-lg shadow-ios-green/20' : 'bg-ios-blue text-white shadow-lg shadow-ios-blue/20'
                    }`}
                  >
                    {isSyncing ? <Check size={12} strokeWidth={4} /> : 'Sync'}
                  </button>
               </div>
            </div>
            
            <textarea
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              className="w-full h-48 bg-transparent text-black font-semibold text-[14px] p-5 resize-none focus:outline-none placeholder:text-ios-gray/30 leading-relaxed no-scrollbar"
              placeholder="Inject raw intel or upload files..."
            />
         </div>
      </section>

      {/* 2. Live Insights Summary */}
      <section className="px-5">
         <h2 className="text-[13px] font-bold text-ios-gray uppercase tracking-widest ml-1 mb-3">Session Insights</h2>
         <div className="ios-glass rounded-[28px] p-6 shadow-ios-float border border-white/60">
            {liveNotes ? (
              <div className="text-[16px] text-black leading-relaxed font-bold animate-in fade-in duration-300">
                {liveNotes}
              </div>
            ) : (
              <div className="text-[14px] text-ios-gray font-bold italic py-8 flex flex-col items-center gap-4 opacity-40">
                <div className="w-12 h-12 bg-ios-gray/10 rounded-full flex items-center justify-center">
                  <Activity size={24} className="animate-pulse" />
                </div>
                <span>Monitoring conversation flow...</span>
              </div>
            )}
         </div>
      </section>

      {/* Quick Stats / Feedback */}
      <section className="px-5">
         <div className="grid grid-cols-2 gap-4">
            <div className="ios-glass rounded-[20px] p-4 border border-white/40">
               <div className="text-[9px] font-black text-ios-gray uppercase tracking-widest mb-1">Context Size</div>
               <div className="text-lg font-black text-black">{(knowledge.length / 1024).toFixed(1)} KB</div>
            </div>
            <div className="ios-glass rounded-[20px] p-4 border border-white/40">
               <div className="text-[9px] font-black text-ios-gray uppercase tracking-widest mb-1">Status</div>
               <div className="text-lg font-black text-ios-green flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-ios-green rounded-full animate-pulse" />
                  Ready
               </div>
            </div>
         </div>
      </section>
    </div>
  );
};

export default NotebookView;
