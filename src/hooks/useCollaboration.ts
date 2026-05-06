import { useState, useEffect, useRef, useCallback } from 'react';
import { SharedState, FormData, UserPresence } from '../types';
import * as sync from '../store/syncStore';
import { BOT_USER_ID, BOT_NAME, BOT_COLOR, botDelay, processUserMessage } from '../utils/botAgent';

function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Bot presence — always in allUsers
const BOT_PRESENCE: UserPresence = {
  userId: BOT_USER_ID,
  userName: BOT_NAME,
  userColor: BOT_COLOR,
  currentStep: 0,
  activeField: null,
  lastSeen: Date.now() + 999999999,
  isTyping: false,
  typingField: null,
};

export function useCollaboration(overrideName?: string, overrideColor?: string, _sessionId?: string) {
  const [userId] = useState(() => {
    const saved = sessionStorage.getItem('collab_user_id');
    if (saved) return saved;
    const id = generateUserId();
    sessionStorage.setItem('collab_user_id', id);
    return id;
  });

  const getUserName = () =>
    overrideName || sessionStorage.getItem('collab_user_name') || 'Пользователь';
  const getUserColor = () =>
    overrideColor || sessionStorage.getItem('collab_user_color') || '#3B82F6';

  const [sharedState, setSharedState] = useState<SharedState>(() => sync.getState());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTypingRef = useRef(false);

  const presenceRef = useRef<UserPresence>({
    userId,
    userName: getUserName(),
    userColor: getUserColor(),
    currentStep: 0,
    activeField: null,
    lastSeen: Date.now(),
    isTyping: false,
    typingField: null,
  });

  const isLocalUpdateRef = useRef(false);

  // Register bot in presence on first load (once, globally)
  useEffect(() => {
    const state = sync.getState();
    const botExists = state.users.some(u => u.userId === BOT_USER_ID);
    if (!botExists) {
      sync.updatePresence(BOT_PRESENCE, null);
    }
  }, []);

  useEffect(() => {
    presenceRef.current = {
      ...presenceRef.current,
      userName: getUserName(),
      userColor: getUserColor(),
    };

    channelRef.current = sync.createChannel();

    if (channelRef.current) {
      channelRef.current.onmessage = () => {
        if (!isLocalUpdateRef.current) {
          setSharedState({ ...sync.getState() });
        }
      };
    }

    const newState = sync.updatePresence(presenceRef.current, channelRef.current);
    setSharedState({ ...newState });

    sync.addMessage(
      {
        userId: 'system',
        userName: 'Система',
        userColor: '#6B7280',
        text: `${presenceRef.current.userName} подключился к сессии`,
        type: 'system',
      },
      channelRef.current
    );
    setSharedState({ ...sync.getState() });

    presenceTimerRef.current = setInterval(() => {
      presenceRef.current = { ...presenceRef.current, lastSeen: Date.now() };
      sync.updatePresence(presenceRef.current, channelRef.current);
      // Keep bot presence alive too
      sync.updatePresence({ ...BOT_PRESENCE, lastSeen: Date.now() + 999999999 }, null);
      setSharedState(prev => {
        const state = sync.getState();
        if (JSON.stringify(prev.users) !== JSON.stringify(state.users)) {
          return { ...state };
        }
        return prev;
      });
    }, 10000);

    return () => {
      if (presenceTimerRef.current) clearInterval(presenceTimerRef.current);
      sync.removeUser(userId, channelRef.current);
      sync.addMessage(
        {
          userId: 'system',
          userName: 'Система',
          userColor: '#6B7280',
          text: `${presenceRef.current.userName} покинул сессию`,
          type: 'system',
        },
        channelRef.current
      );
      if (channelRef.current) channelRef.current.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFormData = useCallback(
    (updater: (prev: FormData) => FormData) => {
      isLocalUpdateRef.current = true;
      const newState = sync.updateFormData(userId, updater, channelRef.current);
      setSharedState({ ...newState });
      setTimeout(() => {
        isLocalUpdateRef.current = false;
      }, 150);
    },
    [userId]
  );

  // Send bot typing indicator
  const setBotTyping = useCallback((typing: boolean) => {
    botTypingRef.current = typing;
    sync.updatePresence(
      { ...BOT_PRESENCE, isTyping: typing, lastSeen: Date.now() + 999999999 },
      channelRef.current
    );
    setSharedState({ ...sync.getState() });
  }, []);

  // Dispatch bot response
  const dispatchBotResponse = useCallback(
    async (userText: string, stepRef: number) => {
      // Get fresh form data and flags from store
      const state = sync.getState();
      const ctx = {
        formData: state.formData,
        flags: state.flags,
        messages: state.messages,
        currentStep: stepRef,
        steps: [
          'Jira ссылка',
          'Трайб и кластеры',
          'Ответственные и требования',
          'Договор',
          'Предметы спецификации',
          'Этапы',
          'Функциональные требования',
          'Сотрудники',
        ],
      };

      const response = processUserMessage(userText, ctx);
      if (!response) return;

      // Show bot "typing"
      setBotTyping(true);
      await botDelay(800, 2000);
      setBotTyping(false);

      sync.addMessage(
        {
          userId: BOT_USER_ID,
          userName: BOT_NAME,
          userColor: BOT_COLOR,
          text: response,
          stepRef,
          type: 'message',
        },
        channelRef.current
      );
      setSharedState({ ...sync.getState() });
    },
    [setBotTyping]
  );

  const sendMessage = useCallback(
    (text: string, fieldRef?: string, stepRef?: number) => {
      const name = getUserName();
      const color = getUserColor();
      const resolvedStep = stepRef ?? 0;
      const newState = sync.addMessage(
        { userId, userName: name, userColor: color, text, fieldRef, stepRef: resolvedStep, type: 'message' },
        channelRef.current
      );
      setSharedState({ ...newState });

      // Check if bot was mentioned — respond async
      if (/@bot\b/i.test(text)) {
        dispatchBotResponse(text, resolvedStep);
      }
    },
    [userId, dispatchBotResponse] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const addFlag = useCallback(
    (fieldId: string, stepIndex: number, type: 'error' | 'warning' | 'info', comment: string) => {
      const name = getUserName();
      const color = getUserColor();
      const newState = sync.addFlag(
        { userId, userName: name, userColor: color, fieldId, stepIndex, type, comment, resolved: false },
        channelRef.current
      );
      setSharedState({ ...newState });

      sync.addMessage(
        {
          userId,
          userName: name,
          userColor: color,
          text: `🚩 Флаг "${fieldId}": ${comment}`,
          fieldRef: fieldId,
          stepRef: stepIndex,
          type: 'flag',
          flagType: type,
        },
        channelRef.current
      );
      setSharedState({ ...sync.getState() });
    },
    [userId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const resolveFlag = useCallback((flagId: string) => {
    const newState = sync.resolveFlag(flagId, channelRef.current);
    setSharedState({ ...newState });
  }, []);

  const updatePresence = useCallback((partial: Partial<UserPresence>) => {
    presenceRef.current = { ...presenceRef.current, ...partial, lastSeen: Date.now() };
    sync.updatePresence(presenceRef.current, channelRef.current);
  }, []);

  const resetForm = useCallback(() => {
    const name = getUserName();
    const color = getUserColor();
    const newState = sync.resetState(channelRef.current);
    setSharedState({ ...newState });
    sync.addMessage(
      { userId, userName: name, userColor: color, text: `${name} сбросил форму`, type: 'system' },
      channelRef.current
    );
    setSharedState({ ...sync.getState() });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const otherUsers = sharedState.users.filter(
    u => u.userId !== userId && Date.now() - u.lastSeen < 25000
  );

  const activeFlags = sharedState.flags.filter(f => !f.resolved);

  const currentUserName = getUserName();
  const currentUserColor = getUserColor();

  // Always include bot in allUsers
  const allUsersRaw = sharedState.users.filter(u => Date.now() - u.lastSeen < 25000);
  const hasBotInList = allUsersRaw.some(u => u.userId === BOT_USER_ID);
  const allUsers = hasBotInList ? allUsersRaw : [BOT_PRESENCE, ...allUsersRaw];

  return {
    userId,
    userName: currentUserName,
    userColor: currentUserColor,
    sharedState,
    formData: sharedState.formData,
    messages: sharedState.messages,
    flags: sharedState.flags,
    activeFlags,
    otherUsers,
    allUsers,
    updateFormData,
    sendMessage,
    addFlag,
    resolveFlag,
    updatePresence,
    resetForm,
  };
}
