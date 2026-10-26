import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Trash2, Download, Copy, Moon, Sun, X, Plus } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';

export default function Sidebar() {
  const {
    notes, activeNoteId, setActiveNote, deleteNote,
    searchQuery, setSearchQuery, filterTag, setFilterTag,
    sidebarOpen, setSidebarOpen, darkMode, toggleDarkMode,
  } = useNotesStore();

  const filteredNotes = notes.filter(n => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.rawInput.toLowerCase().includes(q);
    const matchesTag = !filterTag || n.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const allTags = [...new Set(notes.flatMap(n => n.tags))];

  const copyNote = useCallback((note: typeof notes[0]) => {
    const text = note.blocks.map(b => {
      if (b.type === 'heading') return `## ${b.content}`;
      if (b.type === 'task') return `- [${b.completed ? 'x' : ' '}] ${b.content}`;
      if (b.type === 'bullet') return `- ${b.content}`;
      if (b.type === 'summary') return `> ${b.content}`;
      return b.content;
    }).join('\n');
    navigator.clipboard.writeText(text);
  }, []);

  const downloadNote = useCallback((note: typeof notes[0]) => {
    const text = note.blocks.map(b => {
      if (b.type === 'heading') return `## ${b.content}`;
      if (b.type === 'task') return `- [${b.completed ? 'x' : ' '}] ${b.content}`;
      if (b.type === 'bullet') return `- ${b.content}`;
      if (b.type === 'summary') return `> ${b.content}`;
      if (b.type === 'warning') return `⚠ ${b.content}`;
      return b.content;
    }).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-56 h-full border-r border-border flex flex-col shrink-0 bg-[hsl(var(--sidebar-background))]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[12px] font-semibold tracking-tight text-foreground">ReWrite</span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleDarkMode}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle theme"
              >
                {darkMode ? <Sun size={12} /> : <Moon size={12} />}
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors lg:hidden"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-[3px] bg-secondary">
              <Search size={11} className="text-muted-foreground/50 shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/40 outline-none w-full"
              />
            </div>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-border">
              <button
                onClick={() => setFilterTag(null)}
                className={`mono px-1.5 py-0.5 rounded-[3px] text-[10px] transition-colors ${
                  !filterTag
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                all
              </button>
              {allTags.slice(0, 6).map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={`mono px-1.5 py-0.5 rounded-[3px] text-[10px] transition-colors ${
                    filterTag === tag
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Notes list */}
          <div className="flex-1 overflow-auto py-1">
            {filteredNotes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/40 text-center mt-8 px-4">
                {notes.length === 0 ? 'No notes yet' : 'No matches'}
              </p>
            ) : (
              filteredNotes.map(note => (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note.id)}
                  className={`group w-full text-left px-3 py-2.5 transition-colors relative ${
                    activeNoteId === note.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                >
                  <p className="text-[12px] font-medium truncate leading-tight mb-0.5">
                    {note.title}
                  </p>
                  <p className="mono text-[10px] text-muted-foreground/40">
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })} · {note.mode}
                  </p>

                  {/* Note actions - appear on hover */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); copyNote(note); }}
                      className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
                      title="Copy as markdown"
                    >
                      <Copy size={10} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); downloadNote(note); }}
                      className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <Download size={10} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-1 rounded text-muted-foreground/50 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer stats */}
          <div className="px-3 py-2.5 border-t border-border">
            <p className="mono text-[10px] text-muted-foreground/30">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
