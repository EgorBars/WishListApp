export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at?: string;
}

export interface ReservationInfo {
  guest_name: string;
  reserved_at?: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  item_id?: string;
  title: string;
  price: number;
  currency: string;
  url?: string;
  image_url: string | null;
  priority: number;
  note?: string | null;
  is_purchased: boolean;
  is_reserved?: boolean;
  reserved_by?: ReservationInfo | null;
  added_at: string;
}

export interface WishlistSummary {
  id: string;
  user_id?: string;
  title: string;
  description: string | null;
  is_public: boolean;
  public_id?: string | null;
  share_url?: string | null;
  items_count: number;
  reserved_count?: number;
  purchased_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Wishlist extends WishlistSummary {
  items: WishlistItem[];
}

export interface PublicWishlist {
  id: string;
  title: string;
  description: string | null;
  owner_name: string;
  items: WishlistItem[];
}

export interface ShareLinkResponse {
  public_id: string;
  share_url: string;
}

export interface ReservationPayload {
  guest_name: string;
  guest_email: string;
}

export interface ReservationResponse {
  message: string;
  reservation_id: string;
  item_title: string;
}
