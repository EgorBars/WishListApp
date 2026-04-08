import api from './axiosInstance';
import type { Wishlist, WishlistItem, WishlistSummary } from '../types';

export async function fetchWishlists(): Promise<WishlistSummary[]> {
  const { data } = await api.get<WishlistSummary[]>('/wishlists');
  return data;
}

export async function fetchWishlist(id: string): Promise<Wishlist> {
  const { data } = await api.get<Wishlist>(`/wishlists/${id}`);
  return data;
}

export async function createWishlist(body: {
  title: string;
  description?: string | null;
  is_public?: boolean;
}): Promise<void> {
  await api.post('/wishlists', body);
}

export async function updateWishlist(
  id: string,
  body: { title?: string; description?: string | null; is_public?: boolean },
): Promise<Wishlist> {
  const { data } = await api.put<Wishlist>(`/wishlists/${id}`, body);
  return data;
}

export async function deleteWishlist(id: string): Promise<void> {
  await api.delete(`/wishlists/${id}`);
}

export async function addWishlistItem(
  wishlistId: string,
  body: {
    title: string;
    url: string;
    price: number;
    currency?: 'BYN' | 'USD' | 'EUR';
    image_url?: string | null;
    priority?: number;
    note?: string | null;
  },
): Promise<WishlistItem> {
  const { data } = await api.post<WishlistItem>(`/wishlists/${wishlistId}/items`, body);
  return data;
}

export async function updateWishlistItem(
  wishlistId: string,
  itemId: string,
  body: { note?: string | null; priority?: number; is_purchased?: boolean },
): Promise<WishlistItem> {
  const { data } = await api.put<WishlistItem>(`/wishlists/${wishlistId}/items/${itemId}`, body);
  return data;
}

export async function deleteWishlistItem(wishlistId: string, itemId: string): Promise<void> {
  await api.delete(`/wishlists/${wishlistId}/items/${itemId}`);
}

/**
 * Parse item metadata from URL (title, price, image)
 * Endpoint: POST /api/v1/items/parse
 * Returns partial success (nullable fields) for graceful fallback
 */
export interface ParsedItemData {
  title: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  url: string;
}

export async function parseItemUrl(
  url: string,
  signal?: AbortSignal,
): Promise<ParsedItemData> {
  const { data } = await api.post<ParsedItemData>(
    '/items/parse',
    { url },
    { signal },
  );
  return data;
}
