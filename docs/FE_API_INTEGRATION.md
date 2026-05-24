# MoveMate Frontend API Integration Guide

This document explains how the frontend/mobile app should integrate with the current MoveMate backend.

## Base URL

Local backend:

```txt
http://localhost:3000/api
```

Swagger docs:

```txt
http://localhost:3000/api/docs
```

For Android emulator, use:

```txt
http://10.0.2.2:3000/api
```

For a real mobile device, use the laptop's local network IP:

```txt
http://YOUR_LAPTOP_IP:3000/api
```

## Auth Header

Protected APIs require:

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Store:

- `accessToken`: use for API requests.
- `refreshToken`: use to get a new access token when the access token expires.

Recommended FE storage:

- Mobile: secure storage/keychain.
- Web: httpOnly cookie is best for production; local storage is okay only for early dev.

## Dev OTP

In local development, OTP is currently fixed:

```txt
123456
```

The `send-otp` API also returns `devOtp` for convenience.

---

# 1. Auth APIs

## Send OTP

```http
POST /auth/send-otp
```

Request:

```json
{
  "phone": "+919999999999"
}
```

Response:

```json
{
  "message": "OTP sent",
  "devOtp": "123456"
}
```

## Verify OTP

```http
POST /auth/verify-otp
```

Request:

```json
{
  "phone": "+919999999999",
  "otp": "123456"
}
```

Response:

```json
{
  "accessToken": "JWT_ACCESS_TOKEN",
  "refreshToken": "JWT_REFRESH_TOKEN"
}
```

After this response, save both tokens and treat the user as logged in.

## Refresh Token

```http
POST /auth/refresh-token
```

Request:

```json
{
  "refreshToken": "JWT_REFRESH_TOKEN"
}
```

Response:

```json
{
  "accessToken": "NEW_JWT_ACCESS_TOKEN",
  "refreshToken": "NEW_JWT_REFRESH_TOKEN"
}
```

Frontend behavior:

1. If an API returns `401`, call `/auth/refresh-token`.
2. Save the new tokens.
3. Retry the original request once.
4. If refresh fails, logout the user.

---

# 2. Users APIs

All users APIs below require auth.

## Get My Profile

```http
GET /users/me
```

Response:

```json
{
  "id": "uuid",
  "fullName": "Mohit",
  "phone": "+919999999999",
  "email": "mohit@example.com",
  "profileImage": "https://example.com/avatar.png",
  "rating": "0",
  "verificationStatus": "PENDING",
  "createdAt": "2026-05-24T00:00:00.000Z",
  "updatedAt": "2026-05-24T00:00:00.000Z"
}
```

## Update My Profile

```http
PATCH /users/me
```

Request:

```json
{
  "fullName": "Mohit Singh",
  "email": "mohit@example.com",
  "profileImage": "https://example.com/avatar.png"
}
```

## Get Public User Profile

```http
GET /users/:id
```

Response excludes private fields like phone and email.

---

# 3. Vehicles APIs

All vehicle APIs require auth.

## Create Vehicle

```http
POST /vehicles
```

Request:

```json
{
  "type": "car",
  "model": "Hyundai i20",
  "numberPlate": "MP09AB1234",
  "seatCapacity": 4
}
```

## Get My Vehicles

```http
GET /vehicles
```

## Update Vehicle

```http
PATCH /vehicles/:id
```

Request:

```json
{
  "model": "Hyundai i20 Sportz",
  "seatCapacity": 4
}
```

## Delete Vehicle

```http
DELETE /vehicles/:id
```

Response:

```json
{
  "deleted": true
}
```

---

# 4. Trips APIs

## Create Trip

Requires auth.

```http
POST /trips
```

Request:

```json
{
  "vehicleId": "uuid",
  "sourceName": "Indore",
  "sourceLat": 22.7196,
  "sourceLng": 75.8577,
  "destinationName": "Bhopal",
  "destinationLat": 23.2599,
  "destinationLng": 77.4126,
  "departureTime": "2026-05-25T09:00:00.000Z",
  "availableSeats": 3,
  "pricePerSeat": 450
}
```

Important:

- `vehicleId` must belong to the logged-in user.
- `departureTime` must be an ISO date string.

## Search Trips

Public API.

```http
GET /trips/search
```

Query params:

```txt
sourceLat=22.7196
sourceLng=75.8577
destinationLat=23.2599
destinationLng=77.4126
seats=1
departureAfter=2026-05-24T00:00:00.000Z
departureBefore=2026-05-26T00:00:00.000Z
limit=20
```

Example:

```txt
/trips/search?sourceLat=22.7196&sourceLng=75.8577&destinationLat=23.2599&destinationLng=77.4126&seats=1&limit=20
```

Current V1 behavior:

- Filters by open trips.
- Filters by available seats.
- Filters by departure time.
- Geo radius matching is planned for the next backend iteration.

## Get Trip Detail

Public API.

```http
GET /trips/:id
```

## Update Trip

Requires auth. Only the trip driver can update.

```http
PATCH /trips/:id
```

Request:

```json
{
  "availableSeats": 2,
  "pricePerSeat": 500,
  "status": "OPEN"
}
```

Allowed statuses:

```txt
OPEN
STARTED
COMPLETED
CANCELLED
```

## Delete Trip

