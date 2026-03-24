import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Используем URLSearchParams вместо обычного объекта или FormData
      const params = new URLSearchParams();
      params.append('username', formData.email); // Важно: FastAPI ждет именно 'username'
      params.append('password', formData.password);

      const response = await api.post('/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log("Успешный вход!", response.data);
      login(response.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      console.error("Ошибка логина:", err.response?.data);
      // Если бэкенд вернул 422, выведем детали ошибки в консоль
      setError(err.response?.data?.detail || 'Неверный логин или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-brand">Вход</h2>
        
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        
        <input 
          type="email" 
          placeholder="Email" 
          className="w-full p-2 mb-4 border rounded focus:ring-2 focus:ring-brand outline-none"
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          required
        />
        <input 
          type="password" 
          placeholder="Пароль" 
          className="w-full p-2 mb-6 border rounded focus:ring-2 focus:ring-brand outline-none"
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />
        
        <button 
          disabled={isLoading}
          className="w-full bg-brand text-white p-2 rounded hover:bg-brand-dark transition-colors disabled:bg-gray-400"
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>

        <p className="mt-4 text-center text-sm">
          Нет аккаунта? <Link to="/register" className="text-brand hover:underline">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;