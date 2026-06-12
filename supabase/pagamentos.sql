
create table if not exists pagamentos (
 id uuid primary key default gen_random_uuid(),
 divida_id uuid not null references dividas(id) on delete cascade,
 valor numeric(14,2) not null,
 data_pagamento date not null,
 observacao text,
 created_at timestamptz default now()
);
