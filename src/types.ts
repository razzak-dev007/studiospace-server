import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId | string;
  name: string;
  email: string;
  password?: string;
  photoURL?: string;
  role: 'creator' | 'host' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Studio {
  _id?: ObjectId | string;
  title: string;
  category: 'Photo Studio' | 'Film Stage' | 'Podcast Lounge' | 'Music Suite' | 'Art Workshop' | 'Dance Studio';
  hourlyRate: number;
  securityDeposit: number;
  maxCapacity: number;
  location: string;
  image: string;
  gallery: string[];
  amenities: string[];
  overview: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhoto?: string;
  rating: number;
  reviewCount: number;
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  _id?: ObjectId | string;
  studioId: string;
  studioTitle: string;
  studioCategory: string;
  studioImage: string;
  studioLocation: string;
  hourlyRate: number;
  securityDeposit: number;
  userEmail: string;
  userName: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm, e.g. "09:00"
  endTime: string;     // HH:mm, e.g. "13:00"
  durationHours: number;
  totalPrice: number;
  creatorNotes?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Wishlist {
  _id?: ObjectId | string;
  userEmail: string;
  studioId: string;
  createdAt: Date;
}
