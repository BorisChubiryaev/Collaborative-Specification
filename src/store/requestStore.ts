import { SpecRequest } from '../types';

const REQUESTS_KEY = 'collab_requests';
const CHANNEL_NAME = 'collab_requests_channel';

export function getRequests(): SpecRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRequests(requests: SpecRequest[]): void {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export function createChannel() {
  try { return new BroadcastChannel(CHANNEL_NAME); } catch { return null; }
}

export function createRequest(req: Omit<SpecRequest, 'id' | 'createdAt'>): SpecRequest {
  const requests = getRequests();
  const newReq: SpecRequest = {
    ...req,
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  saveRequests([...requests, newReq]);
  return newReq;
}

export function updateRequest(id: string, patch: Partial<SpecRequest>): void {
  const requests = getRequests();
  saveRequests(requests.map(r => r.id === id ? { ...r, ...patch } : r));
}

export function broadcast(channel: BroadcastChannel | null, payload: any) {
  channel?.postMessage({ ts: Date.now(), ...payload });
}
