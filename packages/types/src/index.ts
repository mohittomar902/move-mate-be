export type LatLng = {
  lat: number;
  lng: number;
};

export type TripSearchInput = {
  source: LatLng;
  destination: LatLng;
  seats?: number;
  departureAfter?: string;
  departureBefore?: string;
};
