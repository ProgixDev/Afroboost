import { Global, Module } from '@nestjs/common';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleController } from './google.controller';

/** Google OAuth is global so reviews + email can request access tokens. */
@Global()
@Module({
  controllers: [GoogleController],
  providers: [GoogleOAuthService],
  exports: [GoogleOAuthService],
})
export class GoogleModule {}
