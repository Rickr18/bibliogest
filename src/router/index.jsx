import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout.jsx'
import { ProtectedRoute } from '../components/layout/ProtectedRoute.jsx'
import { LoginPage } from '../pages/auth/LoginPage.jsx'
import { ChangePasswordPage } from '../pages/auth/ChangePasswordPage.jsx'
import { DashboardPage } from '../pages/DashboardPage.jsx'
import { BooksPage } from '../pages/books/BooksPage.jsx'
import { BookDetailPage } from '../pages/books/BookDetailPage.jsx'
import { BookFormPage } from '../pages/books/BookFormPage.jsx'
import { LoansPage } from '../pages/loans/LoansPage.jsx'
import { NewLoanPage } from '../pages/loans/NewLoanPage.jsx'
import { NotificationsPage } from '../pages/loans/NotificationsPage.jsx'
import { UsersPage } from '../pages/users/UsersPage.jsx'
import { UserDetailPage } from '../pages/users/UserDetailPage.jsx'
import { UserFormPage } from '../pages/users/UserFormPage.jsx'
import { ReportsPage } from '../pages/reports/ReportsPage.jsx'
import { FinesPage } from '../pages/fines/FinesPage.jsx'
import { CategoriesPage } from '../pages/categories/CategoriesPage.jsx'
import { ReaderPortalPage } from '../pages/reader/ReaderPortalPage.jsx'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'books', element: <BooksPage /> },
      { path: 'books/new', element: <BookFormPage /> },
      { path: 'books/:id', element: <BookDetailPage /> },
      { path: 'books/:id/edit', element: <BookFormPage /> },
      { path: 'loans', element: <LoansPage /> },
      { path: 'loans/new', element: <NewLoanPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'users/new', element: <UserFormPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      { path: 'users/:id/edit', element: <UserFormPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'fines', element: <FinesPage /> },
      { path: 'my-loans', element: <ReaderPortalPage /> },
      { path: 'change-password', element: <ChangePasswordPage /> },
    ],
  },
])
