-- ============================================================
-- Migration 005: Agrega info del revisor a notifications_view
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- DROP primero porque cambian nombres/orden de columnas
drop view if exists notifications_view;

create view notifications_view as
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
  n.reviewed_by,
  -- Usuario que solicitó el aplazamiento
  u.full_name  as user_name,
  u.document_id,
  u.phone,
  -- Libro y préstamo
  b.title      as book_title,
  l.due_date,
  l.loan_date,
  l.id         as loan_id,
  -- Revisor (bibliotecario o admin que aprobó/rechazó)
  r.full_name  as reviewer_name,
  r.role       as reviewer_role
from loan_notifications n
join  loans l  on n.loan_id  = l.id
join  users u  on n.user_id  = u.id
join  books b  on l.book_id  = b.id
left join users r on n.reviewed_by = r.id   -- LEFT JOIN: pendientes no tienen revisor
order by n.created_at desc;
