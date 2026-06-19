-- Tabla para almacenar suscripciones de notificaciones push web
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  group_id    uuid references groups(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Solo el propio usuario puede ver/insertar/borrar sus suscripciones
create policy "owner access" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
