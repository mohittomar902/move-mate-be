import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MaxLength(30)
  type: string;

  @IsString()
  @MaxLength(60)
  model: string;

  @IsString()
  @MaxLength(20)
  numberPlate: string;

  @IsInt()
  @Min(1)
  @Max(8)
  seatCapacity: number;
}
