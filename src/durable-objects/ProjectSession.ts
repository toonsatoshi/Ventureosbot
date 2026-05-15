import { ProjectState, ProjectStage, Message } from '../types';

export class ProjectSession {
  state: DurableObjectState;
  storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/state') {
      const projectState = await this.getProjectState();
      return new Response(JSON.stringify(projectState), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST' && path === '/update') {
      const updates = await request.json() as Partial<ProjectState>;
      const currentState = await this.getProjectState();
      const updatedState = { ...currentState, ...updates };
      await this.storage.put('projectState', updatedState);
      return new Response(JSON.stringify(updatedState), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST' && path === '/add-message') {
      const message = await request.json() as Message;
      const currentState = await this.getProjectState();
      currentState.history.push(message);
      await this.storage.put('projectState', currentState);
      return new Response(JSON.stringify(currentState), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST' && path === '/reset') {
      await this.storage.delete('projectState');
      const newState = await this.getProjectState();
      return new Response(JSON.stringify(newState), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  private async getProjectState(): Promise<ProjectState> {
    try {
      let state = await this.storage.get<ProjectState>('projectState');
      if (!state) {
        state = {
          id: this.state.id.toString(),
          name: 'New Project',
          stage: ProjectStage.IDEATION,
          history: []
        };
        await this.storage.put('projectState', state);
      }
      return state;
    } catch (e: any) {
      console.error('DO Storage Read Error:', e);
      // Fail-safe: Return a fresh state if the existing one is unreadable (e.g. SQLITE_TOOBIG)
      return {
        id: this.state.id.toString(),
        name: 'Recovered Project',
        stage: ProjectStage.IDEATION,
        history: [{ role: 'system', content: 'Storage recovered after error: ' + e.message, timestamp: Date.now() }]
      };
    }
  }
}
