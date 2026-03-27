import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, Plus, ExternalLink, 
  CheckCircle2, Circle, Gift, Edit2, Star, MessageSquare, ImageIcon 
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Textarea } from '../components/common/Textarea';
import { Wishlist, WishlistItem } from '../types';
import api from '../api/axiosInstance';

const WishlistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [list, setList] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<'all' | 'active' | 'purchased'>('all');
  const [isDelListOpen, setIsDelListOpen] = useState(false);
  const [isEditListOpen, setIsEditListOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDelItemOpen, setIsDelItemOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null);
  
  const [listForm, setListForm] = useState({ title: '', description: '', is_public: false });

  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [itemForm, setItemForm] = useState({
    title: '', 
    url: '', 
    price: '' as string | number, 
    currency: 'BYN', 
    image_url: '', 
    priority: 3, 
    note: ''
  });

  // Валидация URL (обязательное поле)
  const isValidUrl = (url: string) => {
    if (!url.trim()) return false;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  // Валидация всей формы (Название, Ссылка и Цена — обязательны)
  const isItemFormValid = useMemo(() => {
    const titleOk = itemForm.title.trim().length > 0;
    const priceOk = itemForm.price !== '' && !isNaN(Number(itemForm.price));
    const urlValid = isValidUrl(itemForm.url);
    const imageValid = !itemForm.image_url.trim() || isValidUrl(itemForm.image_url);
    
    return titleOk && priceOk && urlValid && imageValid;
  }, [itemForm]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/wishlists/${id}`);
      setList(res.data);
    } catch (e) {
      setList({
        id: id || '1', title: 'Мой День Рождения', description: 'Список подарков!', is_public: true, items_count: 2, created_at: '2024-03-24T10:00:00Z', updated_at: '',
        items: [
          { id: 'i1', title: 'Кроссовки Nike', price: 350, currency: 'BYN', is_purchased: false, priority: 5, url: 'https://nike.com', note: 'Размер 42', added_at: '', wishlist_id: '1', item_id: '1', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff' },
          { id: 'i2', title: 'Колонка', price: 150, currency: 'BYN', is_purchased: true, priority: 3, url: 'https://ya.ru', added_at: '', wishlist_id: '1', item_id: '2', image_url: '' }
        ]
      } as any);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.startsWith('.')) value = '0' + value;
    if (value !== '' && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setItemForm({ ...itemForm, price: value });
  };

  const openEditList = () => {
    if (list) {
      setListForm({ title: list.title, description: list.description || '', is_public: list.is_public });
      setIsEditListOpen(true);
    }
  };

  const handleUpdateList = async () => {
    if (!listForm.title.trim()) return;
    try {
      await api.put(`/wishlists/${id}`, listForm);
      setIsEditListOpen(false);
      fetchData();
    } catch (e) { alert("Ошибка обновления списка"); }
  };

  const handleSaveItem = async () => {
    if (!isItemFormValid) return;
    try {
      if (editingItem) {
        await api.put(`/wishlists/${id}/items/${editingItem.id}`, {
          title: itemForm.title.trim(),
          url: itemForm.url.trim(),
          price: Number(itemForm.price),
          currency: itemForm.currency,
          image_url: itemForm.image_url.trim() || null,
          note: itemForm.note.trim() || null,
          priority: itemForm.priority,
        });
      } else {
        await api.post(`/wishlists/${id}/items`, {
          title: itemForm.title.trim(),
          url: itemForm.url.trim(),
          price: Number(itemForm.price),
          currency: itemForm.currency,
          image_url: itemForm.image_url.trim() || null,
          priority: itemForm.priority,
          note: itemForm.note.trim() || null,
        });
      }
      setIsItemModalOpen(false);
      fetchData();
    } catch (e) { setIsItemModalOpen(false); }
  };

  const togglePurchased = async (item: WishlistItem) => {
    try {
      await api.put(`/wishlists/${id}/items/${item.id}`, { is_purchased: !item.is_purchased });
      fetchData();
    } catch (e) {
      if (list && list.items) {
        const updated = list.items.map(i => i.id === item.id ? {...i, is_purchased: !i.is_purchased} : i);
        setList({...list, items: updated});
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.delete(`/wishlists/${id}/items/${itemId}`);
      fetchData();
    } catch (e) { alert("Ошибка удаления"); }
  };

  const handleDeleteList = async () => {
    try { await api.delete(`/wishlists/${id}`); navigate('/dashboard'); } 
    catch (e) { navigate('/dashboard'); }
  };

  if (loading) return <div className="text-center mt-20 text-gray-500 font-medium">Загрузка...</div>;
  if (!list) return null;

  const filteredItems = list?.items?.filter((item: WishlistItem) => {
    if (filter === 'active') return !item.is_purchased;
    if (filter === 'purchased') return item.is_purchased;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-500 hover:text-brand-primary mb-6 transition-all group font-bold">
        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
        Назад к спискам
      </button>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{list.title}</h1>
            <span className="px-2.5 py-1 bg-indigo-50 text-brand-primary text-[10px] font-bold rounded-lg uppercase tracking-wider">
              {list.is_public ? 'Публичный' : 'Приватный'}
            </span>
          </div>
          <p className="text-gray-500 text-lg">{list.description || 'Описание не добавлено'}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" className="flex-1 sm:w-12 sm:h-12 p-0 rounded-2xl" onClick={openEditList}>
            <Edit2 size={20} />
          </Button>
          <Button variant="danger" className="flex-1 sm:w-12 sm:h-12 p-0 rounded-2xl" onClick={() => setIsDelListOpen(true)}>
            <Trash2 size={20} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
           <h2 className="text-xl font-bold text-gray-900">Товары ({list.items?.length || 0})</h2>
           <div className="flex bg-gray-100 p-1 rounded-xl mt-3 w-fit">
              <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Все</button>
              <button onClick={() => setFilter('active')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Нужно купить</button>
              <button onClick={() => setFilter('purchased')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'purchased' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Куплено</button>
           </div>
        </div>
        <Button onClick={() => { setEditingItem(null); setItemForm({title:'', url:'', price:'', currency:'BYN', image_url:'', priority:3, note:''}); setIsItemModalOpen(true); }} className="w-full sm:w-auto py-2.5 px-6 flex gap-2 h-11 shadow-md">
          <Plus size={18} /> Добавить подарок
        </Button>
      </div>

      <div className="space-y-4">
        {(!filteredItems || filteredItems.length === 0) ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
            <Gift className="mx-auto mb-3 opacity-10" size={48} />
            <p className="font-bold">Ничего не найдено</p>
          </div>
        ) : (
          filteredItems.map((item: WishlistItem) => (
            <div key={item.id} className={`bg-white p-5 rounded-3xl border transition-all flex items-center gap-5 group ${item.is_purchased ? 'border-gray-50 opacity-60' : 'border-gray-100 hover:border-brand-primary shadow-sm'}`}>
              <div onClick={() => togglePurchased(item)} className="text-brand-primary cursor-pointer hover:scale-110 transition-transform active:scale-95">
                {item.is_purchased ? <CheckCircle2 size={30} className="text-green-500" /> : <Circle size={30} className="text-gray-200" />}
              </div>

              {/* КАРТИНКА ТОВАРА: С проверкой наличия */}
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-primary flex-shrink-0 overflow-hidden border border-gray-100 relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 opacity-20">
                    <ImageIcon size={28} />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">Нет фото</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-bold truncate text-lg ${item.is_purchased ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.title}</h4>
                  <div className="flex items-center text-amber-400 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <Star size={10} className="fill-current mr-0.5" /> {item.priority}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-bold">
                  <span className="text-brand-primary">{Number(item.price).toLocaleString()} {item.currency}</span>
                  {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-primary transition-colors"><ExternalLink size={16} /></a>}
                </div>
                {item.note && <p className="text-gray-400 text-xs mt-2 flex items-center gap-1.5 line-clamp-1"><MessageSquare size={12} /> {item.note}</p>}
              </div>

              <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => {
                   setEditingItem(item);
                   setItemForm({title: item.title, url: item.url || '', price: item.price.toString(), currency: item.currency, image_url: item.image_url || '', priority: item.priority, note: item.note || ''});
                   setIsItemModalOpen(true);
                }} className="p-2.5 text-gray-400 hover:text-brand-primary hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                <button
                  onClick={() => {
                    setItemToDelete(item);
                    setIsDelItemOpen(true);
                  }}
                  className="p-2.5 text-gray-400 hover:text-brand-error hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* МОДАЛКИ */}
      <Modal isOpen={isEditListOpen} onClose={() => setIsEditListOpen(false)} title="Настройки списка">
        <div className="space-y-5">
          <Input label="Название *" value={listForm.title} maxLength={100} onChange={e => setListForm({...listForm, title: e.target.value})} />
          <Textarea label="Описание" className="h-32" value={listForm.description} maxLength={500} onChange={e => setListForm({...listForm, description: e.target.value})} />
          <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl cursor-pointer" onClick={() => setListForm({...listForm, is_public: !listForm.is_public})}>
            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer" checked={listForm.is_public} readOnly />
            <span className="text-sm font-bold text-gray-900">Публичный список</span>
          </div>
          <Button onClick={handleUpdateList} disabled={!listForm.title.trim()}>Сохранить</Button>
        </div>
      </Modal>

      <Modal isOpen={isItemModalOpen} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }} title={editingItem ? "Изменить товар" : "Новый подарок"}>
        <div className="space-y-4">
          <Input
            label="Название *"
            placeholder="Что подарить?"
            value={itemForm.title}
            maxLength={255}
            onChange={e => setItemForm({...itemForm, title: e.target.value})}
          />
          
          <Input 
            label="Ссылка на магазин *" 
            placeholder="https://..." 
            value={itemForm.url} 
            error={!itemForm.url.trim() ? 'Ссылка обязательна' : (!isValidUrl(itemForm.url) ? 'Неверный формат ссылки' : '')}
            onChange={e => setItemForm({...itemForm, url: e.target.value})} 
          />
          
          <Input 
            label="Ссылка на фото (опционально)" 
            placeholder="https://... (прямая ссылка на фото)" 
            value={itemForm.image_url} 
            error={itemForm.image_url && !isValidUrl(itemForm.image_url) ? 'Неверный формат ссылки' : ''}
            onChange={e => setItemForm({...itemForm, image_url: e.target.value})} 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Цена *"
              type="number"
              placeholder="0.00"
              value={itemForm.price}
              onKeyDown={handlePriceKeyDown}
              onChange={handlePriceChange}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 ml-1">Валюта</label>
              <select className="w-full px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-indigo-50 bg-white cursor-pointer" value={itemForm.currency} onChange={e => setItemForm({...itemForm, currency: e.target.value})}>
                <option value="BYN">BYN</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 ml-1">Приоритет</label>
            <select className="w-full px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-indigo-50 bg-white cursor-pointer" value={itemForm.priority} onChange={e => setItemForm({...itemForm, priority: Number(e.target.value)})}>
              <option value="1">1 — Низкий</option><option value="2">2 — Ниже среднего</option><option value="3">3 — Средний</option><option value="4">4 — Высокий</option><option value="5">5 — Максимальный</option>
            </select>
          </div>
          
          <Textarea label="Комментарий (опционально)" placeholder="Цвет, размер и т.д." className="h-24" maxLength={500} value={itemForm.note} onChange={e => setItemForm({...itemForm, note: e.target.value})} />
          
          <Button onClick={handleSaveItem} disabled={!isItemFormValid}>
            {editingItem ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isDelListOpen} onClose={() => setIsDelListOpen(false)} title="Удалить список?">
        <div className="text-center px-2">
          <p className="text-gray-500 mb-8 text-sm">Это действие нельзя отменить. Все подарки в этом списке будут удалены навсегда.</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsDelListOpen(false)}>Отмена</Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteList}>Да, удалить</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDelItemOpen}
        onClose={() => {
          setIsDelItemOpen(false);
          setItemToDelete(null);
        }}
        title="Удалить подарок?"
      >
        <div className="text-center px-2">
          <p className="text-gray-500 mb-8 text-sm">
            Это действие нельзя отменить. Подарок будет удалён из списка навсегда.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setIsDelItemOpen(false);
                setItemToDelete(null);
              }}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!itemToDelete) return;
                await handleDeleteItem(itemToDelete.id);
                setIsDelItemOpen(false);
                setItemToDelete(null);
              }}
            >
              Да, удалить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WishlistDetail;