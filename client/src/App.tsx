import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import './App.css';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { BlogPage } from './pages/BlogPage';
import { ArticlePage } from './pages/ArticlePage';
import { DynamicPage } from './pages/DynamicPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminNavbarPage } from './pages/AdminNavbarPage';
import { AdminHomePage } from './pages/AdminHomePage';
import { AdminPagesPage } from './pages/AdminPagesPage';
import { AdminArticlesPage } from './pages/AdminArticlesPage';
import { AdminArticleEditorPage } from './pages/AdminArticleEditorPage';
import { AdminPageEditorPage } from './pages/AdminPageEditorPage';
import { AdminMediaPage } from './pages/AdminMediaPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { AdminFormSubmissionsPage } from './pages/AdminFormSubmissionsPage';
import { AdminFormSubmissionDetailPage } from './pages/AdminFormSubmissionDetailPage';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/sobre', element: <AboutPage /> },
      { path: '/contato', element: <ContactPage /> },
      { path: '/p/:slug', element: <DynamicPage /> },
      { path: '/blog', element: <BlogPage /> },
      { path: '/blog/:slug', element: <ArticlePage /> }
    ]
  },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'navbar', element: <AdminNavbarPage /> },
      { path: 'home', element: <AdminHomePage /> },
      { path: 'pages', element: <AdminPagesPage /> },
      { path: 'pages/new', element: <AdminPageEditorPage /> },
      { path: 'pages/:id/edit', element: <AdminPageEditorPage /> },
      { path: 'articles', element: <AdminArticlesPage /> },
      { path: 'articles/new', element: <AdminArticleEditorPage /> },
      { path: 'articles/:id/edit', element: <AdminArticleEditorPage /> },
      { path: 'media', element: <AdminMediaPage /> },
      { path: 'form-submissions', element: <AdminFormSubmissionsPage /> },
      { path: 'form-submissions/:id', element: <AdminFormSubmissionDetailPage /> },
      { path: 'settings', element: <AdminSettingsPage /> }
    ]
  }
]);

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('cris_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
