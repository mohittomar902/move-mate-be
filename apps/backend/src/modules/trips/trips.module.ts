import { Module } from '@nestjs/common';
import { DriverVerificationModule } from '../driver-verification/driver-verification.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [DriverVerificationModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
