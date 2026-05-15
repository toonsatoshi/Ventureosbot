import { Env } from '../types';

export class R2Artifacts {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async uploadArtifact(projectId: string, fileName: string, content: string | Uint8Array): Promise<void> {
    const key = `${projectId}/${fileName}`;
    await this.env.ARTIFACTS.put(key, content);
  }

  async getArtifact(projectId: string, fileName: string): Promise<R2ObjectBody | null> {
    const key = `${projectId}/${fileName}`;
    return await this.env.ARTIFACTS.get(key);
  }

  async listArtifacts(projectId: string): Promise<string[]> {
    const list = await this.env.ARTIFACTS.list({ prefix: `${projectId}/` });
    return list.objects.map(obj => obj.key.replace(`${projectId}/`, ''));
  }
}
