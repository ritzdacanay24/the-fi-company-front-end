import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlBuilder {
  constructor(private readonly configService: ConfigService) {}

  readonly operations = {
    safetyIncidentEdit: (id: number): string =>
      this.withQuery('/operations/forms/safety-incident/edit', { id }),
    forkliftInspectionEdit: (id: number): string =>
      this.withQuery('/operations/forms/forklift-inspection/edit', { id }),
    vehicleInspectionEdit: (id: number): string =>
      this.withQuery('/operations/forms/vehicle-inspection/edit', { id }),
    shippingRequestEdit: (id: number): string =>
      this.withQuery('/operations/forms/shipping-request/edit', { id }),
    materialRequestEdit: (id: number): string =>
      this.withQuery('/operations/forms/material-request/edit', { id }),
    materialRequestValidation: (id: number): string =>
      this.withQuery('/operations/material-request/validate-list', { id }),
    materialRequestView: (id: number): string =>
      this.withQuery('/operations/material-request/view', { id }),
    qirEdit: (id: number, selectedViewType = 'Open'): string =>
      this.withQuery('/quality/qir/edit', { selectedViewType, id }),
    igtTransferEdit: (id: number, selectedViewType = 'Active'): string =>
      this.withQuery('/operations/forms/igt-transfer/edit', { selectedViewType, id }),
  };

  private withQuery(
    path: string,
    query: Record<string, string | number | boolean | undefined>,
  ): string {
    const normalizedBase = this.normalizeBaseUrl(
      this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL'),
    );
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${normalizedBase}${normalizedPath}`);

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return String(baseUrl || '').replace(/\/+$/, '');
  }
}
