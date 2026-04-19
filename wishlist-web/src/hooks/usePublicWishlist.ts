import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getPublicWishlist } from '../api/wishlistsApi';
import type { PublicWishlist, WishlistItem } from '../types';

const FALLBACK_MESSAGE = 'Не удалось загрузить список. Проверьте ссылку или попробуйте позже.';

function getPublicWishlistErrorMessage(status?: number) {
  if (status === 404) return 'Список не найден. Возможно, ссылка устарела.';
  if (status === 403) {
    return 'Этот список является приватным. Владелец не разрешил публичный доступ.';
  }
  if (status === 429) return 'Слишком много запросов. Попробуйте позже.';
  return FALLBACK_MESSAGE;
}

export function usePublicWishlist(publicId?: string) {
  const [wishlist, setWishlist] = useState<PublicWishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!publicId) {
        setWishlist(null);
        setError(FALLBACK_MESSAGE);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await getPublicWishlist(publicId, signal);
        setWishlist(data);
      } catch (error) {
        if (axios.isCancel(error)) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        setWishlist(null);
        setError(getPublicWishlistErrorMessage(status));
      } finally {
        setLoading(false);
      }
    },
    [publicId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const patchItem = useCallback((itemId: string, patch: Partial<WishlistItem>) => {
    setWishlist((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      };
    });
  }, []);

  return {
    wishlist,
    loading,
    error,
    reload: load,
    patchItem,
  };
}
