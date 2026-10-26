import { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Type, Image, Mic } from 'lucide-react';
import { useFormatter } from '@/hooks/useFormatter';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useNotesStore } from '@/store/notesStore';

type Tab = 'text' | 'image' | 'voice';

const MODES = [
  { id: 'simple' as const,   label: 'Simple'   },
  { id: 'detailed' as const, label: 'Detailed' },
  { id: 'action' as const,   label: 'Action'   },
  { id: 'study' as const,    label: 'Study'    },
];

export default function InputPanel() {
  const [tab, setTab] = useState<Tab>('text');
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { format } = useFormatter();
  const { isProcessing, processingStep, aiMode, setAIMode } = useNotesStore();
  const { isRecording, transcript, startRecording, stopRecording } = useSpeechToText();

  const handleSubmit = useCallback(async () => {
    const input = tab === 'voice' ? transcript : text;
    if (!input.trim()) return;
    await format(input);
    setText('');
  }, [tab, text, transcript, format]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...files]);
  }, []);

  const isSubmitDisabled =
    isProcessing ||
    (tab === 'text' ? !text.trim() : tab === 'voice' ? !transcript.trim() : false);

  return (
    <div className="flex flex-col h-full">

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border">
        {(['text', 'image', 'voice'] as Tab[]).map((t) => {
          const Icon = t === 'text' ? Type : t === 'image' ? Image : Mic;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] tracking-wide font-medium border-b-[1.5px] transition-colors capitalize ${
                tab === t
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground/70'
              }`}
            >
              <Icon size={12} />
              {t}
            </button>
          );
        })}
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <span className="label">Mode</span>
        <div className="flex items-center gap-1 ml-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setAIMode(m.id)}
              className={`px-2.5 py-1 rounded-[3px] text-[11px] font-medium transition-colors ${
                aiMode === m.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">

          {tab === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full flex flex-col"
            >
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste or type your raw notes, meeting minutes, ideas…"
                className="flex-1 w-full h-full resize-none bg-transparent text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none text-[13px] leading-relaxed p-4 min-h-[300px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
                }}
              />
              <div className="flex items-center justify-between px-4 py-2 border-t border-border">
                <span className="mono text-[10px] text-muted-foreground/50">
                  {text.length} chars · {text.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <span className="text-[10px] text-muted-foreground/40">⌘↵ to format</span>
              </div>
            </motion.div>
          )}

          {tab === 'image' && (
            <motion.div
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full flex flex-col gap-3 p-4"
            >
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex-1 flex flex-col items-center justify-center rounded-[4px] border border-dashed cursor-pointer transition-colors min-h-[200px] ${
                  dragOver
                    ? 'border-foreground/40 bg-foreground/5'
                    : 'border-border hover:border-foreground/20'
                }`}
              >
                <Image size={20} className="text-muted-foreground/40 mb-2" />
                <p className="text-[12px] text-muted-foreground/60">Drop images or click to upload</p>
                <p className="text-[10px] text-muted-foreground/30 mt-1">PNG, JPG, WebP</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setImages(prev => [...prev, ...files]);
                }}
              />
              {images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="w-14 h-14 rounded-[4px] overflow-hidden border border-border">
                      <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground/40 text-center pb-2">
                OCR is simulated — paste extracted text in the Text tab.
              </p>
            </motion.div>
          )}

          {tab === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="h-full flex flex-col items-center justify-center gap-6 p-8"
            >
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-colors ${
                  isRecording
                    ? 'border-red-500/60 bg-red-500/10 text-red-400'
                    : 'border-border bg-secondary text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {isRecording ? (
                  <span className="w-3 h-3 rounded-[2px] bg-red-400" />
                ) : (
                  <Mic size={18} />
                )}
              </button>
              <p className="text-[12px] text-muted-foreground">
                {isRecording ? 'Recording — click to stop' : 'Click to start recording'}
              </p>
              {transcript && (
                <div className="w-full max-h-40 overflow-auto rounded-[4px] border border-border p-3 text-[12px] text-foreground/80 leading-relaxed">
                  {transcript}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Submit */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px] bg-foreground text-background text-[12px] font-medium transition-opacity disabled:opacity-25 hover:opacity-90"
        >
          {isProcessing ? (
            <>
              <span className="w-3 h-3 rounded-full border border-background/30 border-t-background animate-spin" />
              <span className="mono text-[11px]">{processingStep}</span>
            </>
          ) : (
            'Format Notes'
          )}
        </button>
      </div>
    </div>
  );
}
