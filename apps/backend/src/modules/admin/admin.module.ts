import { Module } from '@nestjs/common';
import { DriverVerificationModule } from '../driver-verification/driver-verification.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [DriverVerificationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
