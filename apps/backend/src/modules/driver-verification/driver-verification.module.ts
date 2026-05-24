import { Module } from '@nestjs/common';
import { DriverVerificationController } from './driver-verification.controller';
import { DriverVerificationService } from './driver-verification.service';

@Module({
  controllers: [DriverVerificationController],
  providers: [DriverVerificationService],
  exports: [DriverVerificationService],
})
export class DriverVerificationModule {}
