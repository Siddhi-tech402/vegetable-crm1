import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  module: string;
  documentId?: mongoose.Types.ObjectId;
  documentType?: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  financialYear: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'login', 'logout'],
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
    },
    documentType: String,
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    previousData: {
      type: Schema.Types.Mixed,
    },
    newData: {
      type: Schema.Types.Mixed,
    },
    ipAddress: String,
    userAgent: String,
    financialYear: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ financialYear: 1 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
