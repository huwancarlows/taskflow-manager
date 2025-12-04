-- Enums
create type status_enum as enum ('backlog','in_progress','done');

-- Labels
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null check (color in (
    'red','orange','amber','yellow','lime','green','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'
  )),
  created_at timestamptz not null default now()
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status status_enum not null default 'backlog',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Many-to-many labels on tasks
create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

-- Trigger to update updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create trigger if not exists tasks_set_updated_at
before update on public.tasks
for each row execute function set_updated_at();

-- Indexes
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists labels_name_idx on public.labels (name);

-- RLS enable
alter table public.tasks enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;

-- Public policies (demo-friendly). For production, switch to auth-scoped policies.
create policy if not exists "public read tasks" on public.tasks for select using (true);
create policy if not exists "public write tasks" on public.tasks for insert with check (true);
create policy if not exists "public update tasks" on public.tasks for update using (true) with check (true);
create policy if not exists "public delete tasks" on public.tasks for delete using (true);

create policy if not exists "public read labels" on public.labels for select using (true);
create policy if not exists "public write labels" on public.labels for insert with check (true);
create policy if not exists "public update labels" on public.labels for update using (true) with check (true);
create policy if not exists "public delete labels" on public.labels for delete using (true);

create policy if not exists "public read task_labels" on public.task_labels for select using (true);
create policy if not exists "public write task_labels" on public.task_labels for insert with check (true);
create policy if not exists "public delete task_labels" on public.task_labels for delete using (true);
