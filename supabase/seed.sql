-- ============================================================
-- BiblioGest — Seed de datos iniciales
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATEGORÍAS
-- ------------------------------------------------------------
insert into categories (name, description) values
  ('Literatura',  'Novelas, cuentos y poesía'),
  ('Ciencias',    'Física, química, biología'),
  ('Historia',    'Historia mundial y colombiana'),
  ('Tecnología',  'Computación, programación, sistemas'),
  ('Filosofía',   'Ética, lógica, epistemología'),
  ('Derecho',     'Legislación colombiana y teoría jurídica');

-- ------------------------------------------------------------
-- 2. LIBROS (category_id resuelto por nombre de categoría)
-- ------------------------------------------------------------
insert into books (title, author, isbn, publisher, year, total_copies, available_copies, location, category_id)
values
  ('Cien años de soledad',
   'Gabriel García Márquez', '9780307474728', 'Sudamericana', 1967, 3, 3, 'A-1',
   (select id from categories where name = 'Literatura')),

  ('El amor en los tiempos del cólera',
   'Gabriel García Márquez', '9780307389732', 'Oveja Negra', 1985, 2, 2, 'A-2',
   (select id from categories where name = 'Literatura')),

  ('Introduction to Algorithms',
   'Cormen, Leiserson, Rivest', '9780262033848', 'MIT Press', 2009, 2, 2, 'D-1',
   (select id from categories where name = 'Tecnología')),

  ('Clean Code',
   'Robert C. Martin', '9780132350884', 'Prentice Hall', 2008, 1, 1, 'D-2',
   (select id from categories where name = 'Tecnología')),

  ('El origen de las especies',
   'Charles Darwin', '9788420672229', 'Alianza Editorial', 1859, 2, 2, 'B-1',
   (select id from categories where name = 'Ciencias')),

  ('Sapiens: De animales a dioses',
   'Yuval Noah Harari', '9780062316110', 'Debate', 2011, 3, 3, 'C-1',
   (select id from categories where name = 'Historia'));

-- ------------------------------------------------------------
-- 3. USUARIO STAFF INICIAL
--
-- PASOS (solo la primera vez):
--
-- a) Ve a Supabase Dashboard → Authentication → Users
-- b) Busca el usuario staff@bibliogest.local que ya creaste
-- c) Copia el UUID que aparece en la columna "UID"
-- d) Pégalo en la variable de abajo y ejecuta este bloque
-- ------------------------------------------------------------

do $$
declare
  v_auth_id uuid := '64df3050-bd74-4c96-aef9-24921b4304eb';
begin
  insert into users (full_name, email, document_id, role, auth_id, must_change_password, temp_password_set)
  values (
    'Staff Administrador',
    'staff@bibliogest.local',
    '0000000001',
    'admin',
    v_auth_id,
    false,
    false
  )
  on conflict (email) do nothing;
end $$;
