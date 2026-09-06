import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EnvironmentVariables } from './../../../src/config/env.validation';

const MAPS_ROOT = 'https://maps.googleapis.com/maps/api';

const REQUEST_TIMEOUT_MS = 8000;

export const GOOGLE_OK = 'OK';
export const GOOGLE_ZERO_RESULTS = 'ZERO_RESULTS';

const RETRYABLE_STATUSES = new Set([
  'OVER_QUERY_LIMIT',
  'OVER_DAILY_LIMIT',
  'UNKNOWN_ERROR',
]);

export interface GoogleStatusResponse {
  status: string;
  error_message?: string;
}

@Injectable()
export class GoogleMapsClient {
  private readonly logger = new Logger(GoogleMapsClient.name);

  constructor(private config: ConfigService<EnvironmentVariables, true>) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey());
  }

  private apiKey(): string {
    return this.config.get('MAP_API_KEY') ?? '';
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Map lookups are not configured on this server',
      );
    }
  }

  async get<T extends GoogleStatusResponse>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    this.assertConfigured();

    const query = new URLSearchParams({ ...params, key: this.apiKey() });
    const body = await this.fetchJson<T>(`${MAPS_ROOT}${path}?${query}`, path);

    this.assertUsableStatus(body, path);

    return body;
  }

  private async fetchJson<T>(url: string, path: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Google Maps ${path} unreachable: ${String(error)}`);
      throw new ServiceUnavailableException('Map service is unavailable');
    }

    if (!response.ok) {
      this.logger.error(`Google Maps ${path} answered ${response.status}`);
      throw new BadGatewayException('Map service returned an error');
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      this.logger.error(`Google Maps ${path} sent no JSON: ${String(error)}`);
      throw new BadGatewayException('Map service returned an error');
    }
  }

  private assertUsableStatus(body: GoogleStatusResponse, path: string): void {
    if (body.status === GOOGLE_OK || body.status === GOOGLE_ZERO_RESULTS) {
      return;
    }

    const detail = body.error_message ? `: ${body.error_message}` : '';
    this.logger.error(`Google Maps ${path} status ${body.status}${detail}`);

    if (RETRYABLE_STATUSES.has(body.status)) {
      throw new ServiceUnavailableException('Map service is busy, try again');
    }

    throw new BadGatewayException('Map service returned an error');
  }
}
