import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  voucherNumber: string;
  voucherDate: Date;
  type: 'receipt' | 'payment';
  // For receipts (from customers)
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerCode?: string;
  // For payments (to farmers)
  farmerId?: mongoose.Types.ObjectId;
  farmerName?: string;
  farmerCode?: string;
  // Bill-wise settlement
  billId?: mongoose.Types.ObjectId;
  billNumber?: string;
  amount: number;
  paymentMode: 'cash' | 'bank' | 'upi' | 'cheque';
  chequeNumber?: string;
  chequeDate?: Date;
  bankName?: string;
  upiReference?: string;
  kasar: number; // Discount/adjustment
  netAmount: number;
  narration?: string;
  settlements?: {
    billNumber: string;
    billDate: any;
    billAmount: number;
    settlingAmount: number;
  }[];
  financialYear: string;
  status: 'confirmed' | 'cancelled';
  createdBy: mongoose.Types.ObjectId;
  syncStatus: 'synced' | 'pending' | 'conflict';
  localId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    voucherNumber: {
      type: String,
      required: [true, 'Voucher number is required'],
      uppercase: true,
    },
    voucherDate: {
      type: Date,
      required: [true, 'Voucher date is required'],
      default: Date.now,
    },
    type: {
      type: String,
      enum: ['receipt', 'payment'],
      required: [true, 'Payment type is required'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: String,
    customerCode: String,
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'Farmer',
    },
    farmerName: String,
    farmerCode: String,
    billId: {
      type: Schema.Types.ObjectId,
      ref: 'SalesBill',
    },
    billNumber: String,
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'bank', 'upi', 'cheque', 'Cash', 'Bank Transfer', 'UPI', 'Cheque'],
      default: 'cash',
    },
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    upiReference: String,
    kasar: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    narration: String,
    settlements: [{
      billNumber: String,
      billDate: Schema.Types.Mixed,
      billAmount: Number,
      settlingAmount: Number,
    }],
    financialYear: {
      type: String,
      required: [true, 'Financial year is required'],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
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

PaymentSchema.index({ voucherNumber: 1, createdBy: 1 }, { unique: true });
PaymentSchema.index({ voucherDate: -1 });
PaymentSchema.index({ type: 1 });
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ farmerId: 1 });
PaymentSchema.index({ financialYear: 1 });
PaymentSchema.index({ billId: 1 });

// Pre-save hook to calculate net amount
PaymentSchema.pre('save', function (next) {
  this.netAmount = this.amount - this.kasar;
  next();
});

const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
