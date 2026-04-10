-- Vistas para reportes y dashboard

-- Vista: préstamos activos con info completa
create or replace view active_loans_view as
select
  l.id,
  l.loan_date,
  l.due_date,
  l.status,
  l.notes,
  u.full_name as user_name,
  u.document_id,
  u.phone,
  b.title as book_title,
  b.author as book_author,
  b.isbn,
  current_date - l.due_date as days_overdue
from loans l
join users u on l.user_id = u.id
join books b on l.book_id = b.id
where l.status in ('active', 'overdue');

-- Vista: préstamos vencidos
create or replace view overdue_loans_view as
select * from active_loans_view where days_overdue > 0;

-- Vista: historial completo por usuario
create or replace view user_loan_history_view as
select
  l.id,
  l.loan_date,
  l.due_date,
  l.return_date,
  l.status,
  u.id as user_id,
  u.full_name as user_name,
  b.title as book_title,
  b.author as book_author
from loans l
join users u on l.user_id = u.id
join books b on l.book_id = b.id
order by l.created_at desc;

-- Función: estadísticas generales para el dashboard
create or replace function get_dashboard_stats()
returns json as $$
declare result json;
begin
  select json_build_object(
    'total_books', (select coalesce(sum(total_copies),0) from books),
    'available_books', (select coalesce(sum(available_copies),0) from books),
    'active_loans', (select count(*) from loans where status = 'active'),
    'overdue_loans', (select count(*) from loans where status = 'overdue' or (status='active' and due_date < current_date)),
    'total_users', (select count(*) from users where active = true),
    'loans_this_month', (select count(*) from loans where date_trunc('month', loan_date) = date_trunc('month', current_date))
  ) into result;
  return result;
end;
$$ language plpgsql security definer;
