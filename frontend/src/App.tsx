import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LibrarianDashboard from './pages/LibrarianDashboard';
import UserDashboard from './pages/UserDashboard';
import { useAuth } from './context/AuthContext';
import MyBooks from './pages/MyBooks';

// A simple component to handle the root "/" URL based on login status
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'Librarian' ? '/librarian-dashboard' : '/user-dashboard'} replace />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Navbar will decide internally whether to render based on user state */}
        <Navbar /> 
        
        <main className="flex-grow">
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Route: Users Only */}
            <Route element={<ProtectedRoute allowedRoles={['User']} />}>
              <Route path="/user-dashboard" element={<UserDashboard />} />
              <Route path="/my-books" element={<MyBooks />} />
            </Route>

            

            {/* Protected Route: Librarians Only */}
            <Route element={<ProtectedRoute allowedRoles={['Librarian']} />}>
              <Route path="/librarian-dashboard" element={<LibrarianDashboard />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;