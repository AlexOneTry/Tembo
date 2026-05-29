export type Role = 'user' | 'assistant' | 'system';

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'error';

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: ToolCallStatus;
  duration?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type ThemeMode = 'dark' | 'light';

export interface Settings {
  theme: ThemeMode;
  accentColor: string;
  fontSize: number;
  apiEndpoint: string;
  model: string;
}
