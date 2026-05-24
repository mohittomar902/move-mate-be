import { Type } from 'class-transformer';
import { IsNumber, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateParcelDto {
  @IsUUID()
  tripId: string;

  @IsString()
  @MaxLength(160)
  pickupLocation: string;

  @IsString()
  @MaxLength(160)
  dropLocation: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  weight: number;

  @IsString()
  @MaxLength(60)
  parcelType: string;
}
