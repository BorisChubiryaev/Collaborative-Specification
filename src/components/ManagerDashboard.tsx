import { useState, useEffect, useRef } from 'react';
import * as reqStore from '../store/requestStore';
import { SpecRequest } from '../types';

interface Props {
  userName: string;
  userColor: string;
  onEnterSession: (sessionId: string, requestId: string) => void;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff} сек. назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

interface Toast {
  id: string;
  req: SpecRequest;
}

export default function ManagerDashboard({ userName, userColor, onEnterSession }: Props) {
  const [requests, setRequests] = useState<SpecRequest[]>(() => reqStore.getRequests());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress'>('all');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const seenIds = useRef<Set<string>>(new Set(reqStore.getRequests().map(r => r.id)));

  useEffect(() => {
    const ch = reqStore.createChannel();
    channelRef.current = ch;

    if (ch) {
      ch.onmessage = (e) => {
        if (e.data?.type === 'NEW_REQUEST') {
          const req: SpecRequest = e.data.req;
          if (!seenIds.current.has(req.id)) {
            seenIds.current.add(req.id);
            setRequests(reqStore.getRequests());
            // Show toast notification
            const toastId = `toast_${Date.now()}`;
            setToasts(prev => [...prev, { id: toastId, req }]);
            // Auto-remove toast after 8s
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toastId));
            }, 8000);
          }
        }
      };
    }

    // Poll for updates every 3s (fallback for same-origin cross-tab)
    const poll = setInterval(() => {
      const fresh = reqStore.getRequests();
      const newOnes = fresh.filter(r => !seenIds.current.has(r.id));
      newOnes.forEach(req => {
        seenIds.current.add(req.id);
        const toastId = `toast_${Date.now()}_${req.id}`;
        setToasts(prev => [...prev, { id: toastId, req }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 8000);
      });
      if (fresh.length !== requests.length || newOnes.length > 0) {
        setRequests([...fresh]);
      }
    }, 2000);

    return () => {
      clearInterval(poll);
      ch?.close();
    };
  }, []); // eslint-disable-line

  const handleAccept = (req: SpecRequest) => {
    reqStore.updateRequest(req.id, { status: 'in_progress', managerId: userName, managerName: userName });
    const ch = reqStore.createChannel();
    reqStore.broadcast(ch, { type: 'REQUEST_UPDATED', id: req.id });
    ch?.close();
    setRequests(reqStore.getRequests());
    onEnterSession(req.sessionId, req.id);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const filtered = requests.filter(r => {
    if (filter === 'open') return r.status === 'open';
    if (filter === 'in_progress') return r.status === 'in_progress';
    return true;
  });

  const openCount = requests.filter(r => r.status === 'open').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-purple-200 p-4 w-80 animate-slide-in"
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-base font-bold shadow-sm"
                style={{ backgroundColor: toast.req.createdByColor }}>
                {toast.req.createdBy[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Новая заявка!</span>
                </div>
                <div className="font-semibold text-gray-900 text-sm truncate">{toast.req.title}</div>
                <div className="text-xs text-gray-500">от {toast.req.createdBy}</div>
                {toast.req.description && (
                  <div className="text-xs text-gray-400 mt-1 truncate">{toast.req.description}</div>
                )}
              </div>
              <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { removeToast(toast.id); handleAccept(toast.req); }}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Принять и подключиться
              </button>
              <button
                onClick={() => removeToast(toast.id)}
                className="px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">Спецификация договора</span>
            <div className="text-xs text-gray-500">Кабинет менеджера</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {openCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-600 rounded-full px-3 py-1 text-xs font-semibold border border-red-200">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              {openCount} новых заявок
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ backgroundColor: userColor }}>
              {userName[0]}
            </div>
            <span className="text-sm font-medium text-gray-700">{userName}</span>
            <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">Менеджер</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
            <div className="text-sm text-gray-500">Всего заявок</div>
          </div>
          <div className="bg-white rounded-2xl border border-yellow-100 p-5 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{openCount}</div>
            <div className="text-sm text-gray-500">Ожидают</div>
            {openCount > 0 && <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mt-1"></div>}
          </div>
          <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <div className="text-sm text-gray-500">В работе</div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-xl">Входящие заявки</h2>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['all', 'open', 'in_progress'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'Все' : f === 'open' ? 'Ожидают' : 'В работе'}
              </button>
            ))}
          </div>
        </div>

        {/* Requests list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Заявок нет</h3>
            <p className="text-gray-400 text-sm">
              {filter === 'all'
                ? 'Когда заказчик создаст заявку — вы увидите уведомление'
                : 'Нет заявок с выбранным статусом'}
            </p>
            {filter === 'all' && (
              <div className="mt-5 inline-flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded-xl px-4 py-2 border border-purple-100">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                Ожидаю новых заявок в реальном времени...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.slice().reverse().map(req => (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border-2 p-6 shadow-sm transition-all hover:shadow-md ${
                  req.status === 'open'
                    ? 'border-yellow-200 hover:border-yellow-300'
                    : req.status === 'in_progress'
                    ? 'border-blue-200 hover:border-blue-300'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0"
                      style={{ backgroundColor: req.createdByColor }}
                    >
                      {req.createdBy[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-900 text-base">{req.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          req.status === 'open'
                            ? 'bg-yellow-100 text-yellow-700'
                            : req.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {req.status === 'open' ? '● Ожидает' : req.status === 'in_progress' ? '● В работе' : '✓ Завершена'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-1">
                        <span className="font-medium" style={{ color: req.createdByColor }}>{req.createdBy}</span>
                        {' · '}{timeAgo(req.createdAt)}
                      </div>
                      {req.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{req.description}</p>
                      )}
                      {req.managerName && req.status === 'in_progress' && (
                        <div className="mt-2 text-xs text-blue-600 font-medium">
                          👤 Взял в работу: {req.managerName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {req.status === 'open' ? (
                      <button
                        onClick={() => handleAccept(req)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Подключиться
                      </button>
                    ) : req.status === 'in_progress' ? (
                      <button
                        onClick={() => onEnterSession(req.sessionId, req.id)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Войти в сессию
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
