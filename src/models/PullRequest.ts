import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPullRequest extends Document {
  fixId: Types.ObjectId;
  projectId: Types.ObjectId;
  githubPrNumber?: number;
  githubPrUrl?: string;
  githubIntegrationConfigured: boolean;
  githubPrError?: string;
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  status: 'draft' | 'open' | 'merged' | 'closed' | 'error';
  mergedAt?: Date;
  closedAt?: Date;
  mergedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pullRequestSchema = new Schema<IPullRequest>(
  {
    fixId: { type: Schema.Types.ObjectId, ref: 'Fix', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    githubPrNumber: Number,
    githubPrUrl: String,
    githubIntegrationConfigured: { type: Boolean, default: false },
    githubPrError: String,
    title: { type: String, required: true },
    body: { type: String, required: true },
    baseBranch: { type: String, required: true },
    headBranch: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'open', 'merged', 'closed', 'error'],
      default: 'draft'
    },
    mergedAt: Date,
    closedAt: Date,
    mergedBy: String,
  },
  { timestamps: true }
);

pullRequestSchema.index({ fixId: 1 });
pullRequestSchema.index({ projectId: 1 });
pullRequestSchema.index({ githubPrNumber: 1 });
pullRequestSchema.index({ status: 1 });

export default mongoose.model<IPullRequest>('PullRequest', pullRequestSchema);
