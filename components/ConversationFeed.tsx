import React, { useEffect, useRef } from 'react';
import { Message, Speaker } from '../types';

interface ConversationFeedProps {
  messages: Message[];
  onSendMessage: (text: string, speaker: Speaker) => void;
  processing: boolean;
}

const ConversationFeed: React.FC<ConversationFeedProps> = ({ messages, processing }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, processing]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
             <p className="text-[10px] font-black tracking-[0.3em] uppercase">No Activity</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isAi = msg.speaker === Speaker.AI;
          return (
            <div key={msg.id} className={`flex flex-col ${isAi ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
               <div 
                 className={`max-w-[90%] px-4 py-2 text-[13px] font-bold leading-tight shadow-sm ${
                   isAi 
                   ? 'ios-glass text-black rounded-[18px] rounded-tr-sm border border-white/80' 
                   : 'bg-ios-blue text-white rounded-[18px] rounded-tl-sm shadow-ios-float'
                 }`}
               >
                 {msg.text}
               </div>
               <span className="text-[8px] font-black text-ios-gray/60 mt-1 px-1.5 uppercase tracking-wider">
                 {isAi ? 'Sniper' : 'Source'}
               </span>
            </div>
          );
        })}

        <div ref={bottomRef} className="h-2" />
      </div>
    </div>
  );
};

export default ConversationFeed;