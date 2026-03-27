import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/common/Spinner';
import { MSG, validateNewPassword } from '../utils/validators';

type PagePhase =
  | 'checking'
  | 'no-token'
  | 'form'
  | 'submitting'
  | 'success'
  | 'error-reset'
  | 'invalid-token';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [phase, setPhase] = useState<PagePhase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) {
      setPhase('no-token');
      return;
    }
    const t = window.setTimeout(() => setPhase('form'), 400);
    return () => window.clearTimeout(t);
  }, [token]);

  useEffect(() => {
    if (phase !== 'success') return;
    const t = window.setTimeout(() => navigate('/login'), 3000);
    return () => window.clearTimeout(t);
  }, [phase, navigate]);

  const canSave =
    validateNewPassword(password) === null && password === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');
    const pErr = validateNewPassword(password);
    setPasswordError(pErr ?? '');
    const cErr = password !== confirm ? MSG.passwordMismatch : null;
    setConfirmError(cErr ?? '');
    if (pErr || cErr) return;

    setPhase('submitting');
    try {
      await resetPassword(token, password);
      setPhase('success');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setPhase('invalid-token');
        return;
      }
      setPhase('error-reset');
    }
  };

  if (phase === 'checking') {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 bg-gray-50 p-6">
        <Spinner size="lg" className="text-brand-primary" />
        <p className="text-sm font-medium text-gray-600">Проверка ссылки...</p>
      </div>
    );
  }

  if (phase === 'no-token') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <p className="mb-8 text-gray-600">
          Ссылка для сброса пароля недействительна. Пожалуйста, запросите новую ссылку.
        </p>
        <Button type="button" className="max-w-xs" onClick={() => navigate('/login')}>
          Вернуться на страницу входа
        </Button>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg font-medium text-gray-900">
          Пароль успешно изменен. Теперь вы можете войти с новым паролем.
        </p>
        <p className="mt-4 text-sm text-gray-500">Перенаправление на вход...</p>
      </div>
    );
  }

  if (phase === 'invalid-token') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-6 text-gray-600">
          Срок действия ссылки истек или ссылка недействительна. Пожалуйста, запросите новую.
        </p>
        <Button type="button" className="mb-4 max-w-xs" onClick={() => navigate('/login', { state: { openForgotPassword: true } })}>
          Запросить новую ссылку
        </Button>
        <Link to="/login" className="block text-sm font-bold text-brand-primary">
          На страницу входа
        </Link>
      </div>
    );
  }

  if (phase === 'error-reset') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-6 text-gray-600">
          Не удалось изменить пароль. Ссылка недействительна или истекла. Запросите новую.
        </p>
        <Button type="button" className="max-w-xs" onClick={() => navigate('/login', { state: { openForgotPassword: true } })}>
          Запросить новую ссылку
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] justify-center bg-gray-50 p-4 sm:p-6">
      <div className="w-full max-w-[90vw] sm:max-w-lg lg:w-[500px]">
        <div className="rounded-3xl border border-gray-100 bg-white px-6 py-8 shadow-xl sm:px-8">
          <h1 className="mb-2 text-2xl font-extrabold text-gray-900">Установка нового пароля</h1>
          <p className="mb-8 text-sm text-gray-600">Введите новый пароль для вашего аккаунта</p>

          <ErrorMessage message={formError} />

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Новый пароль"
              type="password"
              autoComplete="new-password"
              maxLength={50}
              value={password}
              error={passwordError}
              onChange={(e) => {
                setPassword(e.target.value.replace(/\s+/g, ''));
                if (passwordError) setPasswordError('');
              }}
              onBlur={() => setPasswordError(validateNewPassword(password) ?? '')}
              disabled={phase === 'submitting'}
            />
            <Input
              label="Подтверждение пароля"
              type="password"
              autoComplete="new-password"
              maxLength={50}
              value={confirm}
              error={confirmError}
              onChange={(e) => {
                setConfirm(e.target.value.replace(/\s+/g, ''));
                if (confirmError) setConfirmError('');
              }}
              onBlur={() =>
                setConfirmError(password !== confirm ? MSG.passwordMismatch : '')
              }
              disabled={phase === 'submitting'}
            />

            <Button
              type="submit"
              isLoading={phase === 'submitting'}
              loadingLabel="Сохранение..."
              disabled={!canSave || phase === 'submitting'}
              className="min-h-[44px]"
            >
              Сохранить пароль
            </Button>
            <Button type="button" variant="secondary" className="min-h-[44px]" onClick={() => navigate('/login')}>
              Отмена
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
