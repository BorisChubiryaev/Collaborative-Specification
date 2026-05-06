import { useState } from 'react';

interface Props {
  onSelect: (name: string, color: string) => void;
}

const PRESET_USERS = [
  { name: 'Иван Петров (Заказчик)', color: '#3B82F6', role: 'Заказчик' },
  { name: 'Мария Сидорова (Подрядчик)', color: '#EF4444', role: 'Подрядчик' },
  { name: 'Алексей Козлов', color: '#10B981', role: 'Наблюдатель' },
  { name: 'Елена Новикова', color: '#8B5CF6', role: 'Аналитик' },
];

export default function UserSelector({ onSelect }: Props) {
  const [customName, setCustomName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Совместная работа</h1>
          <p className="text-gray-500">Выберите себя или введите имя для входа в сессию</p>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-gray-700">Быстрый выбор:</p>
          {PRESET_USERS.map((user) => (
            <button
              key={user.name}
              onClick={() => onSelect(user.name, user.color)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: user.color }}
              >
                {user.name[0]}
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                <div className="text-xs text-gray-500">{user.role}</div>
              </div>
              <div className="ml-auto">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t pt-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Или введите своё имя:</p>
          <div className="flex gap-2 mb-3">
            {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(c => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && customName.trim() && onSelect(customName.trim(), selectedColor)}
            placeholder="Ваше имя..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-3"
          />
          <button
            onClick={() => customName.trim() && onSelect(customName.trim(), selectedColor)}
            disabled={!customName.trim()}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Войти в сессию
          </button>
        </div>
      </div>
    </div>
  );
}
