import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useAuth } from './context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const token = response.data.access_token;
      login(token);

      const decoded = jwtDecode<{ role: string }>(token);
      if (decoded.role === 'Librarian') {
        navigate('/librarian-dashboard');
      } else {
        navigate('/user-dashboard');
      }

      toast.success('Logged in successfully!');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (!err.response) {
          toast.error('Login request reached the backend, but the browser blocked the response. Check API URL and CORS settings.');
          return;
        }

        toast.error(typeof detail === 'string' ? detail : 'Login failed.');
        return;
      }

      toast.error('Login failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post('/register', {
        name,
        email,
        password,
        role: 'User'
      });

      toast.success('Account created successfully! Logging you in...');

      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const response = await api.post('/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const token = response.data.access_token;
      login(token);
      navigate('/user-dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to register account.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Toaster position="top-center" /> {/* Toast container */}
      <form onSubmit={isRegistering ? handleRegister : handleLogin} className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h2 className="mb-6 text-3xl font-bold text-center text-gray-800">
          {isRegistering ? 'Create a New Account' : 'Library Login'}
        </h2>
        
        {isRegistering && (
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-600">Name</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-600">Email</label>
          <input
            type="email"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-600">Password</label>
          <input
            type="password"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          className="w-full py-3 font-semibold text-white transition duration-200 bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {isRegistering ? 'Create Account' : 'Sign In'}
        </button>

        <div className="mt-4 text-center text-sm text-gray-500">
          {isRegistering ? (
            <span>
              Already have an account?{' '}
              <button type="button" onClick={() => setIsRegistering(false)} className="font-semibold text-blue-600 hover:underline">Sign In</button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button type="button" onClick={() => setIsRegistering(true)} className="font-semibold text-blue-600 hover:underline">Register</button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
