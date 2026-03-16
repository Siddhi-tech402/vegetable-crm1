import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBillItem {
  vegetableId: mongoose.Types.ObjectId;
  vegetableName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface IBuyer {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  customerCode: string;
  items: IBillItem[];
  subtotal: number;
  commission: number;
  commissionAmount: number;
  marketFee: number;
  marketFeeAmount: number;
  hamali: number;
  totalDeductions: number;
  netAmount: number;
}

export interface ISalesBill extends Document {
  _id: mongoose.Types.ObjectId;
  billNumber: string;
  billDate: Date;
  farmerId: mongoose.Types.ObjectId;
  farmerName: string;
  farmerCode: string;
  buyers: IBuyer[];
  totalSaleAmount: number;
  totalCommission: number;
  totalMarketFee: number;
  totalHamali: number;
  totalDeductions: number;
  netPayableToFarmer: number;
  financialYear: string;
  status: 'draft' | 'confirmed' | 'settled' | 'cancelled' | 'pending' | 'partial';
  paidAmount: number;
  pendingAmount: number;
  balanceAmount: number;
  totals?: {
    totalQty: number;
    grossAmount: number;
    totalCommission: number;
    totalHamali: number;
    totalMarketFee: number;
    totalDeductions: number;
    netPayable: number;
  };
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillItemSchema = new Schema<IBillItem>(
  {
    vegetableId: {
      type: Schema.Types.ObjectId,
      ref: 'Vegetable',
    },
    vegetableName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const BuyerSchema = new Schema<IBuyer>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: {
      type: String,
      required: true,
    },
    customerCode: {
      type: String,
      required: true,
    },
    items: [BillItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    commission: {
      type: Number,
      default: 0,
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    marketFee: {
      type: Number,
      default: 0,
    },
    marketFeeAmount: {
      type: Number,
      default: 0,
    },
    hamali: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const SalesBillSchema = new Schema<ISalesBill>(
  {
    billNumber: {
      type: String,
      required: [true, 'Bill number is required'],
      uppercase: true,
    },
    billDate: {
      type: Date,
      required: [true, 'Bill date is required'],
      default: Date.now,
    },
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
    },
    farmerName: {
      type: String,
      required: true,
    },
    farmerCode: {
      type: String,
      required: true,
    },
    buyers: {
      type: [BuyerSchema],
      required: true,
      validate: [(val: IBuyer[]) => val.length > 0, 'At least one buyer is required'],
    },
    totalSaleAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCommission: {
      type: Number,
      default: 0,
    },
    totalMarketFee: {
      type: Number,
      default: 0,
    },
    totalHamali: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netPayableToFarmer: {
      type: Number,
      required: true,
      default: 0,
    },
    financialYear: {
      type: String,
      required: [true, 'Financial year is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'settled', 'cancelled', 'pending', 'partial'],
      default: 'confirmed',
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    totals: {
      type: Schema.Types.Mixed,
    },
    remarks: String,
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

SalesBillSchema.index({ billNumber: 1, createdBy: 1 }, { unique: true });
SalesBillSchema.index({ billDate: -1 });
SalesBillSchema.index({ farmerId: 1 });
SalesBillSchema.index({ financialYear: 1 });
SalesBillSchema.index({ status: 1 });

// Pre-save hook to calculate pending amount
SalesBillSchema.pre('save', function (next) {
  this.pendingAmount = this.netPayableToFarmer - this.paidAmount;
  next();
});

const SalesBill: Model<ISalesBill> = mongoose.models.SalesBill || mongoose.model<ISalesBill>('SalesBill', SalesBillSchema);

export default SalesBill;
