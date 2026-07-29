// App.jsx — Root app with React Router v8 and context providers
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StoreProvider } from './contexts/StoreContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Layouts
import AppLayout from './components/shared/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import TasksPage from './pages/TasksPage';
import QuotationsPage from './pages/QuotationsPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import SalesOrderDetailPage from './pages/SalesOrderDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import StoresPage from './pages/admin/StoresPage';
import PipelinePage from './pages/admin/PipelinePage';
import AdminDocketTemplatesPage from './pages/admin/AdminDocketTemplatesPage';
import AdminWarrantyConfigPage from './pages/admin/AdminWarrantyConfigPage';
import AdminVendorsPage from './pages/admin/AdminVendorsPage';
import AdminDataExportsPage from './pages/admin/AdminDataExportsPage';

import ErrorBoundary from './components/shared/ErrorBoundary';
import PWAUpdatePrompt from './components/shared/PWAUpdatePrompt';

// Protected route wrapper
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, isAdmin } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
}

// Admin protected wrapper
function AdminRoute({ children }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}

// App shell — wraps authenticated routes with providers
function AuthenticatedShell({ children }) {
  return (
    <StoreProvider>
      <NotificationProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </NotificationProvider>
    </StoreProvider>
  );
}

// Router definition
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AuthenticatedShell>
          <AppLayout />
        </AuthenticatedShell>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'leads', element: <LeadsPage /> },
      { path: 'leads/:leadId', element: <LeadDetailPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'quotations', element: <QuotationsPage /> },
      { path: 'sales-orders', element: <SalesOrdersPage /> },
      { path: 'sales-orders/:orderId', element: <SalesOrderDetailPage /> },
      { path: 'purchase-orders', element: <PurchaseOrdersPage /> },
      {
        path: 'admin',
        element: <AdminRoute><AdminDashboard /></AdminRoute>,
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: 'users', element: <AdminRoute><UsersPage /></AdminRoute> },
          { path: 'stores', element: <AdminRoute><StoresPage /></AdminRoute> },
          { path: 'pipeline', element: <AdminRoute><PipelinePage /></AdminRoute> },
          { path: 'docket-templates', element: <AdminRoute><AdminDocketTemplatesPage /></AdminRoute> },
          { path: 'warranty-config', element: <AdminRoute><AdminWarrantyConfigPage /></AdminRoute> },
          { path: 'vendors', element: <AdminRoute><AdminVendorsPage /></AdminRoute> },
          { path: 'exports', element: <AdminRoute><AdminDataExportsPage /></AdminRoute> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

// Root app with auth and theme providers
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <PWAUpdatePrompt />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
