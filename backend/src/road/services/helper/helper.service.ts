import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class HelperService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  public async generateTokenForShareRoad(id: string) {
    return await this.jwtService.signAsync(
      {
        id,
      },
      {
        secret: this.configService.get('ROAD_SHARE_KEY'),
        expiresIn: this.configService.get('ROAD_SHARE_EXPIRE_IN'),
      },
    );
  }
  public async decodeTokenForShareRoad(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get('ROAD_SHARE_KEY'),
    });
  }
}
