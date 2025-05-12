import { Injectable } from '@nestjs/common';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { HelperService } from 'src/auth/helper/helper.service';

@Injectable()
export class GoogleService {
  constructor(
    private configService: ConfigService,
    private helperService: HelperService,
  ) {}

  async getAuthClientData(
    code: string,
  ): Promise<{ email: string; refreshToken: string; accessToken: string }> {
    const authClient = new OAuth2Client({
      clientId: this.configService.get('GOOGLE_AUTH_CLIENT_ID'),
      clientSecret: this.configService.get('GOOGLE_AUTH_CLIENT_SECRET'),
    });
    const tokenData = await authClient.getToken(code);
    const tokens = tokenData.tokens;
    const refreshToken = tokens?.refresh_token || '';
    const accessToken = tokens?.access_token || '';

    authClient.setCredentials(tokens);

    const googleAuth = new GoogleAuth({
      authClient,
      credentials: {
        client_id: authClient._clientId,
      },
    });
    this.helperService.verifyGoogleAccessToken(accessToken);
    return { email, refreshToken, accessToken };
  }
}
