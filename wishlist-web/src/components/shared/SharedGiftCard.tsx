import { ExternalLink, Gift, Star } from 'lucide-react';
import { Button } from '../common/Button';
import type { WishlistItem } from '../../types';

interface SharedGiftCardProps {
  item: WishlistItem;
  onReserve: (item: WishlistItem) => void;
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'BYN' ? 0 : 2,
  }).format(price);
}

export function SharedGiftCard({ item, onReserve }: SharedGiftCardProps) {
  const isReserved = Boolean(item.is_reserved);
  const isPurchased = item.is_purchased;
  const isFree = !isReserved && !isPurchased;

  return (
    <article
      className={`overflow-hidden rounded-[28px] border bg-white p-5 shadow-sm transition-all ${
        isFree
          ? 'border-gray-100 hover:-translate-y-1 hover:border-brand-primary/25 hover:shadow-xl'
          : 'border-gray-100'
      } ${isPurchased ? 'bg-gray-50/70' : ''}`}
    >
      <div className="mb-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-indigo-50">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className={`h-full w-full object-cover ${isPurchased ? 'grayscale-[0.35]' : ''}`}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <Gift size={36} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Без фото</span>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-lg font-bold leading-tight text-gray-900">{item.title}</h3>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={12}
              className={index < item.priority ? 'fill-current' : 'opacity-30'}
            />
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-base font-bold text-brand-primary">{formatPrice(item.price, item.currency)}</p>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
          >
            Открыть
            <ExternalLink size={13} />
          </a>
        ) : null}
      </div>

      {isFree ? (
        <Button className="min-h-[44px]" onClick={() => onReserve(item)}>
          Забронировать
        </Button>
      ) : null}

      {isReserved ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Забронировано: {item.reserved_by?.guest_name ?? 'Гость'}
        </div>
      ) : null}

      {isPurchased ? (
        <div className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white">
          Куплено
        </div>
      ) : null}
    </article>
  );
}
