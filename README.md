# BiblioGest 📚
**Sistema de Información para el Control de Préstamos y Devoluciones**

> Materia: Administración de Sistemas de Información  
> Integrantes: Angelin Escalante · Rick Rios

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Estilos | TailwindCSS + CSS Variables |
| Tipografía | DM Serif Display + DM Sans |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Estado servidor | TanStack Query v5 |
| Estado global | Zustand |
| Routing | React Router v6 |
| Gráficas | Recharts |

---

## Estructura del proyecto

```
src/
├── components/
│   ├── layout/          # Layout, Sidebar, Header, ProtectedRoute
│   └── ui/              # Modal, SearchBar, Misc (Spinner, Badge, Pagination...)
├── pages/
│   ├── auth/            # LoginPage
│   ├── books/           # BooksPage, BookFormPage, BookDetailPage
│   ├── loans/           # LoansPage, NewLoanPage
│   ├── users/           # UsersPage, UserFormPage, UserDetailPage
│   └── reports/         # ReportsPage
├── services/            # Supabase queries por módulo
├── hooks/               # useSearch, useDebounce
├── store/               # Zustand (auth + UI/toasts)
├── utils/               # dates.js, constants.js
└── router/              # React Router config
supabase/
├── migrations/
│   ├── 001_initial_schema.sql   # Tablas + triggers automáticos
│   ├── 002_rls_policies.sql     # Row Level Security
│   └── 003_views_functions.sql  # Vistas y función de dashboard
└── seed.sql                     # Datos de prueba
```

---

## Configuración inicial

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_views_functions.sql`
   - `supabase/seed.sql` *(opcional — datos de prueba)*
3. Ve a **Authentication → Users** y crea un usuario de prueba (staff)

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Las credenciales están en tu proyecto Supabase → **Settings → API**.

### 3. Instalar y correr

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## Módulos del sistema

### Dashboard
- KPIs en tiempo real: libros disponibles, préstamos activos, vencidos, usuarios, actividad mensual
- Panel de alertas de préstamos vencidos
- Lista de préstamos activos con días restantes
- Accesos rápidos a acciones frecuentes

### 📚 Libros (Inventario)
- Lista completa con búsqueda full-text por título, autor o ISBN
- Filtros por categoría y disponibilidad
- Ficha detallada con historial de préstamos del libro
- Stock automático (triggers en BD)
- CRUD completo: crear, editar, eliminar

### 📋 Préstamos
- Lista con filtros por estado (activo, devuelto, vencido, renovado)
- Búsqueda por usuario o libro
- Indicadores visuales de días restantes / retraso
- Registro de devolución con confirmación modal
- Nuevo préstamo: búsqueda en vivo de usuario + libro disponible

### 👤 Usuarios
- Registro de lectores con documento, contacto y notas
- Roles: lector, bibliotecario, administrador
- Perfil con historial completo de préstamos
- Estadísticas por usuario (activos, devueltos, vencidos)

### 📊 Reportes
- Gráfica de barras: préstamos por mes del año actual
- Gráfica de torta: disponibilidad del inventario
- Ranking de libros más prestados con barra de popularidad

---

## Base de datos

### Tablas principales
| Tabla | Descripción |
|-------|-------------|
| `users` | Lectores registrados (no usuarios de auth) |
| `books` | Inventario con stock por ejemplar |
| `categories` | Clasificación de libros |
| `loans` | Préstamos con estado y fechas |
| `loan_history` | Trazabilidad de eventos por préstamo |

### Automatizaciones (triggers)
- **Stock**: al crear un préstamo, `available_copies--`. Al devolver, `available_copies++`
- **Historial**: cada cambio de estado genera un registro en `loan_history`
- **Timestamps**: `updated_at` se actualiza automáticamente

### Vistas
- `active_loans_view`: préstamos activos con datos completos de usuario y libro
- `overdue_loans_view`: préstamos vencidos con días de retraso
- `user_loan_history_view`: historial completo por usuario

### Función RPC
- `get_dashboard_stats()`: retorna JSON con todos los KPIs del dashboard en una sola query
