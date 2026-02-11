import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { AUTH_PATTERNS } from '@budget-assistant-api/shared';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  image: string | null;
  isActive: boolean;
  preferredCurrency: string;
  timezone: string;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapUserResponse(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    is_active: user.isActive,
    preferred_currency: user.preferredCurrency,
    timezone: user.timezone,
    last_sync_at: user.lastSyncAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @MessagePattern(AUTH_PATTERNS.VALIDATE_TOKEN)
  async validateToken(payload: { token: string }) {
    const decoded = this.authService.verifyToken(payload.token);
    if (!decoded) {
      return { valid: false };
    }
    return { valid: true, userId: decoded.sub };
  }

  @MessagePattern(AUTH_PATTERNS.GOOGLE_LOGIN)
  async googleLogin(payload: {
    email: string;
    name: string;
    image?: string;
    googleId?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }) {
    let user = await this.userService.findByEmail(payload.email);

    if (user) {
      const updateData: Record<string, string> = {};
      if (payload.googleAccessToken) {
        updateData.googleAccessToken = payload.googleAccessToken;
      }
      if (payload.googleRefreshToken) {
        updateData.googleRefreshToken = payload.googleRefreshToken;
      }
      if (payload.name) {
        updateData.name = payload.name;
      }
      if (payload.image) {
        updateData.image = payload.image;
      }
      if (payload.googleId) {
        updateData.googleId = payload.googleId;
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.userService.update(user.id, updateData);
      }
    } else {
      user = await this.userService.create({
        email: payload.email,
        name: payload.name,
        image: payload.image,
        googleId: payload.googleId,
        googleAccessToken: payload.googleAccessToken,
        googleRefreshToken: payload.googleRefreshToken,
      });
    }

    const accessToken = this.authService.createToken(user.id);

    return {
      access_token: accessToken,
      token_type: 'bearer',
      user: mapUserResponse(user),
    };
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH_TOKEN)
  async refreshToken(payload: { token: string }) {
    const decoded = this.authService.verifyTokenAllowExpired(payload.token);
    if (!decoded) {
      throw new RpcException('Invalid token');
    }

    const user = await this.userService.findById(decoded.sub);
    if (!user) {
      throw new RpcException('User not found');
    }

    const accessToken = this.authService.createToken(user.id);

    return {
      access_token: accessToken,
      token_type: 'bearer',
    };
  }

  @MessagePattern(AUTH_PATTERNS.GET_USER)
  async getUser(payload: { userId: string }) {
    const user = await this.userService.findById(payload.userId);
    if (!user) {
      throw new RpcException('User not found');
    }
    return mapUserResponse(user);
  }

  @MessagePattern(AUTH_PATTERNS.UPDATE_USER)
  async updateUser(payload: {
    userId: string;
    data: { name?: string; image?: string; preferred_currency?: string; timezone?: string };
  }) {
    const user = await this.userService.findById(payload.userId);
    if (!user) {
      throw new RpcException('User not found');
    }

    const updateData: Partial<{
      name: string;
      image: string;
      preferredCurrency: string;
      timezone: string;
    }> = {};

    if (payload.data.name !== undefined) {
      updateData.name = payload.data.name;
    }
    if (payload.data.image !== undefined) {
      updateData.image = payload.data.image;
    }
    if (payload.data.preferred_currency !== undefined) {
      updateData.preferredCurrency = payload.data.preferred_currency;
    }
    if (payload.data.timezone !== undefined) {
      updateData.timezone = payload.data.timezone;
    }

    const updated = await this.userService.update(payload.userId, updateData);
    return mapUserResponse(updated);
  }

  @MessagePattern(AUTH_PATTERNS.UPDATE_API_KEYS)
  async updateApiKeys(payload: {
    userId: string;
    provider: 'groq' | 'gemini';
    apiKey: string;
  }) {
    const user = await this.userService.findById(payload.userId);
    if (!user) throw new RpcException('User not found');

    if (!payload.apiKey || payload.apiKey.trim().length < 10) {
      throw new RpcException('Invalid API key format');
    }

    await this.userService.updateApiKey(
      payload.userId,
      payload.provider,
      payload.apiKey.trim(),
    );

    return { success: true, message: `${payload.provider} API key saved` };
  }

  @MessagePattern(AUTH_PATTERNS.GET_API_KEYS)
  async getApiKeys(payload: { userId: string }) {
    return this.userService.getApiKeysStatus(payload.userId);
  }

  @MessagePattern(AUTH_PATTERNS.DELETE_API_KEY)
  async deleteApiKey(payload: {
    userId: string;
    provider: 'groq' | 'gemini';
  }) {
    const user = await this.userService.findById(payload.userId);
    if (!user) throw new RpcException('User not found');

    await this.userService.deleteApiKey(payload.userId, payload.provider);
    return { success: true, message: `${payload.provider} API key removed` };
  }
}
