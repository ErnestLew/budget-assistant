import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CORE_PATTERNS } from '@budget-assistant-api/shared';
import { ExchangeRateService } from './exchange-rate.service';

@Controller()
export class ExchangeRatesController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @MessagePattern(CORE_PATTERNS.GET_CURRENCIES)
  async getCurrencies() {
    return this.exchangeRateService.getSupportedCurrencies();
  }

  @MessagePattern(CORE_PATTERNS.GET_RATES)
  async getRates() {
    let rates = await this.exchangeRateService.getCachedRates();
    if (!rates) {
      rates = await this.exchangeRateService.refreshRates();
    }
    return { rates };
  }
}
