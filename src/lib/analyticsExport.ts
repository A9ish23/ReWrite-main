import type { Note } from '@/store/notesStore';

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

/** Export one analytics-friendly row per note. Excel opens UTF-8 CSV files directly. */
export function downloadNotesAnalyticsCsv(notes: Note[]) {
  const columns = [
    'note_id', 'title', 'mode', 'created_at', 'updated_at', 'tag_count', 'tags',
    'block_count', 'task_count', 'completed_task_count', 'formatted_word_count',
    'raw_input_char_count', 'raw_input_word_count',
  ];
  const rows = notes.map((note) => {
    const rawWords = note.rawInput.trim().split(/\s+/).filter(Boolean).length;
    const taskBlocks = note.blocks.filter((block) => block.type === 'task');
    const formattedWords = note.blocks.reduce(
      (total, block) => total + block.content.trim().split(/\s+/).filter(Boolean).length,
      0,
    );
    return [
      note.id, note.title, note.mode, new Date(note.createdAt).toISOString(),
      new Date(note.updatedAt).toISOString(), note.tags.length, note.tags.join(', '),
      note.blocks.length, taskBlocks.length, taskBlocks.filter((block) => block.completed).length,
      formattedWords, note.rawInput.length, rawWords,
    ];
  });
  const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rewrite-notes-analytics.csv';
  link.click();
  URL.revokeObjectURL(url);
}
