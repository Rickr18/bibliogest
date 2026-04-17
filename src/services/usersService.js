import { supabase, supabaseAdmin } from './supabaseClient.js'
import { PRINCIPAL_ADMIN_ID } from '../utils/constants.js'

// Helper interno — genera contraseña sin caracteres ambiguos (0/O, 1/l/I)
function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const usersService = {
  async getAll({ search = '', role = null, active = true, page = 1, limit = 20 } = {}) {
    let query = supabase.from('users').select('*', { count: 'exact' })
    if (search) query = query.or(`full_name.ilike.%${search}%,document_id.ilike.%${search}%,email.ilike.%${search}%`)
    if (role) query = query.eq('role', role)
    if (active !== null) query = query.eq('active', active)
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1).order('full_name')
    const { data, error, count } = await query
    if (error) throw error
    return { data, count, totalPages: Math.ceil(count / limit) }
  },

  async getById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async getByAuthId(authId) {
    const { data, error } = await supabase.from('users').select('*').eq('auth_id', authId).single()
    if (error) throw error
    return data
  },

  async getLoanHistory(userId) {
    const { data, error } = await supabase
      .from('user_loan_history_view').select('*').eq('user_id', userId)
      .order('loan_date', { ascending: false })
    if (error) throw error
    return data
  },

  async create(user) {
    const { data, error } = await supabase.from('users').insert(user).select().single()
    if (error) throw error
    return data
  },

  async createWithAuth({ full_name, email, document_id, phone, role, notes, tempPassword }) {
    if (!supabaseAdmin) throw new Error('Falta VITE_SUPABASE_SERVICE_ROLE_KEY en .env.local')

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (authError) throw new Error(`Error creando cuenta: ${authError.message}`)

    const { data, error } = await supabase.from('users').insert({
      full_name, email, document_id, phone, role, notes,
      auth_id: authData.user.id,
      must_change_password: true,
      temp_password_set: true,
    }).select().single()

    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw error
    }
    return { user: data, tempPassword }
  },

  // actor: { role: 'staff'|'admin', isSelf: boolean, isActorPrincipalAdmin: boolean }
  //
  // Matriz de permisos (actor → qué puede hacer sobre el target):
  //
  //  ┌─────────────────────┬────────────────────────────────────────────────┐
  //  │ Actor               │ Permitido                                      │
  //  ├─────────────────────┼────────────────────────────────────────────────┤
  //  │ Admin principal     │ Editar cualquier usuario (rol, estado, datos)   │
  //  │                     │ Excepción: no puede modificar su propio estado  │
  //  ├─────────────────────┼────────────────────────────────────────────────┤
  //  │ Admin normal        │ Editar lectores y bibliotecarios (datos+estado) │
  //  │                     │ Cambiar rol: solo reader↔staff                  │
  //  │                     │ NUNCA modificar a otro admin (ningún campo)     │
  //  │                     │ NUNCA promover a admin                          │
  //  ├─────────────────────┼────────────────────────────────────────────────┤
  //  │ Bibliotecario       │ Solo editar datos personales de lectores        │
  //  │                     │ Solo cambiar estado de lectores (no self)       │
  //  │                     │ NUNCA cambiar roles                             │
  //  └─────────────────────┴────────────────────────────────────────────────┘
  //
  // Protección absoluta (ningún actor puede saltarla):
  //   - Admin principal: su campo `role` no puede bajar de 'admin'; `active` bloqueado
  async update(id, updates, actor = {}) {
    // actorId: users.id del actor (de currentProfile?.id, cargado desde la BD tras autenticación)
    const { role: actorRole = 'staff', isSelf = false, actorId = null } = actor
    const isActorPrincipalAdmin = actorId === PRINCIPAL_ADMIN_ID

    // ── Fetch del rol del usuario destino ─────────────────────────────────
    // Siempre se obtiene de la BD para evitar que el frontend manipule targetRole.
    const { data: targetUser, error: fetchError } = await supabase
      .from('users').select('role').eq('id', id).single()
    if (fetchError || !targetUser) throw new Error('Usuario destino no encontrado.')
    const targetRole = targetUser.role

    // ── Guard 1: Protección del administrador principal (TARGET) ──────────
    // id === PRINCIPAL_ADMIN_ID: ambos son users.id — comparación correcta.
    // La BD también aplica un trigger BEFORE UPDATE que bloquea estos cambios
    // aunque alguien eluda la capa de aplicación.
    if (id === PRINCIPAL_ADMIN_ID) {
      if ('role' in updates && updates.role !== 'admin')
        throw new Error('El administrador principal no puede perder su rol de administrador.')
      if ('active' in updates)
        throw new Error('El estado del administrador principal no puede ser modificado.')
    }

    // ── Guard 2: Restricciones para bibliotecarios ─────────────────────────
    if (actorRole === 'staff') {
      if ('role' in updates)
        throw new Error('Los bibliotecarios no pueden cambiar roles. Contacta a un administrador.')
      if (isSelf && 'active' in updates)
        throw new Error('No puedes modificar tu propio estado de activación.')
      if ('active' in updates && targetRole !== 'reader')
        throw new Error('Los bibliotecarios solo pueden cambiar el estado de usuarios lectores.')
    }

    // ── Guard 3: Restricciones para administradores normales (no principal) ─
    if (actorRole === 'admin' && !isActorPrincipalAdmin) {
      if (targetRole === 'admin')
        throw new Error('No tienes permisos para modificar a otro administrador.')
      if ('role' in updates && updates.role === 'admin')
        throw new Error('Solo el administrador principal puede asignar el rol de Administrador.')
    }

    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  // Genera una nueva contraseña temporal para un usuario que no puede iniciar sesión.
  //
  // Reglas de permiso:
  //   - Bibliotecario (staff)  → solo puede resetear contraseñas de lectores (reader)
  //   - Administrador (admin)  → puede resetear contraseñas de reader y staff
  //   - Nadie puede resetear su propia contraseña por esta vía (usar /change-password)
  //
  // Para habilitar auditoría, crea esta tabla en Supabase SQL Editor:
  //
  //   CREATE TABLE audit_log (
  //     id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  //     action         text NOT NULL,
  //     target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  //     actor_auth_id  uuid,
  //     details        jsonb,
  //     created_at     timestamptz DEFAULT now()
  //   );
  //   ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
  //   CREATE POLICY "Solo lectura para admins"
  //     ON audit_log FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
  //
  async resetPassword(targetUserId, { actorRole, targetRole, actorAuthId }) {
    if (!supabaseAdmin) throw new Error('Falta VITE_SUPABASE_SERVICE_ROLE_KEY en .env.local')

    // Validación de permisos
    if (actorRole === 'staff' && targetRole !== 'reader') {
      throw new Error('Los bibliotecarios solo pueden generar claves temporales para lectores.')
    }
    if (actorRole !== 'staff' && actorRole !== 'admin') {
      throw new Error('No tienes permisos para realizar esta acción.')
    }

    // Obtener datos del usuario destino
    const { data: target, error: fetchError } = await supabase
      .from('users')
      .select('auth_id, full_name, email')
      .eq('id', targetUserId)
      .single()
    if (fetchError || !target) throw new Error('Usuario no encontrado.')
    if (!target.auth_id) throw new Error('Este usuario no tiene cuenta de acceso asociada.')

    const newTempPassword = generateTempPassword()

    // Actualizar contraseña en Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      target.auth_id,
      { password: newTempPassword }
    )
    if (authError) throw new Error(`Error al actualizar la contraseña: ${authError.message}`)

    // Marcar que debe cambiar contraseña en el próximo inicio de sesión
    await supabase
      .from('users')
      .update({ must_change_password: true, temp_password_set: true })
      .eq('id', targetUserId)

    // Registro de auditoría (best-effort — no falla si la tabla no existe aún)
    try {
      await supabase.from('audit_log').insert({
        action: 'password_reset',
        target_user_id: targetUserId,
        actor_auth_id: actorAuthId ?? null,
        details: {
          target_name: target.full_name,
          target_email: target.email,
          actor_role: actorRole,
        },
      })
    } catch (_) { /* audit_log no configurada aún — ver SQL arriba */ }

    return {
      tempPassword: newTempPassword,
      email: target.email,
      name: target.full_name,
    }
  },

  async getReputation(userId) {
    const { data, error } = await supabase.rpc('get_user_reputation', { p_user_id: userId })
    if (error) throw error
    return data
  },
}

export const notificationsService = {
  async create({ loan_id, user_id, new_return_date, message, fine_amount }) {
    const { data, error } = await supabase
      .from('loan_notifications')
      .insert({ loan_id, user_id, type: 'delay_notice', new_return_date, message, fine_amount })
      .select().single()
    if (error) throw error
    return data
  },

  async getAll({ status = null } = {}) {
    let query = supabase.from('notifications_view').select('*')
    if (status) query = query.eq('status', status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async updateStatus(id, status, reviewedBy) {
    const { data, error } = await supabase
      .from('loan_notifications')
      .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async getByUser(userId) {
    const { data, error } = await supabase
      .from('loan_notifications')
      .select('*, loans(due_date, books(title))')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
}
