import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import WishlistDetail from './pages/WishlistDetail';
import SharedView from './pages/SharedView';

function RootLayout() {
  const location = useLocation();
  const isSharedRoute = location.pathname.startsWith('/shared/');

  return (
    <div className="min-h-screen bg-gray-50">
      {!isSharedRoute ? <Navbar /> : null}
      <Outlet />
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'login',
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'shared/:publicId', element: <SharedView /> },
      {
        path: 'dashboard',
        element: (
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: 'wishlist/:id',
        element: (
          <PrivateRoute>
            <WishlistDetail />
          </PrivateRoute>
        ),
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
