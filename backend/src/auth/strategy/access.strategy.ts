import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../type/auth.types';

@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(config: ConfigService) {
    const secretKey = config.get<string>('ACCESS_KEY');
    if (!secretKey) {
      throw new Error('ACCESS_KEY is not defined in the configuration');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secretKey,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload?.userId) {
      throw new UnauthorizedException('Token is missing a subject');
    }

    return payload;
  }
}
