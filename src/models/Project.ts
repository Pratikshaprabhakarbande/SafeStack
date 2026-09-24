import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  type: 'upload' | 'github';
  uploadPath?: string;
  originalFilename?: string;
  githubRepoUrl?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubInstallationId?: number;
  defaultBranch: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  nodeVersion?: string;
  hasPackageJson: boolean;
  hasPackageLock: boolean;
  status: 'uploaded' | 'scanning' | 'scanned' | 'fixing' | 'error';
  lastScanAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['upload', 'github'],
      required: true,
    },
    uploadPath: {
      type: String,
      trim: true,
    },
    originalFilename: {
      type: String,
      trim: true,
    },
    githubRepoUrl: {
      type: String,
      trim: true,
    },
    githubOwner: {
      type: String,
      trim: true,
    },
    githubRepo: {
      type: String,
      trim: true,
    },
    githubInstallationId: {
      type: Number,
    },
    defaultBranch: {
      type: String,
      default: 'main',
    },
    packageManager: {
      type: String,
      enum: ['npm', 'yarn', 'pnpm'],
      default: 'npm',
    },
    nodeVersion: {
      type: String,
      trim: true,
    },
    hasPackageJson: {
      type: Boolean,
      default: false,
    },
    hasPackageLock: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['uploaded', 'scanning', 'scanned', 'fixing', 'error'],
      default: 'uploaded',
    },
    lastScanAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ userId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ githubOwner: 1, githubRepo: 1 });

const Project = mongoose.model<IProject>('Project', projectSchema);

export default Project;
