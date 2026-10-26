create table if not exists public.ritmo_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null check (char_length(title) between 1 and 160),
  category text not null check (category in ('Studio', 'Lavoro', 'Personale')),
  estimated_pomodoros integer not null check (estimated_pomodoros between 1 and 99),
  completed_pomodoros integer not null default 0 check (completed_pomodoros between 0 and 9999),
  completed boolean not null default false,
  completed_at bigint,
  is_active boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null,
  primary key (user_id, id)
);

create table if not exists public.ritmo_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  task_id text,
  task_title text not null,
  category text check (category is null or category in ('Studio', 'Lavoro', 'Personale')),
  started_at bigint not null,
  completed_at bigint not null,
  duration_minutes integer not null check (duration_minutes between 1 and 180),
  status text not null default 'completed' check (status = 'completed'),
  primary key (user_id, id)
);

create table if not exists public.ritmo_timers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('focus', 'shortBreak', 'longBreak')),
  status text not null check (status in ('idle', 'running', 'paused')),
  preset text not null check (preset in ('25 / 5', '50 / 10', 'Personalizzato')),
  focus_minutes integer not null check (focus_minutes between 1 and 180),
  short_break_minutes integer not null check (short_break_minutes between 1 and 60),
  long_break_minutes integer not null check (long_break_minutes between 1 and 90),
  long_break_every integer not null check (long_break_every between 1 and 12),
  remaining_ms bigint not null check (remaining_ms >= 0),
  ends_at bigint,
  cycle_id text not null,
  task_id text,
  focus_started_at bigint,
  completed_focus_count integer not null default 0 check (completed_focus_count >= 0),
  updated_at bigint not null
);

create table if not exists public.ritmo_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preset text not null check (preset in ('25 / 5', '50 / 10', 'Personalizzato')),
  focus_minutes integer not null check (focus_minutes between 1 and 180),
  short_break_minutes integer not null check (short_break_minutes between 1 and 60),
  long_break_minutes integer not null check (long_break_minutes between 1 and 90),
  long_break_every integer not null check (long_break_every between 1 and 12),
  daily_goal integer not null check (daily_goal between 1 and 20),
  theme text not null check (theme in ('system', 'light', 'dark')),
  notifications_enabled boolean not null default false,
  sound_enabled boolean not null default true,
  sound_volume double precision not null default .45 check (sound_volume between 0 and 1),
  updated_at bigint not null
);

create table if not exists public.ritmo_migrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  migrated_at bigint not null,
  source_version integer not null
);

create index if not exists ritmo_tasks_updated_idx on public.ritmo_tasks (user_id, updated_at desc);
create index if not exists ritmo_sessions_completed_idx on public.ritmo_sessions (user_id, completed_at desc);

alter table public.ritmo_tasks enable row level security;
alter table public.ritmo_sessions enable row level security;
alter table public.ritmo_timers enable row level security;
alter table public.ritmo_preferences enable row level security;
alter table public.ritmo_migrations enable row level security;

drop policy if exists "Users manage their own tasks" on public.ritmo_tasks;
drop policy if exists "Users manage their own sessions" on public.ritmo_sessions;
drop policy if exists "Users manage their own timer" on public.ritmo_timers;
drop policy if exists "Users manage their own preferences" on public.ritmo_preferences;
drop policy if exists "Users manage their own migration" on public.ritmo_migrations;

create policy "Users manage their own tasks" on public.ritmo_tasks for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own sessions" on public.ritmo_sessions for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own timer" on public.ritmo_timers for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own preferences" on public.ritmo_preferences for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own migration" on public.ritmo_migrations for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.ritmo_complete_focus(p_session jsonb, p_next_timer jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_rows integer := 0;
  linked_task_id text := nullif(p_session ->> 'task_id', '');
  completed_at_value bigint := (p_session ->> 'completed_at')::bigint;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_session ->> 'user_id' <> current_user_id::text or p_next_timer ->> 'user_id' <> current_user_id::text then
    raise exception 'User scope mismatch';
  end if;

  insert into public.ritmo_sessions (
    user_id, id, task_id, task_title, category, started_at, completed_at, duration_minutes, status
  ) values (
    current_user_id, p_session ->> 'id', linked_task_id, p_session ->> 'task_title',
    nullif(p_session ->> 'category', ''), (p_session ->> 'started_at')::bigint,
    completed_at_value, (p_session ->> 'duration_minutes')::integer, 'completed'
  ) on conflict (user_id, id) do nothing;
  get diagnostics inserted_rows = row_count;

  if inserted_rows = 1 and linked_task_id is not null then
    update public.ritmo_tasks set
      completed_pomodoros = completed_pomodoros + 1,
      completed = completed_pomodoros + 1 >= estimated_pomodoros,
      completed_at = case when completed_pomodoros + 1 >= estimated_pomodoros then coalesce(completed_at, completed_at_value) else null end,
      is_active = completed_pomodoros + 1 < estimated_pomodoros,
      updated_at = completed_at_value
    where user_id = current_user_id and id = linked_task_id;
  end if;

  if inserted_rows = 1 then
    insert into public.ritmo_timers (
      user_id, mode, status, preset, focus_minutes, short_break_minutes, long_break_minutes,
      long_break_every, remaining_ms, ends_at, cycle_id, task_id, focus_started_at,
      completed_focus_count, updated_at
    ) values (
      current_user_id, p_next_timer ->> 'mode', p_next_timer ->> 'status', p_next_timer ->> 'preset',
      (p_next_timer ->> 'focus_minutes')::integer, (p_next_timer ->> 'short_break_minutes')::integer,
      (p_next_timer ->> 'long_break_minutes')::integer, (p_next_timer ->> 'long_break_every')::integer,
      (p_next_timer ->> 'remaining_ms')::bigint, (p_next_timer ->> 'ends_at')::bigint,
      p_next_timer ->> 'cycle_id', nullif(p_next_timer ->> 'task_id', ''),
      (p_next_timer ->> 'focus_started_at')::bigint, (p_next_timer ->> 'completed_focus_count')::integer,
      (p_next_timer ->> 'updated_at')::bigint
    ) on conflict (user_id) do update set
      mode = excluded.mode, status = excluded.status, preset = excluded.preset,
      focus_minutes = excluded.focus_minutes, short_break_minutes = excluded.short_break_minutes,
      long_break_minutes = excluded.long_break_minutes, long_break_every = excluded.long_break_every,
      remaining_ms = excluded.remaining_ms, ends_at = excluded.ends_at, cycle_id = excluded.cycle_id,
      task_id = excluded.task_id, focus_started_at = excluded.focus_started_at,
      completed_focus_count = excluded.completed_focus_count, updated_at = excluded.updated_at;
  end if;

  return inserted_rows = 1;
end;
$$;

-- Supabase can grant EXECUTE directly to anon through its default privileges,
-- so revoking only from PUBLIC is not sufficient.
revoke all on function public.ritmo_complete_focus(jsonb, jsonb) from public, anon;
grant execute on function public.ritmo_complete_focus(jsonb, jsonb) to authenticated;
