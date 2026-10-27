-- Cloud persistence for the battle royale game:
-- match stats, leaderboard, and per-squadmate performance.

create table if not exists public.match_stats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  player_name text not null default 'مقاتل مجهول',
  status text not null check (status in ('won', 'lost')),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  kills integer not null default 0 check (kills >= 0),
  health_remaining integer not null default 0 check (health_remaining >= 0),
  squad_size integer not null default 1 check (squad_size >= 1),
  squad_survivors integer not null default 0 check (squad_survivors >= 0),
  zone_radius integer not null default 0 check (zone_radius >= 0),
  score integer not null default 0 check (score >= 0)
);

create table if not exists public.leaderboard (
  player_name text primary key,
  best_score integer not null default 0 check (best_score >= 0),
  total_matches integer not null default 0 check (total_matches >= 0),
  total_kills integer not null default 0 check (total_kills >= 0),
  wins integer not null default 0 check (wins >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.squad_performances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  match_id uuid not null references public.match_stats (id) on delete cascade,
  mate_index integer not null default 0 check (mate_index >= 0),
  state text not null check (state in ('active', 'downed', 'out')),
  health integer not null default 0 check (health >= 0),
  armor integer not null default 0 check (armor >= 0)
);

create index if not exists match_stats_created_at_idx
  on public.match_stats (created_at desc);
create index if not exists squad_performances_match_idx
  on public.squad_performances (match_id);

-- The game plays without authentication; anon rows are intentional.
alter table public.match_stats enable row level security;
alter table public.leaderboard enable row level security;
alter table public.squad_performances enable row level security;

create policy "anon can read match stats" on public.match_stats
  for select using (true);
create policy "anon can insert match stats" on public.match_stats
  for insert with check (true);

create policy "anon can read leaderboard" on public.leaderboard
  for select using (true);
create policy "anon can insert leaderboard" on public.leaderboard
  for insert with check (true);
create policy "anon can update leaderboard" on public.leaderboard
  for update using (true) with check (true);

create policy "anon can read squad performances" on public.squad_performances
  for select using (true);
create policy "anon can insert squad performances" on public.squad_performances
  for insert with check (true);