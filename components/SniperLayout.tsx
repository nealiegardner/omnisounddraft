
import React, { useState, useRef, useEffect } from 'react';
import ConversationFeed from './ConversationFeed';
import SniperHUD from './SniperHUD';
import NotesPanel from './NotesPanel';
import NotebookView from './NotebookView';
import { Message, Speaker, DEFAULT_KNOWLEDGE, SniperResponse } from '../types';
import { SniperLiveClient } from '../services/geminiService';
import { Activity, Book, Wifi, WifiOff, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'earai_knowledge_db_v1';

const SniperLayout: React.FC = () => {
  const [knowledge, setKnowledge] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || DEFAULT_KNOWLEDGE;
    } catch (e) {
      return DEFAULT_KNOWLEDGE;
    }
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [notes, setNotes] = useState("");
  
  const [currentView, setCurrentView] = useState<'live' | 'notebook'>('live');

  const clientRef = useRef<SniperLiveClient | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, knowledge);
  }, [knowledge]);

  const toggleConnection = async () => {
    if (isConnected) {
      await clientRef.current?.disconnect();
      setIsConnected(false);
      setIsSpeaking(false);
      setVolume(0);
      return;
    }

    const client = new SniperLiveClient();
    clientRef.current = client;
    client.onMessageUpdate = (msg) => {
      setMessages(prev => {
        const existingIndex = prev.findIndex(m => m.id === msg.id);
        if (existingIndex !== -1) {
          const newArr = [...prev];
          newArr[existingIndex] = { ...newArr[existingIndex], text: msg.text };
          return newArr;
        }
        return [...prev, msg];
      });
    };
    client.onStatusChange = (speaking) => setIsSpeaking(speaking);
    client.onVolumeChange = (vol) => setVolume(vol);
    try {
      await client.connect(knowledge);
      setIsConnected(true);
    } catch (e) {
      console.error("Connection error", e);
    }
  };

  const lastResponse: SniperResponse | null = isSpeaking 
    ? { raw: "Speaking...", isSilent: false, timestamp: Date.now() } 
    : messages.length > 0 && messages[messages.length-1].speaker === Speaker.AI 
      ? { raw: messages[messages.length-1].text, isSilent: false, timestamp: messages[messages.length-1].timestamp }
      : null;

  return (
    <div className="flex flex-col h-screen w-full font-sans overflow-hidden select-none relative bg-ios-bg">
      
      <header className="safe-pt px-4 z-50 fixed top-0 left-0 right-0 pointer-events-none">
         <div className="mt-4 pointer-events-auto ios-glass rounded-[36px] shadow-ios-glass border border-white/60 px-6 py-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-lg">
                      <ShieldCheck size={16} className="text-white" />
                   </div>
                   <h1 className="text-xl font-black tracking-tight text-black uppercase">Sniper</h1>
                </div>
                
                <button 
                  onClick={toggleConnection}
                  className={`h-10 px-6 rounded-full font-black text-[11px] tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-lg ${
                    isConnected ? 'bg-ios-red text-white' : 'bg-ios-blue text-white'
                  }`}
                >
                  {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {isConnected ? 'LIVE' : 'ENGAGE'}
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                <SniperHUD lastResponse={lastResponse} processing={isConnected} volume={volume} />
            </div>
         </div>
      </header>

      <main 
        className="flex-1 overflow-hidden relative z-10 px-4 pb-[110px] flex flex-col"
        style={{ paddingTop: '180px' }}
      >
        {currentView === 'live' ? (
          <div className="flex flex-col gap-4 h-full">
             <div className="h-[200px] shrink-0 ios-glass rounded-[28px] shadow-ios-float overflow-hidden border border-white/50">
                <ConversationFeed messages={messages} onSendMessage={() => {}} processing={isConnected}/>
             </div>
             <div className="flex-1 ios-glass rounded-[28px] shadow-ios-float overflow-hidden border border-white/50 opacity-40">
                <NotesPanel notes={notes} />
             </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <NotebookView liveNotes={notes} knowledge={knowledge} setKnowledge={setKnowledge} />
          </div>
        )}
      </main>

      <nav className="safe-pb px-8 pb-6 fixed bottom-0 left-0 right-0 z-50">
        <div className="ios-glass rounded-full h-18 shadow-ios-float flex items-center justify-around px-8 border border-white/60 max-w-sm mx-auto">
          <button onClick={() => setCurrentView('live')} className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'live' ? 'text-ios-blue scale-110' : 'text-ios-gray/40'}`}>
            <Activity size={26} strokeWidth={currentView === 'live' ? 3 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Ops</span>
          </button>
          <button onClick={() => setCurrentView('notebook')} className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'notebook' ? 'text-ios-blue scale-110' : 'text-ios-gray/40'}`}>
            <Book size={26} strokeWidth={currentView === 'notebook' ? 3 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Journal</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default SniperLayout;
