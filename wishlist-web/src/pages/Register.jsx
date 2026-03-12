import { useState } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom'; // 1. Добавляем импорт Link

const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Пароли не совпадают');
    }
    if (formData.password.length < 8) {
      return setError('Пароль должен быть не менее 8 символов');
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password
      });
      alert('Регистрация успешна! Теперь войдите.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-brand">Регистрация</h2>
        
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
          className="w-full p-2 mb-4 border rounded focus:ring-2 focus:ring-brand outline-none"
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />
        <input 
          type="password" 
          placeholder="Подтвердите пароль" 
          className="w-full p-2 mb-6 border rounded focus:ring-2 focus:ring-brand outline-none"
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          required
        />
        
        <button 
          disabled={isLoading}
          className="w-full bg-brand text-white p-2 rounded hover:bg-brand-dark transition-colors disabled:bg-gray-400"
        >
          {isLoading ? 'Загрузка...' : 'Создать аккаунт'}
        </button>

        {/* 2. Добавляем ссылку на логин */}
        <p className="mt-4 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-brand font-medium hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;