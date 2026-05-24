import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TripStatus } from '@prisma/client';
import { CreateTripDto } from './create-trip.dto';

export class UpdateTripDto extends PartialType(CreateTripDto) {
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;
}
