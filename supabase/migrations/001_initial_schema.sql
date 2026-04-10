-- BiblioGest: Schema inicial
-- Ejecutar en el SQL Editor de Supabase

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- Categorías
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Usuarios del sistema (registros de lectores, no auth)
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text unique,
  phone text,
  document_id text unique not null,  -- Cédula o carnet
  role text not null default 'reader' check (role in ('reader', 'staff', 'admin')),
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Libros / Inventario
create table if not exists books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  isbn text unique,
  publisher text,
  year int,
  category_id uuid references categories(id) on delete set null,
  total_copies int not null default 1 check (total_copies >= 0),
  available_copies int not null default 1 check (available_copies >= 0),
  location text,          -- Ej: "Estante A - Sección 3"
  cover_url text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint copies_check check (available_copies <= total_copies)
);

-- Préstamos
create table if not exists loans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete restrict,
  book_id uuid not null references books(id) on delete restrict,
  loan_date date not null default current_date,
  due_date date not null,
  return_date date,
  status text not null default 'active'
    check (status in ('active', 'returned', 'overdue', 'renewed')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Historial de eventos por préstamo
create table if not exists loan_history (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid not null references loans(id) on delete cascade,
  event_type text not null check (event_type in ('created','returned','overdue','renewed','noted')),
  description text,
  created_at timestamptz default now()
);

-- Índices para búsquedas rápidas
create index if not exists idx_books_title on books using gin(to_tsvector('spanish', title));
create index if not exists idx_books_author on books using gin(to_tsvector('spanish', author));
create index if not exists idx_books_isbn on books(isbn);
create index if not exists idx_loans_status on loans(status);
create index if not exists idx_loans_due_date on loans(due_date);
create index if not exists idx_users_document on users(document_id);

-- Función: actualizar updated_at automáticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_books_updated_at before update on books for each row execute function update_updated_at();
create trigger trg_users_updated_at before update on users for each row execute function update_updated_at();
create trigger trg_loans_updated_at before update on loans for each row execute function update_updated_at();

-- Función: descuenta o incrementa stock al crear/devolver préstamo
create or replace function handle_loan_stock()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update books set available_copies = available_copies - 1 where id = new.book_id;
  elsif TG_OP = 'UPDATE' and new.status = 'returned' and old.status != 'returned' then
    update books set available_copies = available_copies + 1 where id = new.book_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_loan_stock
  after insert or update on loans
  for each row execute function handle_loan_stock();

-- Función: registrar eventos en historial automáticamente
create or replace function log_loan_event()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into loan_history(loan_id, event_type, description)
    values (new.id, 'created', 'Préstamo registrado');
  elsif TG_OP = 'UPDATE' and new.status != old.status then
    insert into loan_history(loan_id, event_type, description)
    values (new.id, new.status::text,
      case new.status
        when 'returned' then 'Libro devuelto'
        when 'overdue' then 'Préstamo vencido'
        when 'renewed' then 'Préstamo renovado'
        else 'Estado actualizado'
      end
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_loan_history
  after insert or update on loans
  for each row execute function log_loan_event();
