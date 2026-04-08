import { useCallback, useEffect, useRef, useState } from 'react';
import { parseItemUrl, ParsedItemData } from '../api/wishlistsApi';

interface UseItemParsingOptions {
  onSuccess?: (data: ParsedItemData) => void;
  onError?: (error: string) => void;
}

interface UseItemParsingState {
  isParsing: boolean;
  error: string | null;
  processedUrls: Set<string>;
}

/**
 * Hook для автоматического парсинга товаров по URL
 * Поддерживает:
 * - Debounce на 800мс при вводе текста
 * - Мгновенный запрос при вставке (paste event)
 * - Запрос при потере фокуса (blur event), если URL изменился
 * - Отмена предыдущих запросов через AbortController
 * - Приоритет действий пользователя над автоматикой
 * - Отслеживание обработанных URLs в рамках сессии
 */
export const useItemParsing = (options: UseItemParsingOptions = {}) => {
  const [state, setState] = useState<UseItemParsingState>({
    isParsing: false,
    error: null,
    processedUrls: new Set(),
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProcessedUrlRef = useRef<string>('');

  // Валидация URL по regex (наличие протокола и доменной зоны)
  const isValidUrl = useCallback((url: string): boolean => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, []);

  // Основная логика парсинга
  const parseUrl = useCallback(
    async (url: string) => {
      // Проверка дублирования: не отправляем запрос, если URL уже был обработан
      if (state.processedUrls.has(url) || lastProcessedUrlRef.current === url) {
        return;
      }

      // Pre-flight валидация
      if (!isValidUrl(url)) {
        setState(prev => ({ ...prev, error: 'Неверный формат ссылки' }));
        return;
      }

      // Отменяем предыдущий запрос если он еще выполняется
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setState(prev => ({ ...prev, isParsing: true, error: null }));

      try {
        const data = await parseItemUrl(url, abortControllerRef.current.signal);

        // Если запрос был отменен, не обновляем state
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        // Добавляем URL в обработанные
        setState(prev => ({
          ...prev,
          processedUrls: new Set([...prev.processedUrls, url]),
          isParsing: false,
          error: null,
        }));

        lastProcessedUrlRef.current = url;
        options.onSuccess?.(data);
      } catch (err: any) {
        // Пропускаем ошибку отмены запроса (AbortError)
        if (err.name === 'AbortError') {
          return;
        }

        const errorMessage =
          err.response?.status === 429
            ? 'Слишком много запросов. Попробуйте позже.'
            : err.response?.status === 401
              ? 'Требуется авторизация'
              : 'Не удалось заполнить поля автоматически. Пожалуйста, введите данные вручную';

        setState(prev => ({ ...prev, isParsing: false, error: errorMessage }));
        options.onError?.(errorMessage);
      }
    },
    [state.processedUrls, isValidUrl, options],
  );

  // Обработчик для debounce-ввода (800мс после прекращения набора текста)
  const handleUrlInputChange = useCallback((url: string) => {
    // Очищаем предыдущий таймер
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Устанавливаем новый таймер на 800мс
    debounceTimerRef.current = setTimeout(() => {
      parseUrl(url);
    }, 800);
  }, [parseUrl]);

  // Обработчик для paste-события (мгновенно без debounce)
  const handleUrlPaste = useCallback((url: string) => {
    // Отменяем debounce если он был установлен
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Парсим мгновенно
    parseUrl(url);
  }, [parseUrl]);

  // Обработчик для blur-события (если URL изменился и прошел валидацию)
  const handleUrlBlur = useCallback((url: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Парсим только если URL валиден и отличается от последнего обработанного
    if (isValidUrl(url) && url !== lastProcessedUrlRef.current) {
      parseUrl(url);
    }
  }, [isValidUrl, parseUrl]);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Сброс список обработанных URLs при открытии/закрытии модального окна
  const resetSession = useCallback(() => {
    setState(prev => ({ ...prev, processedUrls: new Set(), error: null, isParsing: false }));
    lastProcessedUrlRef.current = '';
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  return {
    isParsing: state.isParsing,
    error: state.error,
    handleUrlInputChange,
    handleUrlPaste,
    handleUrlBlur,
    resetSession,
  };
};
