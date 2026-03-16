import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVegetable extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  localName?: string;
  category: string;
  unit: 'kg' | 'dozen' | 'piece' | 'bundle';
  defaultPrice?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VegetableSchema = new Schema<IVegetable>(
  {
    code: {
      type: String,
      required: [true, 'Vegetable code is required'],
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    localName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Leafy', 'Root', 'Fruit', 'Flower', 'Stem', 'Bulb', 'Other'],
      default: 'Other',
    },
    unit: {
      type: String,
      enum: ['kg', 'dozen', 'piece', 'bundle'],
      default: 'kg',
    },
    defaultPrice: {
      type: Number,
      min: 0,
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
VegetableSchema.index({ code: 1, createdBy: 1 }, { unique: true });
VegetableSchema.index({ name: 'text', localName: 'text' });
VegetableSchema.index({ category: 1 });
VegetableSchema.index({ createdBy: 1 });

const Vegetable: Model<IVegetable> = mongoose.models.Vegetable || mongoose.model<IVegetable>('Vegetable', VegetableSchema);

export default Vegetable;
