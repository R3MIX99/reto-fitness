-- Fase 4: campos de Stripe en subscriptions + idempotencia de webhooks.
-- Aplicada vía MCP el 2026-06-30 (project: upyuvlqjxwgcghtuihec).
alter table public.subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_interval text check (billing_interval in ('month','year')),
  add column if not exists cancel_at_period_end boolean not null default false;

create index if not exists subscriptions_stripe_customer_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_stripe_sub_idx on public.subscriptions (stripe_subscription_id);

-- Idempotencia de eventos de webhook (solo service role escribe; sin políticas).
create table if not exists public.stripe_events (
  id          text primary key,
  type        text,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- Futuro (comisiones por crédito): quién paga el asiento del miembro.
-- Por ahora todo es 'owner' (el dueño paga). El flujo member-paid + créditos
-- es una fase posterior; este campo deja el modelo listo sin rework.
alter table public.group_members
  add column if not exists seat_payer text not null default 'owner'
    check (seat_payer in ('owner','member'));
