export interface Employee {
  id: number;
  stageFio: string;
  role: string;
  rateWithTax: string;
  hoursPerStage: string;
  verification: string;
  workStartDate: string | null;
  workEndDate: string | null;
}

export interface FunctionalRequirement {
  id: number;
  description: string;
}

export interface Stage {
  id: number;
  stage: string;
  stageCost: string;
  stageStartDate: string | null;
  stageEndDate: string | null;
  functionalRequirements: FunctionalRequirement[];
  employees: Employee[];
}

export interface SpecificationItem {
  id: number;
  subject: string;
  ci: string;
  stages: Stage[];
}

export interface Contract {
  id: number;
  contractNumber: string;
  contractDate: string | null;
}

export interface Cluster {
  id: number;
  productName: string;
  productCode: string;
  strategicTheme: string;
}

export interface FormData {
  jiraLink: string;
  tribe: string;
  tribeResponsible: string;
  contractor: string;
  contractorResponsible: string;
  nonFunctionalRequirements: string;
  clusters: Cluster[];
  contracts: Contract[];
  specificationItems: SpecificationItem[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  fieldRef?: string;
  stepRef?: number;
  timestamp: number;
  type: 'message' | 'flag' | 'system';
  flagType?: 'error' | 'warning' | 'info';
  resolved?: boolean;
}

export interface FieldFlag {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  fieldId: string;
  stepIndex: number;
  type: 'error' | 'warning' | 'info';
  comment: string;
  timestamp: number;
  resolved: boolean;
}

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  currentStep: number;
  activeField: string | null;
  lastSeen: number;
  isTyping: boolean;
  typingField: string | null;
}

export type UserRole = 'client' | 'manager';

export interface SpecRequest {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdByColor: string;
  createdAt: number;
  status: 'open' | 'in_progress' | 'done';
  sessionId: string;
  managerId?: string;
  managerName?: string;
}

export interface SharedState {
  formData: FormData;
  messages: ChatMessage[];
  flags: FieldFlag[];
  users: UserPresence[];
  lastUpdatedBy: string;
  lastUpdatedAt: number;
}
