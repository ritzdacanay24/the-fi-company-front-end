export class UrlBuilder {
  static operations = {
    safetyIncidentEdit(baseUrl: string, id: number): string {
      return UrlBuilder.withQuery(baseUrl, '/operations/forms/safety-incident/edit', { id });
    },
    forkliftInspectionEdit(baseUrl: string, id: number): string {
      return UrlBuilder.withQuery(baseUrl, '/operations/forms/forklift-inspection/edit', { id });
    },
    vehicleInspectionEdit(baseUrl: string, id: number): string {
      return UrlBuilder.withQuery(baseUrl, '/operations/forms/vehicle-inspection/edit', { id });
    },
  };

  private static withQuery(
    baseUrl: string,
    path: string,
    query: Record<string, string | number | boolean | undefined>,
  ): string {
    const normalizedBase = this.normalizeBaseUrl(baseUrl);
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

  private static normalizeBaseUrl(baseUrl: string): string {
    return String(baseUrl || '').replace(/\/+$/, '');
  }
}
