import { useState, useCallback, useEffect, useRef } from 'react';
import { useCollaboration } from './hooks/useCollaboration';
import CollabPanel from './components/CollabPanel';
import SpecForm, { STEPS } from './components/SpecForm';
import RoleSelect from './components/RoleSelect';
import ClientDashboard from './components/ClientDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import TemplateManagerModal from './components/TemplateManagerModal';
import * as reqStore from './store/requestStore';
import * as sync from './store/syncStore';
import { FormData, UserRole } from './types';

type AppStage =
  | { type: 'role_select' }
  | { type: 'client_dashboard' }
  | { type: 'manager_dashboard' }
  | { type: 'session'; sessionId: string; requestId: string };

export default function App() {
  const [userName, setUserName] = useState(() => sessionStorage.getItem('collab_user_name') || '');
  const [userColor, setUserColor] = useState(() => sessionStorage.getItem('collab_user_color') || '#3B82F6');
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    const r = sessionStorage.getItem('collab_user_role');
    return r === 'client' || r === 'manager' ? r : null;
  });

  const [stage, setStage] = useState<AppStage>(() => {
    const sessId = sessionStorage.getItem('collab_active_session');
    const reqId = sessionStorage.getItem('collab_active_request');
    const role = sessionStorage.getItem('collab_user_role') as UserRole | null;
    const name = sessionStorage.getItem('collab_user_name');
    if (sessId && reqId && name) return { type: 'session', sessionId: sessId, requestId: reqId };
    if (name && role === 'client') return { type: 'client_dashboard' };
    if (name && role === 'manager') return { type: 'manager_dashboard' };
    return { type: 'role_select' };
  });

  const [panelOpen, setPanelOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const activeSessionId = stage.type === 'session' ? stage.sessionId : null;
  const initialFormAppliedRef = useRef(false);

  const collab = useCollaboration(
    userName || undefined,
    userColor || undefined,
    activeSessionId || undefined
  );

  // ── Handlers ──
  const handleUserReady = useCallback((name: string, color: string, role: UserRole) => {
    sessionStorage.setItem('collab_user_name', name);
    sessionStorage.setItem('collab_user_color', color);
    sessionStorage.setItem('collab_user_role', role);
    setUserName(name);
    setUserColor(color);
    setUserRole(role);
    setStage(role === 'client' ? { type: 'client_dashboard' } : { type: 'manager_dashboard' });
  }, []);

  const handleEnterSession = useCallback((sessionId: string, requestId: string, initialFormData?: FormData) => {
    sessionStorage.setItem('collab_active_session', sessionId);
    sessionStorage.setItem('collab_active_request', requestId);
    initialFormAppliedRef.current = false;
    if (initialFormData) {
      sessionStorage.setItem('collab_initial_form', JSON.stringify(initialFormData));
    } else {
      sessionStorage.removeItem('collab_initial_form');
    }
    setStage({ type: 'session', sessionId, requestId });
  }, []);

  // Apply initial form data once when entering session
  useEffect(() => {
    if (stage.type !== 'session' || initialFormAppliedRef.current) return;
    const raw = sessionStorage.getItem('collab_initial_form');
    if (!raw) return;
    try {
      const formData: FormData = JSON.parse(raw);
      initialFormAppliedRef.current = true;
      sessionStorage.removeItem('collab_initial_form');
      // Small delay to let collab hook initialize
      setTimeout(() => {
        const ch = sync.createChannel();
        sync.setInitialFormData(formData, ch);
        ch?.close();
        collab.updateFormData(prev => {
          const isEmpty =
            !prev.jiraLink && !prev.tribe && prev.clusters.length === 0 && prev.specificationItems.length === 0;
          return isEmpty ? formData : prev;
        });
      }, 300);
    } catch { /* ignore */ }
  }, [stage.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeaveSession = useCallback(() => {
    sessionStorage.removeItem('collab_active_session');
    sessionStorage.removeItem('collab_active_request');
    sessionStorage.removeItem('collab_initial_form');
    setStage(userRole === 'client' ? { type: 'client_dashboard' } : { type: 'manager_dashboard' });
  }, [userRole]);

  const handleLogout = useCallback(() => {
    sessionStorage.clear();
    setUserName('');
    setUserColor('#3B82F6');
    setUserRole(null);
    setStage({ type: 'role_select' });
  }, []);

  const handleStepChange = useCallback(
    (step: number) => {
      setCurrentStep(step);
      collab.updatePresence({ currentStep: step });
    },
    [collab]
  );

  const handleFocusField = useCallback(
    (fieldId: string | null) => {
      collab.updatePresence({
        activeField: fieldId,
        isTyping: fieldId !== null,
        typingField: fieldId,
      });
    },
    [collab]
  );

  const handleFormChange = useCallback(
    (updater: (prev: FormData) => FormData) => {
      collab.updateFormData(updater);
    },
    [collab]
  );

  const otherUsersPresence = collab.otherUsers.map(u => ({
    userId: u.userId,
    userName: u.userName,
    userColor: u.userColor,
    activeField: u.activeField,
  }));

  const effectiveName = userName || collab.userName;
  const effectiveColor = userColor || collab.userColor;

  // ── RENDER: Role select ──
  if (stage.type === 'role_select') {
    return <RoleSelect onReady={handleUserReady} />;
  }

  // ── RENDER: Client dashboard ──
  if (stage.type === 'client_dashboard') {
    return (
      <ClientDashboard
        userName={effectiveName}
        userColor={effectiveColor}
        onEnterSession={handleEnterSession}
      />
    );
  }

  // ── RENDER: Manager dashboard ──
  if (stage.type === 'manager_dashboard') {
    return (
      <ManagerDashboard
        userName={effectiveName}
        userColor={effectiveColor}
        onEnterSession={handleEnterSession}
      />
    );
  }

  // ── RENDER: Session ──
  const requestId = stage.type === 'session' ? stage.requestId : '';
  const request = reqStore.getRequests().find(r => r.id === requestId);

  const roleBadge = userRole === 'client'
    ? { label: 'Заказчик', bg: 'bg-blue-100', text: 'text-blue-700' }
    : { label: 'Менеджер', bg: 'bg-purple-100', text: 'text-purple-700' };

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* ─── TOP BAR ─── */}
      <div
        className="flex-shrink-0 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm z-50"
        style={{ height: 54 }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={handleLeaveSession}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors mr-1 flex-shrink-0"
            title="Вернуться на дашборд"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm truncate max-w-[200px] sm:max-w-xs">
                {request ? request.title : 'Спецификация договора'}
              </span>
              {request && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  request.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                  request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {request.status === 'open' ? 'Открыта' : request.status === 'in_progress' ? 'В работе' : 'Завершена'}
                </span>
              )}
            </div>
            <span className="text-gray-400 text-xs">Совместное заполнение</span>
          </div>

          {collab.otherUsers.filter(u => u.userId !== 'bot_assistant').length > 0 && (
            <div className="hidden sm:flex items-center gap-1 ml-2 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-700 font-medium">
                {collab.otherUsers.filter(u => u.userId !== 'bot_assistant').map(u => u.userName.split(' ')[0]).join(', ')} онлайн
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Avatars */}
          <div className="flex items-center -space-x-1.5">
            {collab.allUsers.slice(0, 4).map(u => (
              <div
                key={u.userId}
                title={`${u.userName} — Шаг ${u.currentStep + 1}: ${STEPS[u.currentStep]}`}
                className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: u.userColor }}
              >
                {u.userId === 'bot_assistant' ? '🤖' : u.userName[0]}
              </div>
            ))}
            {collab.allUsers.length > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                +{collab.allUsers.length - 4}
              </div>
            )}
          </div>

          {/* Flags badge */}
          {collab.activeFlags.length > 0 && (
            <div className="flex items-center gap-1 bg-red-50 text-red-600 rounded-full px-2.5 py-1 text-xs font-medium border border-red-200">
              🚩 {collab.activeFlags.length}
            </div>
          )}

          {/* Templates button — only for client */}
          {userRole === 'client' && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              title="Шаблоны форм"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
              Шаблоны
            </button>
          )}

          {/* Role + user */}
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-full pl-1 pr-2.5 py-0.5 border border-gray-200">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: effectiveColor }}
            >
              {effectiveName[0]}
            </div>
            <span className="text-xs font-medium text-gray-700 max-w-24 truncate hidden sm:block">{effectiveName}</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full hidden sm:block ${roleBadge.bg} ${roleBadge.text}`}>
              {roleBadge.label}
            </span>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              if (window.confirm('Сбросить форму для всех участников?')) collab.resetForm();
            }}
            className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
            title="Сбросить форму"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Сбросить
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-all"
            title="Выйти"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Выйти
          </button>

          {/* Toggle panel */}
          <button
            onClick={() => setPanelOpen(p => !p)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
              panelOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="hidden sm:inline">{panelOpen ? 'Скрыть чат' : 'Чат'}</span>
            {!panelOpen && collab.activeFlags.length > 0 && (
              <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                {collab.activeFlags.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="flex flex-1 min-h-0">
        {/* Form area */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-5xl mx-auto px-4 py-5 pb-10">
            <SpecForm
              formData={collab.formData}
              userId={collab.userId}
              userName={effectiveName}
              userColor={effectiveColor}
              activeFlags={collab.activeFlags}
              currentStep={currentStep}
              onStepChange={handleStepChange}
              onFormChange={handleFormChange}
              onFocusField={handleFocusField}
              onAddFlag={collab.addFlag}
              otherUsersPresence={otherUsersPresence}
            />
          </div>
        </div>

        {/* Collab panel */}
        {panelOpen && (
          <div
            className="flex-shrink-0 border-l border-gray-200 bg-white"
            style={{ width: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <CollabPanel
              userId={collab.userId}
              userName={effectiveName}
              userColor={effectiveColor}
              messages={collab.messages}
              flags={collab.flags}
              otherUsers={collab.otherUsers}
              allUsers={collab.allUsers}
              currentStep={currentStep}
              onSendMessage={collab.sendMessage}
              onAddFlag={collab.addFlag}
              onResolveFlag={collab.resolveFlag}
              steps={STEPS}
            />
          </div>
        )}
      </div>

      {/* Template modal (in session for client) */}
      {userRole === 'client' && (
        <TemplateManagerModal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          currentFormData={collab.formData}
          userName={effectiveName}
          onLoadTemplate={(formData) => {
            collab.updateFormData(() => formData);
            setShowTemplateModal(false);
          }}
        />
      )}
    </div>
  );
}
