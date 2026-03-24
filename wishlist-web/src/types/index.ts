export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at?: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  item_id: string;
  title: string;
  price: number;
  currency: string;
  url?: string;
  image_url: string | null;
  priority: number;
  note: string | null;
  is_purchased: boolean;
  added_at: string;
}

// Тип для списка в Dashboard (Краткий)
export interface WishlistSummary {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  items_count: number;
  created_at: string;
  updated_at: string;
}

// Тип для детальной страницы (Расширенный - включает массив items)
// Мы наследуем всё из WishlistSummary и добавляем поле items
export interface Wishlist extends WishlistSummary {
  items: WishlistItem[];
}