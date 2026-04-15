import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Library } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-blue-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Library className="h-6 w-6" />
              <span className="font-bold text-xl tracking-wide">Smart Library</span>
            </div>
            
            {/* Nav Links - Only show to Users */}
            {user.role === 'User' && (
              <div className="hidden md:flex space-x-4 text-sm font-medium">
                <Link to="/user-dashboard" className="hover:text-blue-200 transition-colors">Catalog</Link>
                <Link to="/my-books" className="hover:text-blue-200 transition-colors">My Books</Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {/* ... Keep the existing user profile block and logout button here ... */}
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user.email}</span>
              <span className="text-xs bg-blue-700 px-2 py-0.5 rounded-full mt-1">
                {user.role}
              </span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-blue-700 hover:bg-blue-600 rounded-md transition duration-200" title="Logout">
              <LogOut className="h-5 w-5" />
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}