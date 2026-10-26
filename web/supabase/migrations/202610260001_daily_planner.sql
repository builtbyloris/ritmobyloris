alter table public.ritmo_tasks
  add column if not exists planned_date date,
  add column if not exists priority text not null default 'Media',
  add column if not exists sort_order integer not null default 0;

do $$ begin
  alter table public.ritmo_tasks
    add constraint ritmo_tasks_priority_check check (priority in ('Alta', 'Media', 'Bassa'));
exception when duplicate_object then null;
end $$;

create index if not exists ritmo_tasks_planner_idx
  on public.ritmo_tasks (user_id, planned_date, sort_order);

comment on column public.ritmo_tasks.planned_date is 'Local calendar date selected by the owner; null means backlog.';
comment on column public.ritmo_tasks.priority is 'Planner priority: Alta, Media, or Bassa.';
comment on column public.ritmo_tasks.sort_order is 'Owner-defined order within a planned day.';
