import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BlockType = 'heading' | 'paragraph' | 'bullet' | 'task' | 'summary' | 'warning' | 'tag-group';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  completed?: boolean;
}

export type AIMode = 'simple' | 'detailed' | 'action' | 'study';

export interface Note {
  id: string;
  title: string;
  rawInput: string;
  blocks: Block[];
  tags: string[];
  mode: AIMode;
  createdAt: number;
  updatedAt: number;
}

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  aiMode: AIMode;
  isProcessing: boolean;
  processingStep: string;
  searchQuery: string;
  filterTag: string | null;
  sidebarOpen: boolean;
  darkMode: boolean;

  setAIMode: (mode: AIMode) => void;
  setProcessing: (processing: boolean, step?: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterTag: (tag: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  updateBlock: (noteId: string, blockId: string, updates: Partial<Block>) => void;
  addBlock: (noteId: string, block: Block, afterId?: string) => void;
  removeBlock: (noteId: string, blockId: string) => void;
  reorderBlocks: (noteId: string, blocks: Block[]) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      activeNoteId: null,
      aiMode: 'detailed',
      isProcessing: false,
      processingStep: '',
      searchQuery: '',
      filterTag: null,
      sidebarOpen: true,
      darkMode: true,

      setAIMode: (mode) => set({ aiMode: mode }),
      setProcessing: (isProcessing, processingStep = '') => set({ isProcessing, processingStep }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setFilterTag: (filterTag) => set({ filterTag }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      addNote: (note) => set((s) => ({ notes: [note, ...s.notes], activeNoteId: note.id })),
      updateNote: (id, updates) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)),
        })),
      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
          activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
        })),
      setActiveNote: (activeNoteId) => set({ activeNoteId }),
      updateBlock: (noteId, blockId, updates) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? { ...n, blocks: n.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)), updatedAt: Date.now() }
              : n
          ),
        })),
      addBlock: (noteId, block, afterId) =>
        set((s) => ({
          notes: s.notes.map((n) => {
            if (n.id !== noteId) return n;
            if (!afterId) return { ...n, blocks: [...n.blocks, block], updatedAt: Date.now() };
            const idx = n.blocks.findIndex((b) => b.id === afterId);
            const blocks = [...n.blocks];
            blocks.splice(idx + 1, 0, block);
            return { ...n, blocks, updatedAt: Date.now() };
          }),
        })),
      removeBlock: (noteId, blockId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId ? { ...n, blocks: n.blocks.filter((b) => b.id !== blockId), updatedAt: Date.now() } : n
          ),
        })),
      reorderBlocks: (noteId, blocks) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === noteId ? { ...n, blocks, updatedAt: Date.now() } : n)),
        })),
    }),
    { name: 'smart-notes-storage' }
  )
);
