export enum ProjectStage {
  IDEATION = 'IDEATION',
  SPECIFICATION = 'SPECIFICATION',
  ARCHITECTURE = 'ARCHITECTURE',
  BUILDING = 'BUILDING',
  LAUNCH_PLANNING = 'LAUNCH_PLANNING',
  EXPORTED = 'EXPORTED'
}

export interface ProjectState {
  id: string;
  name: string;
  stage: ProjectStage;
  description?: string;
  spec?: string;
  architecture?: string;
  codeArtifacts?: string[];
  launchPlan?: string;
  history: Message[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: {
    data: string; // Base64 or URL
    mimeType: string;
  };
}

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  KV: KVNamespace;
  ARTIFACTS: R2Bucket;
  PROJECT_SESSION: DurableObjectNamespace;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  NEBIUS_API_KEY?: string;
}

export interface ProjectSessionData {
  state: ProjectState;
}
