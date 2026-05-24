import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  tripId: string;

  @IsInt()
  @Min(1)
  @Max(8)
  seatsBooked: number;
}
