-- ============================================================
-- Migration 006: Registra qué staff creó y devolvió cada préstamo
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS returned_by uuid REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN loans.created_by  IS 'Staff que registró el préstamo';
COMMENT ON COLUMN loans.returned_by IS 'Staff que registró la devolución';
