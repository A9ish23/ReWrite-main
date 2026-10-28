import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, NotebookPen, ListChecks, Text, Tags } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import Sidebar from '@/components/Sidebar';
import { useNotesStore } from '@/store/notesStore';
import { downloadNotesAnalyticsCsv } from '@/lib/analyticsExport';

const COLORS = ['hsl(220 75% 65%)', 'hsl(155 55% 48%)', 'hsl(35 85% 60%)', 'hsl(285 55% 65%)'];
const card = 'rounded-md border border-border bg-card p-4';

export default function Analytics() {
  const { notes } = useNotesStore();
  const metrics = useMemo(() => {
    const blocks = notes.flatMap((note) => note.blocks);
    const tasks = blocks.filter((block) => block.type === 'task');
    const words = notes.reduce((sum, note) => sum + note.rawInput.trim().split(/\s+/).filter(Boolean).length, 0);
    return {
      notes: notes.length,
      blocks: blocks.length,
      completed: tasks.filter((task) => task.completed).length,
      tasks: tasks.length,
      avgWords: notes.length ? Math.round(words / notes.length) : 0,
      tags: new Set(notes.flatMap((note) => note.tags)).size,
    };
  }, [notes]);

  const byMode = useMemo(() => ['simple', 'detailed', 'action', 'study'].map((mode) => ({
    mode: mode[0].toUpperCase() + mode.slice(1),
    notes: notes.filter((note) => note.mode === mode).length,
  })), [notes]);

  const byDate = useMemo(() => {
    const daily = new Map<string, number>();
    notes.forEach((note) => {
      const day = new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      daily.set(day, (daily.get(day) || 0) + 1);
    });
    return [...daily.entries()].slice(-14).map(([date, count]) => ({ date, count }));
  }, [notes]);

  const blockTypes = useMemo(() => {
    const counts = new Map<string, number>();
    notes.flatMap((note) => note.blocks).forEach((block) => counts.set(block.type, (counts.get(block.type) || 0) + 1));
    return [...counts.entries()].map(([type, count]) => ({ type, count }));
  }, [notes]);

  const statCards = [
    { label: 'Notes created', value: metrics.notes, icon: NotebookPen },
    { label: 'Formatted blocks', value: metrics.blocks, icon: Text },
    { label: 'Tasks completed', value: `${metrics.completed} / ${metrics.tasks}`, icon: ListChecks },
    { label: 'Unique tags', value: metrics.tags, icon: Tags },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-10 items-center justify-between border-b border-border bg-background/95 px-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <ArrowLeft size={13} /> Notes
            </Link>
            <span className="text-muted-foreground/30">·</span>
            <span className="label">Analytics dashboard</span>
          </div>
          <button onClick={() => downloadNotesAnalyticsCsv(notes)} disabled={!notes.length}
            className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30">
            <FileSpreadsheet size={12} /> Export for Excel / Tableau
          </button>
        </header>

        <div className="mx-auto max-w-6xl space-y-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">Notes analytics</h1>
              <p className="mt-1 text-xs text-muted-foreground">A live summary of notes saved in this browser.</p>
            </div>
            <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">SOURCE: BROWSER STORAGE</span>
          </div>

          {notes.length === 0 ? (
            <div className={`${card} py-12 text-center`}>
              <NotebookPen className="mx-auto mb-3 text-muted-foreground/50" size={22} />
              <h2 className="text-sm font-medium">No notes to analyze yet</h2>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">Create and format a few notes, then return here to see totals and charts. Export the same data for Tableau or Excel.</p>
              <Link to="/" className="mt-4 inline-flex rounded bg-foreground px-3 py-1.5 text-xs text-background">Create a note</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {statCards.map(({ label, value, icon: Icon }) => (
                  <section key={label} className={card}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon size={14} /></div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
                    {label === 'Notes created' && <p className="mt-1 text-[10px] text-muted-foreground">Average {metrics.avgWords} raw words per note</p>}
                  </section>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <section className={card}>
                  <h2 className="mb-3 text-xs font-medium">Notes by formatting mode</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={byMode}>
                      <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="mode" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="notes" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                    </BarChart></ResponsiveContainer>
                  </div>
                </section>
                <section className={card}>
                  <h2 className="mb-3 text-xs font-medium">Formatted block types</h2>
                  {blockTypes.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart>
                    <Pie data={blockTypes} dataKey="count" nameKey="type" innerRadius={55} outerRadius={88} paddingAngle={3}>
                      {blockTypes.map((entry, index) => <Cell key={entry.type} fill={COLORS[index % COLORS.length]} />)}
                    </Pie><Tooltip />
                  </PieChart></ResponsiveContainer></div> : <p className="py-20 text-center text-xs text-muted-foreground">No formatted blocks</p>}
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">{blockTypes.map((entry, index) => <span key={entry.type} className="flex items-center gap-1 text-[10px] text-muted-foreground"><i className="h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{entry.type} ({entry.count})</span>)}</div>
                </section>
              </div>
              <section className={card}>
                <h2 className="mb-3 text-xs font-medium">Notes created over time</h2>
                <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={byDate}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip /><Bar dataKey="count" name="Notes" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
                </BarChart></ResponsiveContainer></div>
              </section>
            </>
          )}
          <p className="text-[10px] text-muted-foreground/60">SQL and Tableau connection are not live yet. Export creates a snapshot of this browser’s notes.</p>
        </div>
      </main>
    </div>
  );
}
