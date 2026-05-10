import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

export interface DeployStatusPayload {
  deploying: boolean;
  message: string;
  retryAfterSeconds: number;
  updatedAt: string;
}

@Injectable()
export class DeployStatusService {
  private readonly defaultMessage = 'A new version is currently being deployed. Please retry in a moment.';
  private readonly defaultRetryAfterSeconds = 15;
  private readonly statusFilePath = process.env.DEPLOY_STATUS_FILE
    ? path.resolve(process.env.DEPLOY_STATUS_FILE)
    : path.resolve(process.cwd(), 'deploy-status.json');

  async getStatus(): Promise<DeployStatusPayload> {
    const fallback: DeployStatusPayload = {
      deploying: false,
      message: this.defaultMessage,
      retryAfterSeconds: this.defaultRetryAfterSeconds,
      updatedAt: new Date().toISOString(),
    };

    try {
      const raw = await readFile(this.statusFilePath, 'utf-8');
      const parsed = JSON.parse(raw || '{}') as Partial<DeployStatusPayload>;

      const retryAfterSeconds = this.normalizeRetryAfterSeconds(parsed.retryAfterSeconds);
      const message = String(parsed.message || this.defaultMessage).trim() || this.defaultMessage;

      return {
        deploying: parsed.deploying === true,
        message,
        retryAfterSeconds,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    } catch {
      return fallback;
    }
  }

  private normalizeRetryAfterSeconds(input: unknown): number {
    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return this.defaultRetryAfterSeconds;
    }

    return Math.min(Math.round(parsed), 300);
  }
}
