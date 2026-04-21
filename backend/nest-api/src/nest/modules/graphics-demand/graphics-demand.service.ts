import { BadGatewayException, Injectable } from '@nestjs/common';

@Injectable()
export class GraphicsDemandService {
  private readonly legacyBaseUrl =
    process.env.LEGACY_GRAPHICS_API_BASE_URL?.trim() ||
    'https://dashboard.eye-fi.com/server/Api/Graphics';

  async getReport(): Promise<unknown> {
    const url = `${this.legacyBaseUrl}/graphicsDemand.php?getGraphicsDemandReport=1`;
    return this.fetchJson(url, {
      method: 'GET',
    });
  }

  async createOrUpdate(payload: Record<string, unknown>): Promise<unknown> {
    const url = `${this.legacyBaseUrl}/graphicsDemand.php`;
    return this.fetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        createOrUpdate: 1,
      }),
    });
  }

  private async fetchJson(url: string, options: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new BadGatewayException('Unable to reach legacy graphics demand service');
    }

    if (!response.ok) {
      throw new BadGatewayException(`Legacy graphics demand service failed (${response.status})`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new BadGatewayException('Legacy graphics demand service returned invalid JSON');
    }
  }
}
