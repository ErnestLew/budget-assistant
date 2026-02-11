import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@budget-assistant-api/prisma-client';
import { SUPPORTED_CURRENCIES, encrypt, decrypt, maskApiKey } from '@budget-assistant-api/shared';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    name: string;
    image?: string;
    googleId?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }) {
    return this.prisma.user.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      image: string;
      preferredCurrency: string;
      timezone: string;
      googleAccessToken: string;
      googleRefreshToken: string;
    }>,
  ) {
    if (data.preferredCurrency !== undefined) {
      const valid = (SUPPORTED_CURRENCIES as readonly string[]).includes(
        data.preferredCurrency,
      );
      if (!valid) {
        throw new RpcException(
          `Unsupported currency: ${data.preferredCurrency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}`,
        );
      }
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  async updateTokens(id: string, accessToken?: string, refreshToken?: string) {
    const data: Record<string, string> = {};
    if (accessToken !== undefined) {
      data.googleAccessToken = accessToken;
    }
    if (refreshToken !== undefined) {
      data.googleRefreshToken = refreshToken;
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateLastSync(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });
  }

  async updateApiKey(
    id: string,
    provider: 'groq' | 'gemini',
    plaintextKey: string,
  ): Promise<void> {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new RpcException('Server encryption key not configured');
    }

    const encrypted = encrypt(plaintextKey, encryptionKey);
    const field = provider === 'groq' ? 'groqApiKey' : 'geminiApiKey';

    await this.prisma.user.update({
      where: { id },
      data: { [field]: encrypted },
    });
  }

  async deleteApiKey(id: string, provider: 'groq' | 'gemini'): Promise<void> {
    const field = provider === 'groq' ? 'groqApiKey' : 'geminiApiKey';
    await this.prisma.user.update({
      where: { id },
      data: { [field]: null },
    });
  }

  async getApiKeysStatus(id: string): Promise<{
    groq: { configured: boolean; masked_key: string | null };
    gemini: { configured: boolean; masked_key: string | null };
  }> {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { groqApiKey: true, geminiApiKey: true },
    });

    if (!user) throw new RpcException('User not found');

    const decryptAndMask = (encrypted: string | null): string | null => {
      if (!encrypted || !encryptionKey) return null;
      try {
        return maskApiKey(decrypt(encrypted, encryptionKey));
      } catch {
        return null;
      }
    };

    return {
      groq: {
        configured: !!user.groqApiKey,
        masked_key: decryptAndMask(user.groqApiKey),
      },
      gemini: {
        configured: !!user.geminiApiKey,
        masked_key: decryptAndMask(user.geminiApiKey),
      },
    };
  }

  async getEncryptedApiKeys(id: string): Promise<{
    groqApiKey: string | null;
    geminiApiKey: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { groqApiKey: true, geminiApiKey: true },
    });
    if (!user) throw new RpcException('User not found');
    return {
      groqApiKey: user.groqApiKey,
      geminiApiKey: user.geminiApiKey,
    };
  }
}
