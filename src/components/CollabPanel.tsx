import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, FieldFlag, UserPresence } from '../types';
import { BOT_USER_ID, BOT_NAME } from '../utils/botAgent';

interface Props {
  userId: string;
  userName?: string;
  userColor: string;
  messages: ChatMessage[];
  flags: FieldFlag[];
  otherUsers: UserPresence[];
  allUsers: UserPresence[];
  currentStep: number;
  onSendMessage: (text: string, fieldRef?: string, stepRef?: number) => void;
  onAddFlag: (fieldId: string, stepIndex: number, type: 'error' | 'warning' | 'info', comment: string) => void;
  onResolveFlag: (flagId: string) => void;
  steps: string[];
}

const FLAG_COLORS = {
  error:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: '🔴' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '🟡' },
  info:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: '🔵' },
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Render bot message text with basic markdown: **bold**, `code`, bullet lists
function BotMessageText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // Parse inline bold and code
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={j} className="bg-purple-100 text-purple-800 rounded px-1 py-0.5 text-xs font-mono">
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{part}</span>;
        });
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <div key={i} className="leading-snug">{rendered}</div>;
      })}
    </div>
  );
}

function BotAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}
      style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
    >
      <svg className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="white">
        <path d="M12 2a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2m0 5c2.67 0 8 1.34 8 4v1H4v-1c0-2.66 5.33-4 8-4m-4 7h8l1 5H7l1-5z"/>
      </svg>
    </div>
  );
}

