import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { validateEmailRequired, validateForgotEmail, MSG } from '../utils/validators';

const FORGOT_SUCCESS_TOAST =
  'Если пользователь с таким email существует, ссылка для сброса пароля отправлена';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryEmailError, setRecoveryEmailError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const { login, forgotPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const st = location.state as { openForgotPassword?: boolean } | null;
    if (st?.openForgotPassword) {
      setIsRecoveryOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const closeRecovery = () => {
    setIsRecoveryOpen(false);
    setRecoveryEmail('');
    setRecoveryEmailError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const eErr = validateEmailRequired(email);
    setEmailError(eErr ?? '');
    const pErr = !password ? MSG.passwordRequired : null;
    setPasswordError(pErr ?? '');
    if (eErr || pErr) return;

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setFormError('Неверный email или пароль');
        setPassword('');
        return;
      }
      if (!axios.isAxiosError(err) || !err.response) {
        setFormError('Сервер недоступен. Проверьте подключение.');
        return;
      }
      setFormError('Ошибка входа. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const recoveryValid = validateForgotEmail(recoveryEmail) === null && recoveryEmail.trim().length > 0;

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateForgotEmail(recoveryEmail);
    setRecoveryEmailError(v ?? '');
    if (v) return;

    setRecoveryLoading(true);
    setRecoveryEmailError('');
    try {
      await forgotPassword(recoveryEmail.trim());
      showToast(FORGOT_SUCCESS_TOAST);
      window.setTimeout(() => {
        closeRecovery();
      }, 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setRecoveryEmailError('Слишком много попыток. Попробуйте позже');
        return;
      }
      if (!axios.isAxiosError(err) || !err.response) {
        setRecoveryEmailError('Не удалось отправить запрос. Проверьте подключение к интернету');
        return;
      }
      setRecoveryEmailError('Не удалось отправить запрос. Попробуйте позже');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md sm:max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Вход</h1>
          <p className="mt-2 text-sm tracking-tight text-gray-600">Рады вас видеть!</p>
        </div>

        <div className="space-y-6 rounded-3xl border border-gray-100 bg-white px-8 py-8 shadow-2xl">
          <ErrorMessage message={formError} />

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="example@mail.com"
              value={email}
              error={emailError}
              maxLength={255} // Ограничение согласно спецификации БД
              onChange={(e) => {
                setEmail(e.target.value.replace(/\s+/g, ''));
                if (emailError) setEmailError('');
              }}
              onBlur={() => setEmailError(validateEmailRequired(email) ?? '')}
              disabled={isLoading}
            />

            <div className="space-y-2">
              <Input
                label="Пароль"
                type="password"
                autoComplete="current-password"
                maxLength={50} // Ограничение согласно спецификации (8-50)
                placeholder="••••••••"
                value={password}
                error={passwordError}
                onChange={(e) => {
                  setPassword(e.target.value.replace(/\s+/g, ''));
                  if (passwordError) setPasswordError('');
                }}
                onBlur={() => setPasswordError(!password ? MSG.passwordRequired : '')}
                disabled={isLoading}
              />
              <div className="text-center md:text-right">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmailError('');
                    setIsRecoveryOpen(true);
                  }}
                  className="min-h-[44px] text-sm font-bold text-brand-primary hover:underline focus:rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  aria-label="Восстановление пароля"
                >
                  Забыли пароль?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              loadingLabel="Вход..."
              className="h-14 text-lg shadow-lg shadow-indigo-100"
              disabled={isLoading || !email.trim() || !password}
            >
              Войти
            </Button>

            <p className="pt-2 text-center text-sm text-gray-500">
              Нет аккаунта?{' '}
              <Link to="/register" className="font-bold text-brand-primary transition-colors hover:text-brand-secondary">
                Зарегистрироваться
              </Link>
            </p>
          </form>
        </div>
      </div>

      <Modal isOpen={isRecoveryOpen} onClose={closeRecovery} title="Восстановление пароля">
        <form onSubmit={handleRecoverySubmit} className="space-y-5">
          <p className="text-sm leading-relaxed text-gray-500">
            Введите email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
          </p>

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ivan@example.com"
            value={recoveryEmail}
            error={recoveryEmailError}
            maxLength={255} // Ограничение для email в модалке
            onChange={(e) => {
              setRecoveryEmail(e.target.value.replace(/\s+/g, ''));
              if (recoveryEmailError) setRecoveryEmailError('');
            }}
            onBlur={() => setRecoveryEmailError(validateForgotEmail(recoveryEmail) ?? '')}
            disabled={recoveryLoading}
          />

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              isLoading={recoveryLoading}
              loadingLabel="Отправка..."
              className="h-12 min-h-[44px]"
              disabled={!recoveryValid || recoveryLoading}
            >
              Отправить ссылку
            </Button>
            <button
              type="button"
              onClick={closeRecovery}
              className="min-h-[44px] w-full py-2 text-center text-sm font-bold text-gray-400 transition-colors hover:text-gray-600"
            >
              Отмена
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Login;