-- Row Level Security (RLS)
-- Los usuarios autenticados de Supabase son staff/admin del sistema

alter table users enable row level security;
alter table books enable row level security;
alter table loans enable row level security;
alter table loan_history enable row level security;
alter table categories enable row level security;

-- Staff autenticado puede leer y escribir todo (safe to re-run)
drop policy if exists "staff_all" on users;
drop policy if exists "staff_all" on books;
drop policy if exists "staff_all" on loans;
drop policy if exists "staff_all" on loan_history;
drop policy if exists "staff_all" on categories;

create policy "staff_all" on users for all using (auth.role() = 'authenticated');
create policy "staff_all" on books for all using (auth.role() = 'authenticated');
create policy "staff_all" on loans for all using (auth.role() = 'authenticated');
create policy "staff_all" on loan_history for all using (auth.role() = 'authenticated');
create policy "staff_all" on categories for all using (auth.role() = 'authenticated');
