import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { Public } from '../guards/jwt-auth.guard';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    @Inject('CORE_SERVICE') private coreClient: ClientProxy,
  ) {}

  @Public()
  @Get('supported-currencies')
  async getSupportedCurrencies() {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_CURRENCIES, {}),
    );
  }

  @Public()
  @Get('rates')
  async getRates() {
    return firstValueFrom(
      this.coreClient.send(CORE_PATTERNS.GET_RATES, {}),
    );
  }
}
