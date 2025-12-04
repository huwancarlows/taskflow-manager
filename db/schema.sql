-- Enums (guard against existing type)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_enum') then
    create type status_enum as enum ('backlog','in_progress','done');
  end if;
end$$;

-- Labels
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null check (color in (
    'red','orange','amber','yellow','lime','green','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'
  )),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status status_enum not null default 'backlog',
  due_date date,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Many-to-many labels on tasks
create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

-- Trigger to update updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

-- Postgres doesn't support IF NOT EXISTS for triggers. Use drop+create.
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function set_updated_at();

-- Indexes
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists labels_name_idx on public.labels (name);
create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists labels_user_idx on public.labels (user_id);
create index if not exists task_labels_user_idx on public.task_labels (user_id);

-- Cleanup duplicate labels per (user_id, lower(name)) and dedupe task_labels
do $$
declare
  r record;
  keep_label_id uuid;
begin
  for r in (
    select user_id, lower(name) as lname
    from public.labels
    group by user_id, lower(name)
    having count(*) > 1
  ) loop
    -- Determine the label to keep (oldest by created_at, then id)
    select id into keep_label_id
    from public.labels
    where user_id = r.user_id and lower(name) = r.lname
    order by created_at, id
    limit 1;

    -- Repoint task_labels from duplicate labels to the kept label
    update public.task_labels tl
      set label_id = keep_label_id
    where tl.label_id in (
      select id
      from public.labels
      where user_id = r.user_id
        and lower(name) = r.lname
        and id <> keep_label_id
    );

    -- Remove duplicate label rows, keeping the chosen one
    delete from public.labels l
    where l.user_id = r.user_id
      and lower(l.name) = r.lname
      and l.id <> keep_label_id;
  end loop;

  -- De-duplicate any duplicate task_labels rows that may have resulted from the merge
  delete from public.task_labels a
  using public.task_labels b
  where a.ctid > b.ctid
    and a.task_id = b.task_id
    and a.label_id = b.label_id;
end$$;

-- Enforce uniqueness of label names per user (case-insensitive)
create unique index if not exists labels_user_name_unique on public.labels (user_id, lower(name));

-- RLS enable
alter table public.tasks enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;

-- Auth-scoped policies: each user can only access their rows
drop policy if exists "public read tasks" on public.tasks;
drop policy if exists "public write tasks" on public.tasks;
drop policy if exists "public update tasks" on public.tasks;
drop policy if exists "public delete tasks" on public.tasks;

-- Ensure idempotency when re-running: drop user-scoped task policies if present
drop policy if exists "users read own tasks" on public.tasks;
drop policy if exists "users insert own tasks" on public.tasks;
drop policy if exists "users update own tasks" on public.tasks;
drop policy if exists "users delete own tasks" on public.tasks;

drop policy if exists "public read labels" on public.labels;
drop policy if exists "public write labels" on public.labels;
drop policy if exists "public update labels" on public.labels;
drop policy if exists "public delete labels" on public.labels;

-- Ensure idempotency when re-running: drop user-scoped label policies if present
drop policy if exists "users read own labels" on public.labels;
drop policy if exists "users insert own labels" on public.labels;
drop policy if exists "users update own labels" on public.labels;
drop policy if exists "users delete own labels" on public.labels;

drop policy if exists "public read task_labels" on public.task_labels;
drop policy if exists "public write task_labels" on public.task_labels;
drop policy if exists "public delete task_labels" on public.task_labels;

-- Ensure idempotency when re-running: drop user-scoped task_labels policies if present
drop policy if exists "users read own task_labels" on public.task_labels;
drop policy if exists "users insert own task_labels" on public.task_labels;
drop policy if exists "users delete own task_labels" on public.task_labels;

create policy "users read own tasks" on public.tasks for select using (auth.uid() = user_id);
create policy "users insert own tasks" on public.tasks for insert with check (auth.uid() = user_id);
create policy "users update own tasks" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own tasks" on public.tasks for delete using (auth.uid() = user_id);

create policy "users read own labels" on public.labels for select using (auth.uid() = user_id);
create policy "users insert own labels" on public.labels for insert with check (auth.uid() = user_id);
create policy "users update own labels" on public.labels for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own labels" on public.labels for delete using (auth.uid() = user_id);

create policy "users read own task_labels" on public.task_labels for select using (auth.uid() = user_id);
create policy "users insert own task_labels" on public.task_labels for insert with check (auth.uid() = user_id);
create policy "users delete own task_labels" on public.task_labels for delete using (auth.uid() = user_id);
