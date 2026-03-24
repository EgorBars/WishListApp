import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { MSG, validateEmailRequired, validatePasswordAuth } from '../utils/validators';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const canSubmit = useMemo(() => {
    return (
      validateEmailRequired(email) === null &&
      validatePasswordAuth(password) === null &&
      password === confirmPassword &&
      confirmPassword.length > 0
    );
  }, [email, password, confirmPassword]);

  const touch = (key: keyof typeof touched) => setTouched((t) => ({ ...t, [key]: true }));

  useEffect(() => {
    if (touched.email) setEmailError(validateEmailRequired(email) ?? '');
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) setPasswordError(validatePasswordAuth(password) ?? '');
  }, [password, touched.password]);

  useEffect(() => {
    if (!touched.confirm) return;
    if (!confirmPassword || password !== confirmPassword) setConfirmError(MSG.passwordMismatch);
    else setConfirmError('');
  }, [confirmPassword, password, touched.confirm]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setTouched({ email: true, password: true, confirm: true });

    const eErr = validateEmailRequired(email);
    const pErr = validatePasswordAuth(password);
    const cErr = password !== confirmPassword ? MSG.passwordMismatch : null;

    setEmailError(eErr ?? '');
    setPasswordError(pErr ?? '');
    setConfirmError(cErr ?? '');
    if (eErr || pErr || cErr) return;

    setIsLoading(true);
    try {
      await register(email.trim(), password);
      showToast('Регистрация прошла успешно');
      window.setTimeout(() => navigate('/login'), 1600);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setFormError('Пользователь с таким email уже зарегистрирован');
        return;
      }
      setFormError('Ошибка регистрации. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Создать аккаунт</h1>
          <p className="mt-2 text-sm text-gray-600">Начните свой список желаний прямо сейчас</p>
        </div>

        <div className="space-y-6 rounded-3xl border border-gray-100 bg-white px-8 py-8 shadow-2xl">
          <ErrorMessage message={formError} />

          <form onSubmit={handleRegister} className="space-y-5" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="ivan@example.com"
              value={email}
              error={emailError}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                touch('email');
                setEmailError(validateEmailRequired(email) ?? '');
              }}
              disabled={isLoading}
            />

            <Input
              label="Пароль"
              type="password"
              minLength={8}
              maxLength={50}
              autoComplete="new-password"
              placeholder="Минимум 8 символов"
              value={password}
              error={passwordError}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => {
                touch('password');
                setPasswordError(validatePasswordAuth(password) ?? '');
              }}
              disabled={isLoading}
            />

            <Input
              label="Подтвердите пароль"
              type="password"
              maxLength={50}
              autoComplete="off"
              placeholder="Повторите пароль"
              value={confirmPassword}
              error={confirmError}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => touch('confirm')}
              disabled={isLoading}
            />

            <Button
              type="submit"
              isLoading={isLoading}
              loadingLabel="Регистрация..."
              className="mt-2 h-14 min-h-[44px] text-lg shadow-lg shadow-indigo-100"
              disabled={!canSubmit || isLoading}
            >
              Зарегистрироваться
            </Button>

            <p className="pt-2 text-center text-sm text-gray-500">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="font-bold text-brand-primary transition-colors hover:text-brand-secondary">
                Войти
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
