import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AddressSearchService {
  private readonly tomTomApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.tomTomApiKey =
      this.configService.get<string>('TOMTOM_API_KEY') || 'KrCCpKUkIeNDTqz4XfAj5MI56UsdZ9NM';
  }

  async addressSearch(q?: string) {
    const query = String(q || '').trim();
    if (!query) {
      return { results: [] };
    }

    const encodedQuery = encodeURIComponent(query);
    const url = new URL(`https://api.tomtom.com/search/2/search/${encodedQuery}.json`);
    url.searchParams.set('key', this.tomTomApiKey);
    url.searchParams.set('typeahead', 'true');
    url.searchParams.set('limit', '100');
    url.searchParams.set('ofs', '0');
    url.searchParams.set('countrySet', 'us');
    url.searchParams.set('extendedPostalCodesFor', 'POI,Str,XStr,Addr');

    const response = await fetch(url.toString());
    if (!response.ok) {
      return { results: [] };
    }

    return response.json();
  }

  async airportSearch(params: {
    q?: string;
    lat?: string;
    lon?: string;
    radius?: string;
    limit?: string;
    categorySet?: string;
  }) {
    const url = new URL('https://api.tomtom.com/search/2/nearbySearch/.json');
    url.searchParams.set('lat', String(params.lat || '0'));
    url.searchParams.set('lon', String(params.lon || '0'));
    url.searchParams.set('radius', String(params.radius || '0'));
    url.searchParams.set('categorySet', String(params.categorySet || '7380'));
    url.searchParams.set('key', this.tomTomApiKey);
    url.searchParams.set('limit', String(params.limit || '100'));

    const response = await fetch(url.toString());
    if (!response.ok) {
      return { results: [] };
    }

    return response.json();
  }
}