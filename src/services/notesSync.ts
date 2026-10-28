import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { useNotesStore, type AIMode, type Block, type Note } from '@/store/notesStore';

type SyncStatus = 'local' | 'connected' | 'error';

function fromDatabase(noteRows: Array<{
  id: string; title: string; raw_input: string; mode: string;
  created_at: string; updated_at: string; tags: string[];
}>, blockRows: Array<{
  id: string; note_id: string; block_type: string; content: string;
  completed: boolean | null; position: number;
}>): Note[] {
  const blocksByNote = new Map<string, Block[]>();
  blockRows.forEach((row) => {
    const blocks = blocksByNote.get(row.note_id) || [];
    blocks.push({
      id: row.id,
      type: row.block_type as Block['type'],
      content: row.content,
      ...(row.completed === null ? {} : { completed: row.completed }),
    });
    blocksByNote.set(row.note_id, blocks);
  });
  return noteRows.map((row) => ({
    id: row.id,
    title: row.title,
    rawInput: row.raw_input,
    blocks: (blocksByNote.get(row.id) || []).sort((a, b) => {
      const aPosition = blockRows.find((item) => item.id === a.id)?.position ?? 0;
      const bPosition = blockRows.find((item) => item.id === b.id)?.position ?? 0;
      return aPosition - bPosition;
    }),
    tags: row.tags || [],
    mode: row.mode as AIMode,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

async function fetchRemoteNotes(): Promise<Note[]> {
  const { data: noteRows, error: notesError } = await supabase
    .from('notes').select('*').order('created_at', { ascending: false });
  if (notesError) throw notesError;
  if (!noteRows?.length) return [];

  const { data: blockRows, error: blocksError } = await supabase
    .from('note_blocks').select('*').in('note_id', noteRows.map((note) => note.id))
    .order('position', { ascending: true });
  if (blocksError) throw blocksError;
  return fromDatabase(noteRows, blockRows || []);
}

async function upsertNote(note: Note, userId: string) {
  const { error: noteError } = await supabase.from('notes').upsert({
    id: note.id,
    user_id: userId,
    title: note.title,
    raw_input: note.rawInput,
    mode: note.mode,
    created_at: new Date(note.createdAt).toISOString(),
    updated_at: new Date(note.updatedAt).toISOString(),
    tags: note.tags,
  });
  if (noteError) throw noteError;

  const { error: deleteError } = await supabase.from('note_blocks').delete().eq('note_id', note.id);
  if (deleteError) throw deleteError;
  if (!note.blocks.length) return;

  const { error: blocksError } = await supabase.from('note_blocks').insert(note.blocks.map((block, position) => ({
    id: block.id,
    note_id: note.id,
    block_type: block.type,
    content: block.content,
    completed: block.completed ?? null,
    position,
  })));
  if (blocksError) throw blocksError;
}

async function syncSnapshot(notes: Note[], removedIds: string[], userId: string) {
  if (removedIds.length) {
    const { error } = await supabase.from('notes').delete().in('id', removedIds);
    if (error) throw error;
  }
  for (const note of notes) await upsertNote(note, userId);
}

/** Connect the browser store to Supabase, merging local and remote notes by last update. */
export async function startNotesSync(onStatus: (status: SyncStatus) => void) {
  if (!isSupabaseConfigured) {
    onStatus('local');
    return () => undefined;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  let userId = sessionData.session?.user.id;
  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    userId = data.user?.id;
  }
  if (!userId) throw new Error('Supabase did not return a user session.');

  const [localNotes, remoteNotes] = [useNotesStore.getState().notes, await fetchRemoteNotes()];
  const merged = new Map(remoteNotes.map((note) => [note.id, note]));
  localNotes.forEach((local) => {
    const remote = merged.get(local.id);
    if (!remote || local.updatedAt >= remote.updatedAt) merged.set(local.id, local);
  });
  const notes = [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  useNotesStore.setState({ notes });
  await syncSnapshot(notes, [], userId);
  onStatus('connected');

  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = Promise.resolve();
  const unsubscribe = useNotesStore.subscribe((state, previous) => {
    if (state.notes === previous.notes) return;
    if (timer) clearTimeout(timer);
    const removedIds = previous.notes.filter((note) => !state.notes.some((current) => current.id === note.id)).map((note) => note.id);
    const snapshot = state.notes;
    timer = setTimeout(() => {
      pending = pending.then(() => syncSnapshot(snapshot, removedIds, userId!))
        .then(() => onStatus('connected'))
        .catch(() => onStatus('error'));
    }, 450);
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
