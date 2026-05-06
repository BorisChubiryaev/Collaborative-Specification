import { useState } from 'react';
import { UserRole } from '../types';

interface Props {
  onReady: (name: string, color: string, role: UserRole) => void;
}

const CLIENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#06B6D4'];
const MANAGER_COLORS = ['#8B5CF6', '#EC4899', '#EF4444', '#64748B'];

const CLIENT_PRESETS = [
  { name: 'Иван Петров', color: '#3B82F6' },
  { name: 'Елена Соколова', color: '#10B981' },
  { name: 'Дмитрий Орлов', color: '#F59E0B' },
];

const MANAGER_PRESETS = [
  { name: 'Мария Сидорова', color: '#8B5CF6' },
  { name: 'Алексей Козлов', color: '#EC4899' },
  { name: 'Ольга Смирнова', color: '#EF4444' },
];

export default function RoleSelect({ onReady }: Props) {
  const [step, setStep] = useState<'role' | 'profile'>('role');
  const [role, setRole] = useState<UserRole>('client');
  const [customName, setCustomName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const colors = role === 'client' ? CLIENT_COLORS : MANAGER_COLORS;
  const presets = role === 'client' ? CLIENT_PRESETS : MANAGER_PRESETS;

  const handleRoleSelect = (r: UserRole) => {
    setRole(r);
    setSelectedColor(r === 'client' ? CLIENT_COLORS[0] : MANAGER_COLORS[0]);
    setStep('profile');
  };

  const handleSubmit = (name: string, color: string) => {
    onReady(name, color, role);
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-5 backdrop-blur-sm border border-white/20 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Спецификация договора</h1>
            <p className="text-blue-200 text-lg">Система совместной разработки</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Заказчик */}
            <button
              onClick={() => handleRoleSelect('client')}
              className="group bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:border-blue-400 hover:bg-blue-500/20 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-2 bg-blue-500/30 text-blue-200 rounded-full px-3 py-1 text-xs font-semibold mb-3 border border-blue-400/30">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                Роль: Заказчик
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Я — Заказчик</h2>
              <p className="text-blue-200 text-sm leading-relaxed mb-5">
                Создаю заявку на разработку спецификации и совместно заполняю форму с менеджером
              </p>
              <div className="space-y-2">
                {['Создаю и описываю заявку', 'Заполняю форму спецификации', 'Общаюсь с менеджером в чате'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-blue-100 text-sm">
                    <div className="w-4 h-4 rounded-full bg-blue-500/40 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 text-blue-300 text-sm font-medium group-hover:text-white transition-colors">
                Выбрать роль
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Менеджер */}
            <button
              onClick={() => handleRoleSelect('manager')}
              className="group bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:border-purple-400 hover:bg-purple-500/20 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-2 bg-purple-500/30 text-purple-200 rounded-full px-3 py-1 text-xs font-semibold mb-3 border border-purple-400/30">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                Роль: Менеджер
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Я — Менеджер</h2>
              <p className="text-purple-200 text-sm leading-relaxed mb-5">
                Получаю уведомления о новых заявках, подключаюсь и веду совместную работу с заказчиком
              </p>
              <div className="space-y-2">
                {['Вижу входящие заявки в реальном времени', 'Подключаюсь к сессии заказчика', 'Курирую заполнение спецификации'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-purple-100 text-sm">
                    <div className="w-4 h-4 rounded-full bg-purple-500/40 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 text-purple-300 text-sm font-medium group-hover:text-white transition-colors">
                Выбрать роль
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold mb-1">Для демонстрации</p>
                <p className="text-blue-200 text-xs leading-relaxed">
                  Откройте два окна браузера — в одном войдите как Заказчик, в другом как Менеджер.
                  Создайте заявку как Заказчик — Менеджер увидит уведомление и сможет подключиться.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profile step
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <button
          onClick={() => setStep('role')}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к выбору роли
        </button>

        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: role === 'client' ? '#3B82F6' : '#8B5CF6' }}
          >
            {role === 'client' ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            )}
          </div>
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-2"
            style={{ backgroundColor: role === 'client' ? '#3B82F6' : '#8B5CF6' }}
          >
            {role === 'client' ? 'Заказчик' : 'Менеджер'}
          </div>
          <h2 className="text-xl font-bold text-gray-900">Выберите профиль</h2>
        </div>

        <div className="space-y-2.5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Быстрый выбор</p>
          {presets.map(p => (
            <button
              key={p.name}
              onClick={() => handleSubmit(p.name, p.color)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm" style={{ backgroundColor: p.color }}>
                {p.name[0]}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-800 text-sm">{p.name}</div>
                <div className="text-xs text-gray-400">{role === 'client' ? 'Заказчик' : 'Менеджер'}</div>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Или введите своё имя</p>
          <div className="flex gap-2 mb-3">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && customName.trim() && handleSubmit(customName.trim(), selectedColor || colors[0])}
            placeholder="Введите ваше имя..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-3"
          />
          <button
            onClick={() => customName.trim() && handleSubmit(customName.trim(), selectedColor || colors[0])}
            disabled={!customName.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: customName.trim() ? (selectedColor || colors[0]) : '#D1D5DB' }}
          >
            Войти как {role === 'client' ? 'Заказчик' : 'Менеджер'}
          </button>
        </div>
      </div>
    </div>
  );
}
