import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckSquare, Square, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { useNotesStore, type Block, type BlockType } from '@/store/notesStore';

function NoteBlock({ block, noteId }: { block: Block; noteId: string }) {
  const { updateBlock, removeBlock } = useNotesStore();

  if (block.type === 'heading') {
    return (
      <motion.div layout className="group flex items-start gap-2 py-2">
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={e => updateBlock(noteId, block.id, { content: e.currentTarget.textContent || '' })}
          className="flex-1 text-[13px] font-semibold text-foreground outline-none tracking-tight leading-snug"
        >
          {block.content}
        </p>
        <button
          onClick={() => removeBlock(noteId, block.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground transition-opacity mt-0.5 shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </motion.div>
    );
  }

  if (block.type === 'summary') {
    return (
      <motion.div layout className="border-l-2 border-foreground/20 pl-3 py-1 mb-3">
        <span className="label block mb-1">Summary</span>
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={e => updateBlock(noteId, block.id, { content: e.currentTarget.textContent || '' })}
          className="text-[13px] text-foreground/80 leading-relaxed outline-none"
        >
          {block.content}
        </p>
      </motion.div>
    );
  }

  if (block.type === 'warning') {
    return (
      <motion.div layout className="flex items-start gap-2 py-1.5 mb-1">
        <AlertTriangle size={11} className="text-warning/70 mt-0.5 shrink-0" />
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={e => updateBlock(noteId, block.id, { content: e.currentTarget.textContent || '' })}
          className="text-[12px] text-muted-foreground outline-none flex-1 leading-relaxed"
        >
          {block.content}
        </p>
      </motion.div>
    );
  }

  if (block.type === 'tag-group') {
    const tags = block.content.split(', ');
    return (
      <motion.div layout className="flex flex-wrap gap-1.5 py-2 mb-1">
        {tags.map(tag => (
          <span
            key={tag}
            className="mono px-1.5 py-0.5 rounded-[3px] border border-border text-[10px] text-muted-foreground"
          >
            #{tag}
          </span>
        ))}
      </motion.div>
    );
  }

  if (block.type === 'task') {
    return (
      <motion.div layout className="group flex items-start gap-2 py-1">
        <button
          onClick={() => updateBlock(noteId, block.id, { completed: !block.completed })}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {block.completed
            ? <CheckSquare size={13} className="text-foreground" />
            : <Square size={13} />
          }
        </button>
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={e => updateBlock(noteId, block.id, { content: e.currentTarget.textContent || '' })}
          className={`flex-1 text-[13px] outline-none leading-relaxed ${
            block.completed ? 'line-through text-muted-foreground/50' : 'text-foreground/85'
          }`}
        >
          {block.content}
        </span>
        <button
          onClick={() => removeBlock(noteId, block.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground transition-opacity mt-0.5 shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </motion.div>
    );
  }

  if (block.type === 'bullet') {
    return (
      <motion.div layout className="group flex items-start gap-2.5 py-1">
        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-[7px] shrink-0" />
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={e => updateBlock(noteId, block.id, { content: e.currentTarget.textContent || '' })}
          className="flex-1 text-[13px] text-foreground/80 outline-none leading-relaxed"
        >
          {block.content}
        </p>
        <button
          onClick={() => removeBlock(noteId, block.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground transition-opacity mt-0.5 shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </motion.div>
    );
  }

  // paragraph
  return (
    <motion.div layout className="group flex items-start gap-2 py-1">
      <p
        contentEditable
        suppressContentEditableWarning
        onBlur={e => updateBlock(noteId, block.id, { content: e.currentTarget.textContent || '' })}
        className="flex-1 text-[13px] text-foreground/75 outline-none leading-relaxed"
      >
        {block.content}
      </p>
      <button
        onClick={() => removeBlock(noteId, block.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground transition-opacity mt-0.5 shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

export default function OutputPanel() {
  const { notes, activeNoteId, isProcessing, processingStep } = useNotesStore();
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-5 h-5 rounded-full border border-border border-t-foreground/60 animate-spin" />
        <p className="mono text-[11px] text-muted-foreground">{processingStep}</p>
      </div>
    );
  }

  if (!activeNote) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-8 text-center">
        <FileText size={20} className="text-muted-foreground/25 mb-1" />
        <p className="text-[13px] text-muted-foreground/50">Formatted output appears here</p>
        <p className="text-[11px] text-muted-foreground/30 max-w-xs">
          Paste text on the left and click Format Notes
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-5">
      <motion.div
        key={activeNote.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="max-w-xl mx-auto"
      >
        {/* Note header */}
        <div className="mb-5">
          <h2 className="text-[15px] font-semibold text-foreground leading-tight mb-1">
            {activeNote.title}
          </h2>
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] text-muted-foreground/50">
              {new Date(activeNote.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="mono text-[10px] text-muted-foreground/50">{activeNote.mode}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="mono text-[10px] text-muted-foreground/50">
              {activeNote.blocks.length} blocks
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="divider mb-4" />

        {/* Blocks */}
        <div className="space-y-0.5">
          <AnimatePresence mode="popLayout">
            {activeNote.blocks.map((block, i) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.02, duration: 0.15 }}
              >
                <NoteBlock block={block} noteId={activeNote.id} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
