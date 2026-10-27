create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  key text not null,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, key)
);

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id text,
  entity_type text,
  entity_id text,
  parent_message_id uuid references public.ai_messages(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  message_type text not null check (
    message_type in ('user_message', 'assistant_message', 'tool_call', 'tool_result', 'system_event')
  ),
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_messages_user_created_idx
  on public.ai_messages (user_id, created_at desc);

create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at desc)
  where conversation_id is not null;

create index if not exists ai_messages_entity_created_idx
  on public.ai_messages (entity_type, entity_id, created_at desc)
  where entity_type is not null and entity_id is not null;

drop trigger if exists ai_messages_set_updated_at on public.ai_messages;
create trigger ai_messages_set_updated_at
before update on public.ai_messages
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings"
on public.user_settings for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
on public.user_settings for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
on public.user_settings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own settings" on public.user_settings;
create policy "Users can delete own settings"
on public.user_settings for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own AI messages" on public.ai_messages;
create policy "Users can view own AI messages"
on public.ai_messages for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own AI messages" on public.ai_messages;
create policy "Users can insert own AI messages"
on public.ai_messages for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own AI messages" on public.ai_messages;
create policy "Users can update own AI messages"
on public.ai_messages for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own AI messages" on public.ai_messages;
create policy "Users can delete own AI messages"
on public.ai_messages for delete
using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.ai_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
