import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFix extends Document {
  projectId: Types.ObjectId;
  vulnerabilityId: Types.ObjectId;
  branchName: string;
  baseBranch: string;
  workingDir?: string;
  status:
    | 'queued'
    | 'creating_branch'
    | 'updating_deps'
    | 'testing'
    | 'compatibility_issue'
    | 'retrying'
    | 'completed'
    | 'reverted'
    | 'failed'
    | 'unsafe_downgrade'
    | 'manual_review_required';
  versionValidation?: {
    isValid: boolean;
    isDowngrade: boolean;
    currentVersion: string;
    recommendedVersion: string;
    reason: string;
    registryVerified: boolean;
    advisoryFixedVersion?: string;
    vulnerableRange?: string;
  };
  packagesBefore?: any;
  packagesAfter?: any;
  updatedPackages: Array<{
    name: string;
    fromVersion: string;
    toVersion: string;
  }>;
  diff?: string;
  testsRun: boolean;
  testsPassed?: boolean;
  testOutput?: string;
  hasCompatibilityIssue: boolean;
  compatibilityIssues: string[];
  resolutionAttempted: boolean;
  resolutionSuccessful?: boolean;
  reScanResult?: any;
  pullRequestId?: Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fixSchema = new Schema<IFix>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    vulnerabilityId: { type: Schema.Types.ObjectId, ref: 'Vulnerability', required: true },
    branchName: { type: String, required: true },
    baseBranch: { type: String, required: true },
    workingDir: String,
    status: {
      type: String,
      enum: [
        'queued',
        'creating_branch',
        'updating_deps',
        'testing',
        'compatibility_issue',
        'retrying',
        'completed',
        'reverted',
        'failed',
        'unsafe_downgrade',
        'manual_review_required',
      ],
      default: 'queued',
    },
    versionValidation: Schema.Types.Mixed,
    packagesBefore: Schema.Types.Mixed,
    packagesAfter: Schema.Types.Mixed,
    updatedPackages: [
      {
        name: String,
        fromVersion: String,
        toVersion: String,
      },
    ],
    diff: String,
    testsRun: { type: Boolean, default: false },
    testsPassed: Boolean,
    testOutput: String,
    hasCompatibilityIssue: { type: Boolean, default: false },
    compatibilityIssues: [String],
    resolutionAttempted: { type: Boolean, default: false },
    resolutionSuccessful: Boolean,
    reScanResult: Schema.Types.Mixed,
    pullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest' },
    startedAt: Date,
    completedAt: Date,
    errorMessage: String,
  },
  { timestamps: true }
);

fixSchema.index({ projectId: 1 });
fixSchema.index({ vulnerabilityId: 1 });
fixSchema.index({ status: 1 });
fixSchema.index({ createdAt: -1 });

export default mongoose.model<IFix>('Fix', fixSchema);
