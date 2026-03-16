import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  commissionRate: number;
  hamaliCharge: number;
  marketFeeRate: number;
  openingBalance: number;
  balanceType: 'Cr' | 'Dr';
  currentBalance: number;
  creditLimit?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    code: {
      type: String,
      required: [true, 'Customer code is required'],
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: String,
    state: String,
    pincode: String,
    gstNumber: String,
    commissionRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },
    hamaliCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    marketFeeRate: {
      type: Number,
      default: 1,
      min: 0,
      max: 100,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    balanceType: {
      type: String,
      enum: ['Cr', 'Dr'],
      default: 'Dr',
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'conflict'],
      default: 'synced',
    },
    localId: String,
  },
  {
    timestamps: true,
  }
);

// Compound unique: same code allowed for different users
CustomerSchema.index({ code: 1, createdBy: 1 }, { unique: true });
CustomerSchema.index({ name: 'text' });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ createdBy: 1 });

const Customer: Model<ICustomer> = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export default Customer;
