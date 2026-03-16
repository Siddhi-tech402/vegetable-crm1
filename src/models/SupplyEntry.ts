import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplyEntry extends Document {
  _id: mongoose.Types.ObjectId;
  entryDate: Date;
  farmerId: mongoose.Types.ObjectId;
  farmerName: string;
  farmerCode: string;
  vegetableId: mongoose.Types.ObjectId;
  vegetableName: string;
  quantity: number;
  unit: string;
  expectedPrice: number;
  expectedAmount: number;
  status: 'pending' | 'sold' | 'partial' | 'returned';
  soldQuantity: number;
  remarks?: string;
  financialYear: string;
  createdBy: mongoose.Types.ObjectId;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplyEntrySchema = new Schema<ISupplyEntry>(
  {
    entryDate: {
      type: Date,
      required: [true, 'Entry date is required'],
      default: Date.now,
    },
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
      required: [true, 'Farmer is required'],
    },
    farmerName: {
      type: String,
      required: true,
    },
    farmerCode: {
      type: String,
      required: true,
    },
    vegetableId: {
      type: Schema.Types.ObjectId,
      ref: 'Vegetable',
      required: [true, 'Vegetable is required'],
    },
    vegetableName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      default: 'kg',
    },
    expectedPrice: {
      type: Number,
      required: [true, 'Expected price is required'],
      min: 0,
    },
    expectedAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'sold', 'partial', 'returned'],
      default: 'pending',
    },
    soldQuantity: {
      type: Number,
      default: 0,
    },
    remarks: String,
    financialYear: {
      type: String,
      required: [true, 'Financial year is required'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

SupplyEntrySchema.index({ entryDate: -1 });
SupplyEntrySchema.index({ farmerId: 1 });
SupplyEntrySchema.index({ status: 1 });
SupplyEntrySchema.index({ financialYear: 1 });

// Pre-save hook to calculate expected amount
SupplyEntrySchema.pre('save', function (next) {
  this.expectedAmount = this.quantity * this.expectedPrice;
  next();
});

const SupplyEntry: Model<ISupplyEntry> = mongoose.models.SupplyEntry || mongoose.model<ISupplyEntry>('SupplyEntry', SupplyEntrySchema);

export default SupplyEntry;
