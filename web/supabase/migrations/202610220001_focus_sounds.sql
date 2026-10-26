alter table public.ritmo_preferences
  add column if not exists focus_sound text not null default 'off'
    check (focus_sound in ('off', 'rain', 'brown', 'waves')),
  add column if not exists focus_sound_volume double precision not null default .35
    check (focus_sound_volume between 0 and 1);
