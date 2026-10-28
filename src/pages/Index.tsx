import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, CloudOff, LoaderCircle, PanelLeft } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import Sidebar from '@/components/Sidebar';
import InputPanel from '@/components/InputPanel';
import OutputPanel from '@/components/OutputPanel';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { startNotesSync } from '@/services/notesSync';

type DatabaseStatus = 'connecting' | 'connected' | 'local' | 'error';

export default function Index() {
  const { darkMode, sidebarOpen, setSidebarOpen, notes, activeNoteId } = useNotesStore();
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>(isSupabaseConfigured ? 'connecting' : 'local');

  useEffect(() => {
    // Always force dark mode — the app is dark-only now
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stopSync: (() => void) | undefined;
    startNotesSync((status) => {
      if (!cancelled) setDatabaseStatus(status);
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else stopSync = unsubscribe;
    }).catch(() => {
      if (!cancelled) setDatabaseStatus('error');
    });
    return () => {
      cancelled = true;
      stopSync?.();
    };
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-background">

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-10 border-b border-border flex items-center px-4 gap-3 shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors -ml-1"
            >
              <PanelLeft size={14} />
            </button>
          )}
          <span className="label">Notes Formatter</span>
          <Link to="/analytics" className="ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground">
            <BarChart3 size={12} /> Analytics
          </Link>
          <span
            title={databaseStatus === 'error' ? 'Check that Supabase credentials are set, anonymous sign-ins are enabled, and the sync migration is applied.' : undefined}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ${databaseStatus === 'connected' ? 'text-emerald-400' : databaseStatus === 'error' ? 'text-amber-400' : 'text-muted-foreground/60'}`}
          >
            {databaseStatus === 'connecting' ? <LoaderCircle size={12} className="animate-spin" /> : databaseStatus === 'connected' ? <CheckCircle2 size={12} /> : <CloudOff size={12} />}
            {databaseStatus === 'connected' ? 'SQL synced' : databaseStatus === 'connecting' ? 'Connecting' : databaseStatus === 'error' ? 'Sync setup needed' : 'Local only'}
          </span>
          {activeNoteId && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="mono text-[10px] text-muted-foreground/40">
                {notes.find(n => n.id === activeNoteId)?.title}
              </span>
            </>
          )}
        </header>

        {/* Split panels */}
        <div className="flex-1 flex min-h-0">
          {/* Input */}
          <div className="w-1/2 border-r border-border flex flex-col overflow-hidden">
            <InputPanel />
          </div>

          {/* Output */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <OutputPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
