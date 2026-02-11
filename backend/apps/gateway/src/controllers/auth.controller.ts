import { Controller, Post, Body, Headers, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import { firstValueFrom } from 'rxjs';
import { AUTH_PATTERNS, RATE_LIMIT_AUTH, RATE_LIMIT_REFRESH } from '@budget-assistant-api/shared';
import { Public } from '../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}

  @Public()
  @Throttle({ default: RATE_LIMIT_AUTH })
  @Post('google')
  async googleLogin(@Body() body: any) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.GOOGLE_LOGIN, body),
    );
  }

  @Public()
  @Throttle({ default: RATE_LIMIT_REFRESH })
  @Post('refresh')
  async refreshToken(@Headers('authorization') authHeader: string) {
    const token = authHeader?.split(' ')[1];
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REFRESH_TOKEN, { token }),
    );
  }
}
