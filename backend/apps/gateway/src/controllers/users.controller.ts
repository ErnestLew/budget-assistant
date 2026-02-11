import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AUTH_PATTERNS } from '@budget-assistant-api/shared';
import { CurrentUserId } from '../decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}

  @Get('me')
  async getMe(@CurrentUserId() userId: string) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.GET_USER, { userId }),
    );
  }

  @Patch('me')
  async updateMe(@CurrentUserId() userId: string, @Body() body: any) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.UPDATE_USER, { userId, data: body }),
    );
  }

  @Get('me/api-keys')
  async getApiKeys(@CurrentUserId() userId: string) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.GET_API_KEYS, { userId }),
    );
  }

  @Patch('me/api-keys')
  async updateApiKey(
    @CurrentUserId() userId: string,
    @Body() body: { provider: string; api_key: string },
  ) {
    if (!body.provider || !['groq', 'gemini'].includes(body.provider)) {
      throw new BadRequestException(
        'provider must be "groq" or "gemini"',
      );
    }
    if (!body.api_key || body.api_key.trim().length < 10) {
      throw new BadRequestException('api_key is required (min 10 chars)');
    }
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.UPDATE_API_KEYS, {
        userId,
        provider: body.provider as 'groq' | 'gemini',
        apiKey: body.api_key,
      }),
    );
  }

  @Delete('me/api-keys/:provider')
  async deleteApiKey(
    @CurrentUserId() userId: string,
    @Param('provider') provider: string,
  ) {
    if (!['groq', 'gemini'].includes(provider)) {
      throw new BadRequestException(
        'provider must be "groq" or "gemini"',
      );
    }
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.DELETE_API_KEY, {
        userId,
        provider: provider as 'groq' | 'gemini',
      }),
    );
  }
}
