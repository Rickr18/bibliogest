-- ============================================================
-- Migration 004: Multas, notificaciones y auth de usuarios
-- ============================================================

-- Tabla de notificaciones de retraso (enviadas por lectores)
create table if not exists loan_notifications (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid not null references loans(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('delay_notice', 'fine_paid', 'admin_note')),
  new_return_date date,          -- nueva fecha propuesta por el lector
  message text,                  -- mensaje del lector
  fine_amount numeric(10,2) default 0,  -- multa calculada en pesos
  fine_paid boolean default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Tabla de multas
create table if not exists fines (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid not null references loans(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  days_overdue int not null default 0,
  amount_per_day numeric(10,2) not null default 500, -- en pesos COP
  total_amount numeric(10,2) not null default 0,
  paid boolean default false,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Vincular users con auth de Supabase (para staff/admin)
alter table users add column if not exists auth_id uuid references auth.users(id) on delete set null;
alter table users add column if not exists must_change_password boolean default false;
alter table users add column if not exists temp_password_set boolean default false;

-- Índice para buscar usuario por auth_id
create index if not exists idx_users_auth_id on users(auth_id);

-- RLS para notificaciones y multas
alter table loan_notifications enable row level security;
alter table fines enable row level security;

-- Safe to re-run
drop policy if exists "staff_all_notifications" on loan_notifications;
drop policy if exists "staff_all_fines" on fines;

create policy "staff_all_notifications" on loan_notifications for all using (auth.role() = 'authenticated');
create policy "staff_all_fines" on fines for all using (auth.role() = 'authenticated');

-- Vista enriquecida de notificaciones
create or replace view notifications_view as
select
  n.id,
  n.type,
  n.new_return_date,
  n.message,
  n.fine_amount,
  n.fine_paid,
  n.status,
  n.created_at,
  n.reviewed_at,
  u.full_name as user_name,
  u.document_id,
  u.phone,
  b.title as book_title,
  l.due_date,
  l.loan_date,
  l.id as loan_id,
  n.loan_id as notification_loan_id
from loan_notifications n
join loans l on n.loan_id = l.id
join users u on n.user_id = u.id
join books b on l.book_id = b.id
order by n.created_at desc;

-- Función: calcular multa automáticamente
create or replace function calculate_fine(p_days_overdue int, p_amount_per_day numeric default 500)
returns numeric as $$
begin
  return p_days_overdue * p_amount_per_day;
end;
$$ language plpgsql;

-- Función: actualizar available_copies correctamente al editar total_copies
create or replace function sync_available_copies()
returns trigger as $$
declare
  in_loan int;
begin
  if TG_OP = 'UPDATE' and new.total_copies != old.total_copies then
    select count(*) into in_loan
    from loans
    where book_id = new.id and status in ('active', 'renewed');
    
    new.available_copies = greatest(0, new.total_copies - in_loan);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_available
  before update on books
  for each row execute function sync_available_copies();

comment on table loan_notifications is 'Notificaciones enviadas por lectores para avisar retrasos';
comment on table fines is 'Multas generadas por préstamos vencidos';
