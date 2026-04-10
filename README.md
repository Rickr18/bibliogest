# BiblioGest

Sistema de información para el control de préstamos y devoluciones en biblioteca.

Automatizar el registro de usuarios, inventario y préstamos para mejorar la eficiencia y trazabilidad.

Materia: Administración de Sistemas de Información  
Integrantes: Angelin Escalante · Rick Rios

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Estilos | TailwindCSS + CSS Variables |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Estado servidor | TanStack Query v5 |
| Estado global | Zustand |
| Routing | React Router v6 |
| Gráficas | Recharts |

## Módulos del sistema

### Autenticación
- Inicio de sesión con Supabase Auth.
- Protección de rutas para usuarios autenticados.
- Cambio obligatorio de contraseña temporal en primer ingreso.

### Dashboard
- KPIs de biblioteca en tiempo real.
- Resumen de préstamos activos y vencidos.
- Vista de actividad reciente.

### Libros
- CRUD de inventario.
- Búsqueda por título, autor o ISBN.
- Filtros por categoría y disponibilidad.

### Préstamos
- Registro de nuevos préstamos.
- Devolución de libros.
- Estados: activo, devuelto, vencido y renovado.
- Filtros por estado, usuario y categoría.

### Notificaciones de retraso
- Avisos enviados por lectores.
- Revisión por staff/admin con aprobación o rechazo.

### Usuarios
- Gestión de lectores, bibliotecarios y administradores.
- Historial de préstamos por usuario.
- Alta de cuenta Auth para roles con acceso al sistema.

### Categorías
- CRUD de categorías.
- Validación para evitar eliminar categorías con libros asociados.

### Reportes
- Préstamos por mes.
- Disponibilidad del inventario.
- Ranking de libros más prestados.

### Portal del lector
- Consulta de préstamos activos.
- Envío de notificaciones de retraso con nueva fecha propuesta.
- Consulta del estado de notificaciones enviadas.

## Rutas principales

- /login
- /dashboard
- /books
- /books/new
- /books/:id
- /books/:id/edit
- /loans
- /loans/new
- /notifications
- /users
- /users/new
- /users/:id
- /users/:id/edit
- /categories
- /reports
- /my-loans
- /change-password

## Configuración local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Crea el archivo `.env.local` con este formato:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

Notas:
- `VITE_SUPABASE_SERVICE_ROLE_KEY` es opcional y solo aplica para flujos administrativos.

### 3. Ejecutar en desarrollo

```bash
npm install
npm run dev
```

## Scripts disponibles

- `npm run dev`: entorno de desarrollo.
- `npm run build`: build de producción.
- `npm run preview`: vista previa de build.

## Base de datos y SQL local

Los scripts SQL de inicialización/migración se manejan de forma local y no se publican en este repositorio.

## Seguridad

- Mantener `.env` y `.env.local` fuera de control de versiones.
- Usar placeholders en documentación y ejemplos.
