import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type TripLocationUpdate = {
  tripId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  senderId?: string;
};

type ChatMessage = {
  tripId: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_trip')
  joinTrip(@MessageBody('tripId') tripId: string, @ConnectedSocket() client: Socket) {
    client.join(this.tripRoom(tripId));
    return { joined: tripId };
  }

  @SubscribeMessage('trip_location_update')
  handleLocationUpdate(@MessageBody() payload: TripLocationUpdate) {
    this.server.to(this.tripRoom(payload.tripId)).emit('trip_location_update', payload);
    return { delivered: true };
  }

  @SubscribeMessage('trip_started')
  handleTripStarted(@MessageBody('tripId') tripId: string) {
    this.server.to(this.tripRoom(tripId)).emit('trip_started', { tripId });
    return { delivered: true };
  }

  @SubscribeMessage('trip_completed')
  handleTripCompleted(@MessageBody('tripId') tripId: string) {
    this.server.to(this.tripRoom(tripId)).emit('trip_completed', { tripId });
    return { delivered: true };
  }

  @SubscribeMessage('send_message')
  handleChatMessage(@MessageBody() payload: ChatMessage) {
    this.server.to(this.tripRoom(payload.tripId)).emit('new_message', payload);
    return { delivered: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() payload: { tripId: string; senderId: string; senderName: string; isTyping: boolean },
  ) {
    this.server.to(this.tripRoom(payload.tripId)).emit('typing', payload);
    return { delivered: true };
  }

  private tripRoom(tripId: string) {
    return `trip:${tripId}`;
  }
}
