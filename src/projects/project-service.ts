import { Env, ProjectState, Message } from '../types';

export class ProjectService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async getProjectState(chatId: string): Promise<ProjectState> {
    const id = this.env.PROJECT_SESSION.idFromName(chatId);
    const stub = this.env.PROJECT_SESSION.get(id);
    const response = await stub.fetch(`http://do/state`);
    return await response.json() as ProjectState;
  }

  async updateProjectState(chatId: string, updates: Partial<ProjectState>): Promise<ProjectState> {
    const id = this.env.PROJECT_SESSION.idFromName(chatId);
    const stub = this.env.PROJECT_SESSION.get(id);
    const response = await stub.fetch(`http://do/update`, {
      method: 'POST',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json() as ProjectState;
  }

  async addMessage(chatId: string, message: Message): Promise<ProjectState> {
    const id = this.env.PROJECT_SESSION.idFromName(chatId);
    const stub = this.env.PROJECT_SESSION.get(id);
    const response = await stub.fetch(`http://do/add-message`, {
      method: 'POST',
      body: JSON.stringify(message),
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json() as ProjectState;
  }

  async createNewProject(chatId: string, name: string): Promise<ProjectState> {
    return await this.updateProjectState(chatId, {
      name,
      stage: 'IDEATION' as any, // Avoiding enum issue for now if needed, but should use ProjectStage.IDEATION
      history: []
    });
  }
}