Requires auth. Only the trip driver can delete.

```http
DELETE /trips/:id
```

---

# 5. Bookings APIs

All booking APIs require auth.

## Create Booking

```http
POST /bookings
```

Request:

```json
{
  "tripId": "uuid",
  "seatsBooked": 1
}
```

Current backend behavior:

- Passenger cannot book their own trip.
- Trip must be `OPEN`.
- Seats must be available.
- Backend reserves seats immediately in a transaction.
- Payment status starts as `PENDING`.
- Booking status starts as `PENDING`.

## Get Booking Detail

```http
GET /bookings/:id
```

Visible to:

- passenger
- trip driver

## Update Booking Status

```http
PATCH /bookings/:id/status
```

Request:

```json
{
  "bookingStatus": "CONFIRMED"
}
```

Allowed statuses:

```txt
PENDING
CONFIRMED
CANCELLED
REJECTED
```

---

# 6. Payments APIs

Payment APIs are currently dev stubs. Razorpay verification will be hardened later.

## Create Payment Order

Requires auth.

```http
POST /payments/create-order
```

Request:

```json
{
  "bookingId": "uuid"
}
```

Response:

```json
{
  "bookingId": "uuid",
  "amount": "450",
  "currency": "INR",
  "provider": "razorpay",
  "providerOrderId": "dev_order_uuid"
}
```

## Verify Payment

Requires auth.

```http
POST /payments/verify
```

Request:

```json
{
  "bookingId": "uuid",
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature"
}
```

Current dev behavior:

- Marks booking `paymentStatus` as `PAID`.

## Payment Webhook

Public provider callback.

```http
POST /payments/webhook
```

Header:

```http
x-razorpay-signature: signature
```

---

# 7. Ratings APIs

Requires auth.

## Create Rating

```http
POST /ratings
```

Request:

```json
{
  "toUserId": "uuid",
  "tripId": "uuid",
  "rating": 5,
  "review": "Great ride"
}
```

Rules:

- `rating` must be from `1` to `5`.
- A user can rate another user once per trip.

---

# 8. Parcels APIs

Requires auth.

Parcel is Phase 2/4 scope, but the create endpoint exists.

## Create Parcel

```http
POST /parcels
```

Request:

```json
{
  "tripId": "uuid",
  "pickupLocation": "Vijay Nagar, Indore",
  "dropLocation": "MP Nagar, Bhopal",
  "weight": 2.5,
  "parcelType": "documents"
}
```

---

# 9. Realtime Tracking

Socket.IO server runs on the same backend host.

Local socket URL:

```txt
http://localhost:3000
```

## Join Trip Room

Emit:

```txt
join_trip
```

Payload:

```json
{
  "tripId": "uuid"
}
```

## Driver Location Update

Emit:

```txt
trip_location_update
```

Payload:

```json
{
  "tripId": "uuid",
  "lat": 22.7196,
  "lng": 75.8577,
  "heading": 90,
  "speed": 42
}
```

Listen:

```txt
trip_location_update
```

## Trip Started

Emit/listen:

```txt
trip_started
```

Payload:

```json
{
  "tripId": "uuid"
}
```

## Trip Completed

Emit/listen:

```txt
trip_completed
```

Payload:

```json
{
  "tripId": "uuid"
}
```

---

# 10. Suggested FE API Client

Example with Axios:

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

Refresh token retry example:

```ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      const response = await axios.post('http://localhost:3000/api/auth/refresh-token', {
        refreshToken,
      });

      saveTokens(response.data.accessToken, response.data.refreshToken);
      originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;

      return api(originalRequest);
    }

    return Promise.reject(error);
  },
);
```

---

# 11. Common Error Handling

The backend returns standard JSON errors.

Example validation error:

```json
{
  "message": [
    "phone must be a valid phone number"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

Recommended FE behavior:

- `400`: show validation message.
- `401`: refresh token or logout.
- `403`: show "You do not have permission".
- `404`: show not found state.
- `409`: show conflict state if added later.
- `500`: show generic retry message.

---

# 12. Recommended User Flows

## Login Flow

1. User enters phone number.
2. FE calls `POST /auth/send-otp`.
3. User enters OTP.
4. FE calls `POST /auth/verify-otp`.
5. FE stores `accessToken` and `refreshToken`.
6. FE calls `GET /users/me`.
7. If profile is incomplete, show profile setup screen.

## Driver Create Trip Flow

1. FE calls `GET /vehicles`.
2. If no vehicle exists, show create vehicle screen.
3. FE calls `POST /vehicles`.
4. FE calls `POST /trips`.
5. Show created trip detail.

## Passenger Booking Flow

1. FE calls `GET /trips/search`.
2. User opens trip detail with `GET /trips/:id`.
3. FE calls `POST /bookings`.
4. FE calls `POST /payments/create-order`.
5. FE opens Razorpay checkout later.
6. FE calls `POST /payments/verify`.

---

# 13. Backend Dev Commands

Start local PostgreSQL if installed through Homebrew:

```bash
brew services start postgresql@16
```

Run backend:

```bash
cd /Users/mohitsinghtomar/Documents/MoveMate
npm run dev:backend
```

If port `3000` is busy:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <PID>
```

Then rerun:

```bash
npm run dev:backend
```
