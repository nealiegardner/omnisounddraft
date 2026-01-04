import React, { useRef, useState } from 'react';
import { Save, Check, Paperclip, FileText } from 'lucide-react';

interface KnowledgeBaseProps {
  knowledge: string;
  setKnowledge: (k: string) => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ knowledge, setKnowledge }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const separator = `\n\n// --- IMPORTED DATA: ${file.name} ---\n`;
        setKnowledge(knowledge + separator + text);
        handleSave();
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* iOS Toolbar */}
      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between bg-white/40 backdrop-blur-md sticky top-0 z-10">
        <h2 className="font-extrabold text-sm text-black tracking-tight">INTEL CONTEXT</h2>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".txt,.md,.json,.csv,.log"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-ios-blue active:opacity-40 p-1 transition-opacity"
          >
            <Paperclip size={20} />
          </button>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              isSaving 
                ? 'bg-ios-green text-white' 
                : 'bg-ios-blue/10 text-ios-blue active:scale-95'
            }`}
          >
            {isSaving ? <Check size={12} strokeWidth={4} /> : 'Sync'}
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-2">
        <textarea
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          className="w-full h-full min-h-[400px] bg-transparent text-black font-semibold text-sm p-4 resize-none focus:outline-none placeholder:text-ios-gray/40 leading-relaxed no-scrollbar"
          placeholder="Inject context here..."
        />
      </div>
    </div>
  );
};

export default KnowledgeBase;