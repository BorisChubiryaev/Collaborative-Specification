import { SharedState, FormData, ChatMessage, FieldFlag, UserPresence } from '../types';

const STORAGE_KEY = 'collab_spec_state';
const CHANNEL_NAME = 'collab_spec_channel';

const defaultFormData: FormData = {
  jiraLink: '',
  tribe: '',
  tribeResponsible: '',
  contractor: '',
  contractorResponsible: '',
  nonFunctionalRequirements: '',
  clusters: [],
  contracts: [],
  specificationItems: [],
};

const defaultState: SharedState = {
  formData: defaultFormData,
  messages: [],
  flags: [],
  users: [],
  lastUpdatedBy: '',
  lastUpdatedAt: 0,
};

export function getState(): SharedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    return JSON.parse(raw) as SharedState;
  } catch {
    return { ...defaultState };
  }
}

export function setState(state: SharedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createChannel() {
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

export function broadcastUpdate(channel: BroadcastChannel | null, type: string, payload: any) {
  if (channel) {
    channel.postMessage({ type, payload, ts: Date.now() });
  }
}

export function updateFormData(
  userId: string,
  updater: (prev: FormData) => FormData,
  channel: BroadcastChannel | null
): SharedState {
  const state = getState();
  const newFormData = updater(state.formData);
  const newState: SharedState = {
    ...state,
    formData: newFormData,
    lastUpdatedBy: userId,
    lastUpdatedAt: Date.now(),
  };
  setState(newState);
  broadcastUpdate(channel, 'FORM_UPDATE', newState);
  return newState;
}

export function addMessage(
  msg: Omit<ChatMessage, 'id' | 'timestamp'>,
  channel: BroadcastChannel | null
): SharedState {
  const state = getState();
  const newMsg: ChatMessage = {
    ...msg,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  const newState: SharedState = {
    ...state,
    messages: [...state.messages.slice(-200), newMsg],
  };
  setState(newState);
  broadcastUpdate(channel, 'MESSAGE', newState);
  return newState;
}

export function addFlag(
  flag: Omit<FieldFlag, 'id' | 'timestamp'>,
  channel: BroadcastChannel | null
): SharedState {
  const state = getState();
  const newFlag: FieldFlag = {
    ...flag,
    id: `flag_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  const newState: SharedState = {
    ...state,
    flags: [...state.flags, newFlag],
  };
  setState(newState);
  broadcastUpdate(channel, 'FLAG', newState);
  return newState;
}

export function resolveFlag(
  flagId: string,
  channel: BroadcastChannel | null
): SharedState {
  const state = getState();
  const newState: SharedState = {
    ...state,
    flags: state.flags.map(f => f.id === flagId ? { ...f, resolved: true } : f),
  };
  setState(newState);
  broadcastUpdate(channel, 'FLAG_RESOLVE', newState);
  return newState;
}

export function updatePresence(
  presence: UserPresence,
  channel: BroadcastChannel | null
): SharedState {
  const state = getState();
  const others = state.users.filter(u => u.userId !== presence.userId);
  const newState: SharedState = {
    ...state,
    users: [...others, presence],
  };
  setState(newState);
  broadcastUpdate(channel, 'PRESENCE', newState);
  return newState;
}

export function removeUser(userId: string, channel: BroadcastChannel | null): SharedState {
  const state = getState();
  const newState: SharedState = {
    ...state,
    users: state.users.filter(u => u.userId !== userId),
  };
  setState(newState);
  broadcastUpdate(channel, 'PRESENCE', newState);
  return newState;
}

export function resetState(channel: BroadcastChannel | null): SharedState {
  const newState: SharedState = { ...defaultState, users: getState().users };
  setState(newState);
  broadcastUpdate(channel, 'RESET', newState);
  return newState;
}

export function setInitialFormData(formData: FormData, channel: BroadcastChannel | null): SharedState {
  const state = getState();
  // Only apply if current form is empty (to avoid overwriting existing work)
  const isEmpty =
    !state.formData.jiraLink &&
    !state.formData.tribe &&
    state.formData.clusters.length === 0 &&
    state.formData.specificationItems.length === 0;
  if (!isEmpty) return state;
  const newState: SharedState = {
    ...state,
    formData,
    lastUpdatedAt: Date.now(),
  };
  setState(newState);
  broadcastUpdate(channel, 'FORM_UPDATE', newState);
  return newState;
}
