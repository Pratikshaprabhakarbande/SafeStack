import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IScan extends Document {
  projectId: Types.ObjectId;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  totalDependencies: number;
  vulnerableCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  npmAuditResults?: any;
  osvResults?: any;
  errorMessage?: string;
  errorStack?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scanSchema = new Schema<IScan>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    startedAt: Date,
    completedAt: Date,
    duration: Number,
    totalDependencies: { type: Number, default: 0 },
    vulnerableCount: { type: Number, default: 0 },
    criticalCount: { type: Number, default: 0 },
    highCount: { type: Number, default: 0 },
    mediumCount: { type: Number, default: 0 },
    lowCount: { type: Number, default: 0 },
    npmAuditResults: Schema.Types.Mixed,
    osvResults: Schema.Types.Mixed,
    errorMessage: String,
    errorStack: String,
  },
  { timestamps: true }
);

scanSchema.index({ projectId: 1 });
scanSchema.index({ status: 1 });
scanSchema.index({ createdAt: -1 });

export default mongoose.model<IScan>('Scan', scanSchema);
