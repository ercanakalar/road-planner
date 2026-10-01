import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { GetUser } from 'src/common/decorators/get-user.decorator';
import { CONSENT_THROTTLE } from 'src/config/throttle';
import { ConsentService } from './consent.service';
import { GrantConsentDto, WithdrawConsentDto } from './dto/consent.dto';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  @Throttle(CONSENT_THROTTLE.grant)
  @Post()
  @HttpCode(HttpStatus.OK)
  async grant(
    @Body() body: GrantConsentDto,
    @GetUser('userId') userId: string,
  ) {
    return this.consent.grant(userId, body);
  }

  @Throttle(CONSENT_THROTTLE.withdraw)
  @Post('/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @Body() body: WithdrawConsentDto,
    @GetUser('userId') userId: string,
  ) {
    return this.consent.withdraw(userId, body);
  }
}
