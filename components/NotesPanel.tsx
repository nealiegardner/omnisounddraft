import React from 'react';
import { SquarePen } from 'lucide-react';

interface NotesPanelProps {
  notes: string;
}

const NotesPanel: React.FC<NotesPanelProps> = ({ notes }) => {
  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-black">
          <SquarePen size={18} className="text-ios-blue" />
          <h2 className="font-extrabold text-sm tracking-tight">Quick Insights</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {notes ? (
           <div className="text-sm text-black font-semibold whitespace-pre-wrap leading-relaxed opacity-90">
             {notes}
           </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <span className="text-xs font-bold uppercase tracking-widest">Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPanel;