import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFarmer extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  userId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address: string;
  village?: string;
  district?: string;
  state?: string;
  pincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  cropTypes: string[];
  openingBalance: number;
  balanceType: 'Cr' | 'Dr';
  currentBalance: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FarmerSchema = new Schema<IFarmer>(
  {
    code: {
      type: String,
      required: [true, 'Farmer code is required'],
      uppercase: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    village: String,
    district: String,
    state: String,
    pincode: String,
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    cropTypes: {
      type: [String],
      default: [],
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    balanceType: {
      type: String,
      enum: ['Cr', 'Dr'],
      default: 'Cr',
    },
    currentBalance: {
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
FarmerSchema.index({ code: 1, createdBy: 1 }, { unique: true });
FarmerSchema.index({ name: 'text' });
FarmerSchema.index({ phone: 1 });
FarmerSchema.index({ createdBy: 1 });

const Farmer: Model<IFarmer> = mongoose.models.Farmer || mongoose.model<IFarmer>('Farmer', FarmerSchema);

export default Farmer;
