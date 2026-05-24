export enum VerificationStatus {
  Pending = 'PENDING',
  Verified = 'VERIFIED',
  Rejected = 'REJECTED',
}

export enum TripStatus {
  Open = 'OPEN',
  Started = 'STARTED',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

export enum BookingStatus {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Cancelled = 'CANCELLED',
  Rejected = 'REJECTED',
}

export enum PaymentStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Failed = 'FAILED',
  Refunded = 'REFUNDED',
}
