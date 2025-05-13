import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthClient } from 'src/auth/type/auth.types';

@Injectable()
export class GoogleService {
  constructor(private config: ConfigService) {}

  getAuthClient(): OAuth2Client {
    return new OAuth2Client(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URL'),
    );
  }

  async getAuthClientUrl() {
    const authClient = this.getAuthClient();
    const url = authClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: this.config.get('GOOGLE_SCOPES_API').split(','),
    });

    return url;
  }

  async getAuthClientData(code: string): Promise<{
    email: string;
    refreshToken: string;
    accessToken: string;
  }> {
    const authClient = this.getAuthClient();
    const { tokens } = await authClient.getToken(code);

    authClient.setCredentials(tokens);

    const userInfoResponse = await authClient.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      method: 'GET',
    });

    const userInfo = userInfoResponse.data as GoogleAuthClient;

    return {
      email: userInfo.email,
      accessToken: tokens.access_token ?? '',
      refreshToken: tokens.refresh_token ?? '',
    };
  }
}
