import { useState } from 'react';
import { Gift, Link2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { SharedGiftCard } from '../components/shared/SharedGiftCard';
import { ReservationModal } from '../components/shared/ReservationModal';
import { usePublicWishlist } from '../hooks/usePublicWishlist';
import { useToast } from '../context/ToastContext';
import type { ReservationPayload, WishlistItem } from '../types';

function SharedViewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 animate-pulse rounded-[32px] bg-white p-8 shadow-sm">
        <div className="h-4 w-28 rounded-full bg-gray-100" />
        <div className="mt-4 h-10 w-2/3 rounded-2xl bg-gray-100" />
        <div className="mt-4 h-4 w-1/3 rounded-full bg-gray-100" />
        <div className="mt-6 h-20 rounded-3xl bg-gray-50" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-[28px] bg-white p-5 shadow-sm">
            <div className="aspect-[4/3] rounded-3xl bg-gray-100" />
            <div className="mt-4 h-6 rounded-full bg-gray-100" />
            <div className="mt-3 h-4 w-1/2 rounded-full bg-gray-100" />
            <div className="mt-6 h-11 rounded-2xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SharedView() {
  const { publicId = '' } = useParams<{ publicId: string }>();
  const { wishlist, loading, error, patchItem } = usePublicWishlist(publicId);
  const { showToast } = useToast();
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);

  const closeModal = () => setSelectedItem(null);

  const markReserved = (payload: ReservationPayload) => {
    if (!selectedItem) return;
    patchItem(selectedItem.id, {
      is_reserved: true,
      reserved_by: { guest_name: payload.guest_name },
    });
    closeModal();
    showToast('Подарок успешно забронирован!');
  };

  const markAlreadyReserved = () => {
    if (!selectedItem) return;
    patchItem(selectedItem.id, { is_reserved: true });
    closeModal();
    showToast('К сожалению, этот подарок уже забронировал другой гость.');
  };

  const markPurchased = () => {
    if (!selectedItem) return;
    patchItem(selectedItem.id, { is_purchased: true, is_reserved: false, reserved_by: null });
    closeModal();
    showToast('Этот подарок уже куплен.');
  };

  if (loading) return <SharedViewSkeleton />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,245,205,0.55),_transparent_38%),linear-gradient(180deg,#fffdf7_0%,#f7f8fc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {wishlist ? (
          <>
            <section className="mb-10 overflow-hidden rounded-[36px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                <Link2 size={14} />
                Публичный список
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-gray-900 sm:text-5xl">
                {wishlist.title}
              </h1>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.22em] text-gray-400">
                Владелец: {wishlist.owner_name}
              </p>
              {wishlist.description ? (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">{wishlist.description}</p>
              ) : null}
            </section>

            {wishlist.items.length > 0 ? (
              <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {wishlist.items.map((item) => (
                  <SharedGiftCard key={item.id} item={item} onReserve={setSelectedItem} />
                ))}
              </section>
            ) : (
              <section className="rounded-[32px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
                <Gift className="mx-auto mb-4 text-gray-300" size={40} />
                <h2 className="text-xl font-bold text-gray-900">В этом списке пока нет подарков</h2>
                <p className="mt-2 text-gray-500">Загляните позже — владелец может добавить новые идеи.</p>
              </section>
            )}
          </>
        ) : (
          <section className="mx-auto max-w-2xl rounded-[32px] border border-red-100 bg-white px-6 py-16 text-center shadow-sm">
            <Gift className="mx-auto mb-4 text-red-300" size={40} />
            <h1 className="text-2xl font-black text-gray-900">Список недоступен</h1>
            <p className="mt-3 text-gray-600">{error}</p>
          </section>
        )}
      </div>

      <ReservationModal
        isOpen={Boolean(selectedItem) && Boolean(wishlist)}
        item={selectedItem}
        publicId={publicId}
        onClose={closeModal}
        onSuccess={markReserved}
        onAlreadyReserved={markAlreadyReserved}
        onAlreadyPurchased={markPurchased}
      />
    </div>
  );
}
