/**
 * TypeScript definitions for the Electron IPC API
 */

export interface Session {
  id: string;
  created_at: number;
  updated_at: number;
  task_description: string;
  task_type: string;
  target_url: string | null;
  status: 'running' | 'completed' | 'failed';
  confidence: number | null;
  tools: string[];
  folder_path: string;
  summary: string | null;
  error: string | null;
  artifacts?: Artifact[];
  steps?: WorkflowStep[];
}

export interface Artifact {
  id: string;
  session_id: string;
  created_at: number;
  type: 'screenshot' | 'snapshot' | 'har' | 'elements' | 'api_endpoints' | 'code';
  name: string;
  file_path: string | null;
  data: any;
  size: number;
}

export interface WorkflowStep {
  id: string;
  session_id: string;
  step_id: string;
  step_name: string;
  tool: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: number | null;
  completed_at: number | null;
  duration: number | null;
  result: any;
  error: string | null;
}

export interface SessionFilters {
  status?: string;
  taskType?: string;
  search?: string;
  limit?: number;
}

export interface SessionCreateData {
  taskDescription: string;
  taskType: string;
  targetUrl?: string;
  confidence?: number;
  tools?: string[];
}

export interface SessionUpdateData {
  status?: 'running' | 'completed' | 'failed';
  summary?: string;
  error?: string;
}

export interface ArtifactCreateData {
  type: Artifact['type'];
  name?: string;
  content?: Buffer | string | object;
  metadata?: object;
}

export interface StepCreateData {
  stepId: string;
  stepName: string;
  tool: string;
  action: string;
}

export interface StepUpdateData {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface Stats {
  totalSessions: number;
  completedSessions: number;
  totalArtifacts: number;
  totalSteps: number;
  byType: Array<{ task_type: string; count: number }>;
  recentSessions: Session[];
}

export interface IPCResponse<T> {
  success: boolean;
  error?: string;
  session?: T extends Session ? Session : never;
  sessions?: T extends Session[] ? Session[] : never;
  artifact?: T extends Artifact ? Artifact : never;
  artifacts?: T extends Artifact[] ? Artifact[] : never;
  steps?: T extends WorkflowStep[] ? WorkflowStep[] : never;
  stepId?: string;
  stats?: Stats;
}

export interface WebWrightPaths {
  global: string;
  sessions: string;
  exports: string;
}

export interface ElectronAPI {
  platform: string;

  sessions: {
    create: (data: SessionCreateData) => Promise<IPCResponse<Session>>;
    get: (id: string) => Promise<IPCResponse<Session>>;
    list: (filters?: SessionFilters) => Promise<IPCResponse<Session[]>>;
    update: (id: string, data: SessionUpdateData) => Promise<IPCResponse<Session>>;
    delete: (id: string) => Promise<{ success: boolean; error?: string }>;
    getFolder: () => Promise<string>;
  };

  artifacts: {
    add: (sessionId: string, data: ArtifactCreateData) => Promise<IPCResponse<Artifact>>;
    get: (id: string) => Promise<IPCResponse<Artifact>>;
    list: (sessionId: string) => Promise<IPCResponse<Artifact[]>>;
  };

  steps: {
    add: (sessionId: string, stepData: StepCreateData) => Promise<{ success: boolean; stepId?: string; error?: string }>;
    update: (id: string, data: StepUpdateData) => Promise<{ success: boolean; error?: string }>;
    list: (sessionId: string) => Promise<IPCResponse<WorkflowStep[]>>;
  };

  stats: {
    get: () => Promise<IPCResponse<Stats>>;
  };

  paths: {
    get: () => Promise<WebWrightPaths>;
  };

  folder: {
    open: (path: string) => Promise<{ success: boolean }>;
  };

  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
