import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SearchTripsDto {
  @Type(() => Number)
  @IsNumber()
  sourceLat: number;

  @Type(() => Number)
  @IsNumber()
  sourceLng: number;

  @Type(() => Number)
  @IsNumber()
  destinationLat: number;

  @Type(() => Number)
  @IsNumber()
  destinationLng: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  seats?: number;

  @IsOptional()
  @IsDateString()
  departureAfter?: string;

  @IsOptional()
  @IsDateString()
  departureBefore?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
