import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../type/auth.types';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    const secretKey = config.get<string>('REFRESH_KEY');
    if (!secretKey) {
      throw new Error('REFRESH_KEY is not defined in the configuration');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secretKey,
      passReqToCallback: true,
    });
  }

  validate(req: any, payload: JwtPayload) {
    const authHeader = req.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header is missing or malformed');
    }

    const refreshToken = authHeader.replace('Bearer ', '').trim();

    return {
      ...payload,
      refreshToken,
    };
  }
}
