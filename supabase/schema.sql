-- ============================================================
-- Controle de Dívidas - Schema Supabase
-- ============================================================
--
-- Como usar:
-- 1. Abra seu projeto no Supabase.
-- 2. Vá em SQL Editor.
-- 3. Cole este arquivo inteiro.
-- 4. Clique em Run.
--
-- O app foi pensado para uso com autenticação do Supabase.
-- Cada usuário vê apenas os próprios registros.
--
-- Nunca desative RLS em produção.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  nome text not null,
  cpf text not null,
  email text,
  telefone text,

  created_at timestamptz not null default now(),

  constraint clientes_owner_cpf_unique unique (owner_id, cpf)
);

create table if not exists public.dividas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,

  descricao text not null,
  valor_inicial numeric(14, 2) not null check (valor_inicial > 0),
  data_inicio date not null,
  juros_anual numeric(10, 6) not null check (juros_anual >= 0),
  tipo_taxa text not null default 'Manual',

  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;
alter table public.dividas enable row level security;

drop policy if exists "clientes_select_own" on public.clientes;
drop policy if exists "clientes_insert_own" on public.clientes;
drop policy if exists "clientes_update_own" on public.clientes;
drop policy if exists "clientes_delete_own" on public.clientes;

create policy "clientes_select_own"
on public.clientes
for select
to authenticated
using (owner_id = auth.uid());

create policy "clientes_insert_own"
on public.clientes
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "clientes_update_own"
on public.clientes
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "clientes_delete_own"
on public.clientes
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "dividas_select_own" on public.dividas;
drop policy if exists "dividas_insert_own" on public.dividas;
drop policy if exists "dividas_update_own" on public.dividas;
drop policy if exists "dividas_delete_own" on public.dividas;

create policy "dividas_select_own"
on public.dividas
for select
to authenticated
using (owner_id = auth.uid());

create policy "dividas_insert_own"
on public.dividas
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.clientes c
    where c.id = cliente_id
      and c.owner_id = auth.uid()
  )
);

create policy "dividas_update_own"
on public.dividas
for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.clientes c
    where c.id = cliente_id
      and c.owner_id = auth.uid()
  )
);

create policy "dividas_delete_own"
on public.dividas
for delete
to authenticated
using (owner_id = auth.uid());

create index if not exists idx_clientes_owner_id on public.clientes(owner_id);
create index if not exists idx_dividas_owner_id on public.dividas(owner_id);
create index if not exists idx_dividas_cliente_id on public.dividas(cliente_id);
