import { useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { useNotesStore } from '@/store/notesStore';
import Sidebar from '@/components/Sidebar';
import InputPanel from '@/components/InputPanel';
import OutputPanel from '@/components/OutputPanel';

export default function Index() {
  const { darkMode, sidebarOpen, setSidebarOpen, notes, activeNoteId } = useNotesStore();

  useEffect(() => {
    // Always force dark mode — the app is dark-only now
    document.documentElement.classList.add('dark');
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
