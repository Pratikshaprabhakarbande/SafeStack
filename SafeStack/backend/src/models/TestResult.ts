import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITestResult extends Document {
  fixId?: Types.ObjectId;
  projectId?: Types.ObjectId;
  command: string;
  executionEnvironment: 'docker' | 'host_fallback';
  passed: boolean;
  noTests: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  installationOutput?: string;
  buildOutput?: string;
  createdAt: Date;
  updatedAt: Date;
}

const testResultSchema = new Schema<ITestResult>(
  {
    fixId: { type: Schema.Types.ObjectId, ref: 'Fix', index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    command: { type: String, required: true },
    executionEnvironment: {
      type: String,
      enum: ['docker', 'host_fallback'],
      required: true,
    },
    passed: { type: Boolean, required: true },
    noTests: { type: Boolean, default: false },
    exitCode: { type: Number, required: true },
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    durationMs: { type: Number, required: true },
    totalTests: Number,
    passedTests: Number,
    failedTests: Number,
    installationOutput: String,
    buildOutput: String,
  },
  { timestamps: true }
);

export default mongoose.model<ITestResult>('TestResult', testResultSchema);
