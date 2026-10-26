import { useCallback } from 'react';
import { useNotesStore, type AIMode, type Note } from '@/store/notesStore';
import { processText } from '@/services/formatter';
import { toast } from 'sonner';

const STEPS = [
  'Parsing input…',
  'Analyzing content…',
  'Extracting key points…',
  'Generating structured notes…',
];

export function useFormatter() {
  const { addNote, setProcessing, aiMode } = useNotesStore();

  const format = useCallback(async (rawInput: string, mode?: AIMode) => {
    const currentMode = mode || aiMode;

    // Simulate processing steps for UX
    for (const step of STEPS) {
      setProcessing(true, step);
      await new Promise(r => setTimeout(r, 350 + Math.random() * 250));
    }

    try {
      const { blocks, tags, title } = processText(rawInput, currentMode);

      const note: Note = {
        id: `note-${Date.now()}`,
        title,
        rawInput,
        blocks,
        tags,
        mode: currentMode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      addNote(note);
      await new Promise(r => setTimeout(r, 50));
      setProcessing(false);
      return note;
    } catch (err: any) {
      setProcessing(false);
      const message = err?.message || 'Failed to format notes';
      toast.error(message);
      console.error('Format error:', err);
      return null;
    }
  }, [addNote, setProcessing, aiMode]);

  return { format };
}