export default function CollabPanel({
  userId, userColor, messages, flags, otherUsers, allUsers,
  currentStep, onSendMessage, onAddFlag, onResolveFlag, steps
}: Props) {
  const [activeTab, setActiveTab] = useState<'chat' | 'flags' | 'users'>('chat');
  const [message, setMessage] = useState('');
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagType, setFlagType] = useState<'error' | 'warning' | 'info'>('warning');
  const [flagComment, setFlagComment] = useState('');
  const [flagField, setFlagField] = useState('');
  const [flagStep, setFlagStep] = useState(currentStep);
  const [showBotHint, setShowBotHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    onSendMessage(message.trim(), undefined, currentStep);
    setMessage('');
    setShowBotHint(false);
    textareaRef.current?.focus();
  }, [message, onSendMessage, currentStep]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    // Show bot hint if user types @
    setShowBotHint(val.includes('@'));
  }, []);

  const handleAddFlag = useCallback(() => {
    if (!flagComment.trim()) return;
    onAddFlag(flagField || `Шаг ${flagStep + 1}`, flagStep, flagType, flagComment.trim());
    setFlagComment('');
    setFlagField('');
    setShowFlagForm(false);
  }, [flagComment, flagField, flagStep, flagType, onAddFlag]);

  const insertBotMention = useCallback((cmd: string) => {
    const newMsg = `@bot ${cmd}`;
    setMessage(newMsg);
    setShowBotHint(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const activeFlags = flags.filter(f => !f.resolved);
  const resolvedFlags = flags.filter(f => f.resolved);
  const isBotTyping = otherUsers.some(u => u.userId === BOT_USER_ID && u.isTyping);
  const realOtherUsers = otherUsers.filter(u => u.userId !== BOT_USER_ID);

  const BOT_COMMANDS = [
    { cmd: 'проверь', desc: 'Проверка формы' },
    { cmd: 'статус', desc: 'Прогресс заполнения' },
    { cmd: 'подскажи', desc: 'Подсказка по шагу' },
    { cmd: 'ошибки', desc: 'Найти ошибки' },
    { cmd: 'флаги', desc: 'Обзор флагов' },
    { cmd: 'помощь', desc: 'Все команды' },
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-semibold text-sm">Совместная работа</span>
          </div>
          <div className="flex items-center -space-x-1">
            {allUsers.slice(0, 5).map(u => (
              u.userId === BOT_USER_ID ? (
                <div key={u.userId} title={BOT_NAME}
                  className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2m0 5c2.67 0 8 1.34 8 4v1H4v-1c0-2.66 5.33-4 8-4m-4 7h8l1 5H7l1-5z"/>
                  </svg>
                </div>
              ) : (
                <div key={u.userId} title={u.userName}
                  className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: u.userColor }}
                >{u.userName[0]}</div>
              )
            ))}
          </div>
        </div>

        {/* Bot typing indicator in header */}
        {isBotTyping && (
          <div className="flex items-center gap-2 text-xs text-blue-100 mb-1">
            <BotAvatar size="sm" />
            <span className="font-medium">{BOT_NAME}</span>
            <span className="italic text-blue-200 animate-pulse">думает...</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 bg-purple-300 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}

        {realOtherUsers.length > 0 && (
          <div className="space-y-0.5">
            {realOtherUsers.map(u => (
              <div key={u.userId} className="flex items-center gap-2 text-xs text-blue-100">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                <span className="font-medium">{u.userName.split(' ')[0]}</span>
                {u.isTyping && <span className="italic text-blue-200 animate-pulse">печатает...</span>}
                <span className="text-blue-300 truncate">· Шаг {u.currentStep + 1}: {steps[u.currentStep]}</span>
              </div>
            ))}
          </div>
        )}
        {realOtherUsers.length === 0 && !isBotTyping && (
          <div className="text-xs text-blue-200">Откройте в другой вкладке для совместной работы</div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 flex border-b border-gray-100">
        {([
          { key: 'chat',  label: 'Чат',      count: messages.filter(m => m.type === 'message').length },
          { key: 'flags', label: 'Флаги',     count: activeFlags.length },
          { key: 'users', label: 'Участники', count: allUsers.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold ${
                tab.key === 'flags' && activeFlags.length > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Chat Tab ── */}
      {activeTab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {/* Welcome bot hint */}
            {messages.filter(m => m.type === 'message').length === 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <BotAvatar />
                  <span className="text-sm font-semibold text-purple-800">{BOT_NAME}</span>
                  <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2 py-0.5">AI</span>
                </div>
                <p className="text-xs text-purple-700 mb-2">
                  Привет! Я помогаю проверять форму и отвечаю на вопросы. Напишите мне через <code className="bg-purple-100 rounded px-1">@bot</code>
                </p>
                <div className="flex flex-wrap gap-1">
                  {BOT_COMMANDS.slice(0, 4).map(c => (
                    <button
                      key={c.cmd}
                      onClick={() => insertBotMention(c.cmd)}
                      className="text-xs bg-white border border-purple-200 text-purple-700 rounded-lg px-2 py-1 hover:bg-purple-50 transition-colors"
                    >
                      @bot {c.cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={
                msg.type === 'system' ? 'text-center' :
                msg.userId === userId ? 'flex justify-end' : 'flex justify-start'
              }>
                {msg.type === 'system' ? (
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">{msg.text}</span>
                ) : msg.type === 'flag' ? (
                  <div className={`max-w-[88%] rounded-xl p-2.5 text-xs border ${
                    msg.flagType === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                    msg.flagType === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                    'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    <div className="font-semibold mb-0.5">{msg.userName}</div>
                    <div>{msg.text}</div>
                    <div className="text-gray-400 mt-1">{formatTime(msg.timestamp)}</div>
                  </div>
                ) : msg.userId === BOT_USER_ID ? (
                  // Bot message bubble
                  <div className="max-w-[92%] flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BotAvatar size="sm" />
                      <span className="text-xs text-gray-500 font-medium">{BOT_NAME}</span>
                      <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5">AI</span>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm text-gray-800 w-full">
                      {msg.stepRef !== undefined && (
                        <div className="text-xs text-purple-500 mb-1.5 font-medium">
                          📍 {steps[msg.stepRef]}
                        </div>
                      )}
                      <BotMessageText text={msg.text} />
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                ) : (
                  // Regular user message
                  <div className={`max-w-[88%] flex flex-col ${msg.userId === userId ? 'items-end' : 'items-start'}`}>
                    {msg.userId !== userId && (
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: msg.userColor }}>
                          {msg.userName[0]}
                        </div>
                        <span className="text-xs text-gray-500">{msg.userName}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        msg.userId === userId ? 'text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                      style={msg.userId === userId ? { backgroundColor: userColor } : {}}
                    >
                      {msg.stepRef !== undefined && (
                        <div className="text-xs opacity-70 mb-1">📍 Шаг {(msg.stepRef || 0) + 1}: {steps[msg.stepRef || 0]}</div>
                      )}
                      {/* Highlight @bot mentions */}
                      {msg.text.split(/(@bot\b)/gi).map((part, i) =>
                        /^@bot$/i.test(part)
                          ? <span key={i} className="font-semibold text-purple-300">@bot</span>
                          : <span key={i}>{part}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
              </div>
            ))}

            {/* Bot typing animation in chat */}
            {isBotTyping && (
              <div className="flex justify-start">
                <div className="max-w-[88%] flex flex-col items-start">
                  <div className="flex items-center gap-1.5 mb-1">
                    <BotAvatar size="sm" />
                    <span className="text-xs text-gray-500 font-medium">{BOT_NAME}</span>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bot command hints dropdown */}
          {showBotHint && (
            <div className="flex-shrink-0 border-t border-purple-100 bg-purple-50 px-3 py-2">
              <div className="text-xs text-purple-600 font-medium mb-1.5 flex items-center gap-1">
                <BotAvatar size="sm" />
                Команды бота:
              </div>
              <div className="flex flex-wrap gap-1">
                {BOT_COMMANDS.map(c => (
                  <button
                    key={c.cmd}
                    onMouseDown={e => { e.preventDefault(); insertBotMention(c.cmd); }}
                    className="text-xs bg-white border border-purple-200 text-purple-700 rounded-lg px-2 py-1 hover:bg-purple-100 transition-colors"
                    title={c.desc}
                  >
                    {c.cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex-shrink-0 p-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              📍 <span className="font-medium text-blue-600">{steps[currentStep]}</span>
              <span className="ml-auto text-purple-400 text-xs">Напишите <code className="bg-purple-50 rounded px-1">@bot</code> для AI</span>
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextChange}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  if (e.key === 'Escape') setShowBotHint(false);
                }}
                placeholder="Сообщение... или @bot проверь"
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 min-h-[44px] max-h-24"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Flags Tab ── */}
      {activeTab === 'flags' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3">
            <button
              onClick={() => setShowFlagForm(v => !v)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 py-2.5 text-sm font-medium hover:bg-orange-100 transition-colors mb-3"
            >
              🚩 {showFlagForm ? 'Скрыть форму' : 'Добавить флаг'}
            </button>

            {showFlagForm && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-200 space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Тип флага</label>
                  <div className="flex gap-1">
                    {(['error', 'warning', 'info'] as const).map(t => (
                      <button key={t}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setFlagType(t)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          flagType === t
                            ? `${FLAG_COLORS[t].bg} ${FLAG_COLORS[t].text} ${FLAG_COLORS[t].border}`
                            : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >
                        {FLAG_COLORS[t].icon} {t === 'error' ? 'Ошибка' : t === 'warning' ? 'Внимание' : 'Инфо'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Шаг</label>
                  <select value={flagStep} onChange={e => setFlagStep(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-blue-400 bg-white"
                  >
                    {steps.map((s, i) => <option key={i} value={i}>Шаг {i + 1}: {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Поле (опционально)</label>
                  <input type="text" value={flagField} onChange={e => setFlagField(e.target.value)}
                    placeholder="Название поля..."
                    className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Комментарий *</label>
                  <textarea value={flagComment} onChange={e => setFlagComment(e.target.value)}
                    placeholder="Опишите проблему..."
                    className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddFlag} disabled={!flagComment.trim()}
                    className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >Добавить</button>
                  <button onClick={() => { setShowFlagForm(false); setFlagComment(''); }}
                    className="flex-1 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 transition-colors"
                  >Отмена</button>
                </div>
              </div>
            )}

            {activeFlags.length === 0 && resolvedFlags.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                <div className="text-3xl mb-2">🏳️</div>
                Нет активных флагов
              </div>
            )}

            {activeFlags.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Активные ({activeFlags.length})</p>
                {activeFlags.map(flag => (
                  <div key={flag.id} className={`rounded-xl p-3 border ${FLAG_COLORS[flag.type].bg} ${FLAG_COLORS[flag.type].border}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold ${FLAG_COLORS[flag.type].text} mb-1`}>
                          {FLAG_COLORS[flag.type].icon} {flag.userName} · Шаг {flag.stepIndex + 1}
                          {flag.fieldId && <span className="opacity-70 font-normal"> · {flag.fieldId}</span>}
                        </div>
                        <div className={`text-xs ${FLAG_COLORS[flag.type].text}`}>{flag.comment}</div>
                        <div className="text-xs text-gray-400 mt-1">{formatTime(flag.timestamp)}</div>
                      </div>
                      <button
                        onClick={() => onResolveFlag(flag.id)}
                        title="Отметить как решённое"
                        className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resolvedFlags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Решённые ({resolvedFlags.length})</p>
                {resolvedFlags.slice(-5).map(flag => (
                  <div key={flag.id} className="rounded-xl p-2.5 border border-gray-100 bg-gray-50 opacity-60">
                    <div className="text-xs text-gray-500 line-through">{flag.comment}</div>
                    <div className="text-xs text-gray-400 mt-0.5">✅ Решено · {formatTime(flag.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
          {allUsers.map(u => (
            <div key={u.userId} className={`flex items-center gap-3 p-3 rounded-xl ${
              u.userId === userId ? 'bg-blue-50 border border-blue-200' :
              u.userId === BOT_USER_ID ? 'bg-purple-50 border border-purple-100' :
              'bg-gray-50'
            }`}>
              {u.userId === BOT_USER_ID ? (
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2m0 5c2.67 0 8 1.34 8 4v1H4v-1c0-2.66 5.33-4 8-4m-4 7h8l1 5H7l1-5z"/>
                  </svg>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: u.userColor }}>
                  {u.userName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900 text-sm truncate">{u.userName}</span>
                  {u.userId === userId && <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 flex-shrink-0">Вы</span>}
                  {u.userId === BOT_USER_ID && <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5 flex-shrink-0">AI</span>}
                </div>
                {u.userId === BOT_USER_ID ? (
                  <div className="text-xs text-purple-500">Проверяет форму · отвечает на @bot</div>
                ) : (
                  <div className="text-xs text-gray-500 truncate">📍 Шаг {u.currentStep + 1}: {steps[u.currentStep]}</div>
                )}
                {u.isTyping && u.userId !== BOT_USER_ID && <div className="text-xs text-green-600 animate-pulse">✍️ Печатает...</div>}
                {u.isTyping && u.userId === BOT_USER_ID && <div className="text-xs text-purple-500 animate-pulse">🤔 Думает...</div>}
              </div>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.userId === BOT_USER_ID ? 'bg-purple-400' : 'bg-green-400'}`}></div>
            </div>
          ))}

          {/* Bot info card */}
          <div className="mt-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <BotAvatar size="sm" />
              <p className="text-xs font-semibold text-purple-700">AI Ассистент</p>
            </div>
            <p className="text-xs text-purple-600 mb-2">Напишите <code className="bg-purple-100 rounded px-1">@bot</code> в чате:</p>
            <div className="flex flex-wrap gap-1">
              {BOT_COMMANDS.map(c => (
                <span key={c.cmd} className="text-xs bg-white border border-purple-200 text-purple-600 rounded px-1.5 py-0.5">
                  {c.cmd}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">💡 Совместная работа</p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Откройте в <strong>другой вкладке</strong> браузера</li>
              <li>• Изменения синхронизируются в реальном времени</li>
              <li>• Чат и флаги видны всем участникам</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
