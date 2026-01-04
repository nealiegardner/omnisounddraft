
import React, { useEffect, useState } from 'react';
import { Mic, Zap } from 'lucide-react';
import { SniperResponse } from '../types';

interface SniperHUDProps {
  lastResponse: SniperResponse | null;
  processing: boolean; 
  volume?: number;
}

const SniperHUD: React.FC<SniperHUDProps> = ({ lastResponse, processing, volume = 0 }) => {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (lastResponse && !lastResponse.isSilent && lastResponse.raw !== "Speaking...") {
      setShowResult(true);
      const timer = setTimeout(() => setShowResult(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [lastResponse]);

  const isHit = lastResponse && !lastResponse.isSilent && lastResponse.raw !== "Speaking...";
  const volPercent = Math.min(100, volume * 2000);

  // Active Result State (Intelligence Bubble)
  if (showResult && isHit) {
      return (
        <div className="w-full ios-glass rounded-[24px] shadow-ios-float border border-white/60 p-4 animate-in slide-in-from-top-4 fade-in duration-500 ease-out">
           <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0 shadow-lg">
                 <Zap size={20} className="text-white fill-white animate-pulse" />
              </div>
              <div className="flex-1 pt-0.5">
                 <div className="text-[9px] font-extrabold text-ios-blue uppercase tracking-[0.2em] mb-1 opacity-80">INTELLIGENCE SHARD</div>
                 <div className="text-lg font-extrabold text-black leading-tight tracking-tight">
                    {lastResponse.raw}
                 </div>
              </div>
           </div>
        </div>
      );
  }

  // Listening State (Fluid Dynamic Island)
  if (processing) {
     return (
       <div className="w-full h-12 ios-glass-dark rounded-full flex items-center justify-between px-5 shadow-ios-float animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-3">
             <div className="relative flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-ios-red rounded-full animate-ping absolute opacity-40" />
                <div className="w-2.5 h-2.5 bg-ios-red rounded-full shadow-[0_0_12px_rgba(255,59,48,0.8)]" />
             </div>
             <span className="text-white text-[11px] font-black tracking-widest uppercase">Monitoring</span>
          </div>
          
          <div className="flex items-center gap-1.5 h-6">
             {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-ios-blue rounded-full transition-all duration-75 ease-out shadow-[0_0_8px_rgba(0,122,255,0.4)]" 
                  style={{ height: `${Math.max(4, Math.random() * (volPercent / 2.5))}px`, opacity: 0.5 + (i * 0.05) }} 
                />
             ))}
          </div>
       </div>
     );
  }

  // Ready State with Pulse
  return (
    <div className="w-full h-11 ios-glass rounded-full border border-white/50 flex items-center justify-center px-4 gap-2.5 shadow-sm group">
        <div className="relative">
          <div className="w-2 h-2 bg-ios-green rounded-full animate-ping absolute opacity-40" />
          <Mic size={16} className="text-ios-green relative z-10" />
        </div>
        <span className="text-[11px] font-black text-ios-green tracking-[0.15em] uppercase animate-pulse">System Ready</span>
    </div>
  );
};

export default SniperHUD;
