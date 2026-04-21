import { Global, Module } from '@nestjs/common';
import { UrlBuilder } from './url-builder';

@Global()
@Module({
  providers: [UrlBuilder],
  exports: [UrlBuilder],
})
export class UrlModule {}
