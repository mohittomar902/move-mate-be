import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateTripDto {
  @IsUUID()
  vehicleId: string;

  @IsString()
  @MaxLength(120)
  sourceName: string;

  @Type(() => Number)
  @IsNumber()
  sourceLat: number;

  @Type(() => Number)
  @IsNumber()
  sourceLng: number;

  @IsString()
  @MaxLength(120)
  destinationName: string;

  @Type(() => Number)
  @IsNumber()
  destinationLat: number;

  @Type(() => Number)
  @IsNumber()
  destinationLng: number;

  @IsDateString()
  departureTime: string;

  @IsInt()
  @Min(1)
  @Max(8)
  availableSeats: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerSeat: number;
}
