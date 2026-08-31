import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../type/auth.types';

@Injectable()
export class ResetStrategy extends PassportStrategy(Strategy, 'jwt-reset') {
  constructor(config: ConfigService) {
    const secretKey = config.get<string>('RESET_KEY');
    if (!secretKey) {
      throw new Error('RESET_KEY is not defined in the configuration');
    }
    super({
      jwtFromRequest: ExtractJwt.fromUrlQueryParameter('token'),
      secretOrKey: secretKey,
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
