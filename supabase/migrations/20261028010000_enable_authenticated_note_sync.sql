-- Enable secure browser-to-database sync with Supabase Auth sessions.
-- Safe to apply after the original analytics migration.

alter table public.notes add column if not exists user_id uuid default auth.uid();
alter table public.notes alter column user_id set default auth.uid();
alter table public.notes enable row level security;
alter table public.note_blocks enable row level security;
alter view public.tableau_notes_analytics set (security_invoker = true);

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notes'
      and policyname = 'Users manage their own notes'
  ) then
    create policy "Users manage their own notes" on public.notes
      for all to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'note_blocks'
      and policyname = 'Users manage blocks in their own notes'
  ) then
    create policy "Users manage blocks in their own notes" on public.note_blocks
      for all to authenticated
      using (exists (
        select 1 from public.notes n
        where n.id = note_blocks.note_id and n.user_id = (select auth.uid())
      ))
      with check (exists (
        select 1 from public.notes n
        where n.id = note_blocks.note_id and n.user_id = (select auth.uid())
      ));
  end if;
end $$;
