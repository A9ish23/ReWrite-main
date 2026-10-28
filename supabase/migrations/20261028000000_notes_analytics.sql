-- ReWrite analytics schema (PostgreSQL / Supabase)
-- Apply this migration to create the SQL data model used by Excel and Tableau.

create table if not exists public.notes (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  raw_input text not null default '',
  mode text not null check (mode in ('simple', 'detailed', 'action', 'study')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  tags text[] not null default '{}'
);

create table if not exists public.note_blocks (
  id text primary key,
  note_id text not null references public.notes(id) on delete cascade,
  block_type text not null check (block_type in ('heading', 'paragraph', 'bullet', 'task', 'summary', 'warning', 'tag-group')),
  content text not null default '',
  completed boolean,
  position integer not null default 0
);

create index if not exists note_blocks_note_id_idx on public.note_blocks(note_id);
create index if not exists notes_created_at_idx on public.notes(created_at);

-- Tableau-friendly, one row per note. Counts and text metrics are derived from blocks.
create or replace view public.tableau_notes_analytics as
select
  n.id as note_id,
  n.title,
  n.mode,
  n.created_at,
  n.updated_at,
  cardinality(n.tags) as tag_count,
  array_to_string(n.tags, ', ') as tags,
  coalesce(b.block_count, 0) as block_count,
  coalesce(b.task_count, 0) as task_count,
  coalesce(b.completed_task_count, 0) as completed_task_count,
  coalesce(b.word_count, 0) as formatted_word_count,
  length(n.raw_input) as raw_input_char_count,
  cardinality(regexp_split_to_array(trim(n.raw_input), '\s+')) as raw_input_word_count
from public.notes n
left join lateral (
  select
    count(*)::integer as block_count,
    count(*) filter (where block_type = 'task')::integer as task_count,
    count(*) filter (where block_type = 'task' and completed is true)::integer as completed_task_count,
    coalesce(sum(cardinality(regexp_split_to_array(trim(content), '\s+')))
      filter (where trim(content) <> ''), 0)::integer as word_count
  from public.note_blocks
  where note_id = n.id
) b on true;

-- Data access is restricted to authenticated users. Add application auth policies
-- before enabling client writes; do not expose notes through an unrestricted anon policy.
alter table public.notes enable row level security;
alter table public.note_blocks enable row level security;
alter view public.tableau_notes_analytics set (security_invoker = true);

create policy "Users manage their own notes" on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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

