import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger';

export class GeminiService {
  private static genAI: GoogleGenerativeAI | null = null;
  private static isConfigured = false;

  static initialize() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey.trim() === '') {
      logger.warn('Gemini API key not configured — using deterministic verified security explanations');
      this.isConfigured = false;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.isConfigured = true;
      logger.info('Gemini AI service initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize Gemini AI', { error: error.message });
      this.isConfigured = false;
    }
  }

  static async generateExplanation(
    packageName: string,
    currentVersion: string,
    title: string,
    description: string,
    severity: string,
    recommendedVersion?: string
  ): Promise<string> {
    const safeRecommended = recommendedVersion || 'latest safe version';

    if (!this.isConfigured || !this.genAI) {
      return this.generatePlaceholderExplanation(
        packageName,
        currentVersion,
        title,
        description,
        severity,
        safeRecommended
      );
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are SafeStack AI, an expert software supply-chain cybersecurity assistant. Explain this security vulnerability to a developer in a clear, professional, and student-friendly format.

Package: ${packageName}
Current Version: ${currentVersion}
Recommended Version: ${safeRecommended}
Vulnerability Title: ${title}
Description: ${description}
Severity: ${severity.toUpperCase()}

Please provide a response using EXACTLY this Markdown format:

🔴 What happened?
[Explain in 2 simple sentences what the vulnerability is]

🧠 Why it matters
[Explain the security impact and risk, such as prototype pollution, command execution, or denial of service]

📦 Affected package
\`${packageName}@${currentVersion}\`

🎯 Recommended version
\`${packageName}@${safeRecommended}\`

🛠 SafeStack recommendation
[Explain how updating the dependency resolves the issue]

🧪 What SafeStack will test
[Explain that package compatibility and automated tests will be executed in a Docker sandbox]

🔐 Safety guarantee
SafeStack executes this fix inside an isolated workspace branch (\`safestack/security-fix-...\`) and will never directly modify your main/production branch. You maintain full ownership over reviewing and merging the pull request.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text && text.trim().length > 50) {
        logger.info('Generated live Gemini AI explanation', { packageName, length: text.length });
        return text;
      }
      return this.generatePlaceholderExplanation(
        packageName,
        currentVersion,
        title,
        description,
        severity,
        safeRecommended
      );
    } catch (error: any) {
      logger.error('Gemini API call failed — falling back to deterministic explanation', {
        packageName,
        error: error.message,
      });
      return this.generatePlaceholderExplanation(
        packageName,
        currentVersion,
        title,
        description,
        severity,
        safeRecommended
      );
    }
  }

  private static generatePlaceholderExplanation(
    packageName: string,
    currentVersion: string,
    title: string,
    description: string,
    severity: string,
    recommendedVersion: string
  ): string {
    return `🔴 What happened?
The package \`${packageName}\` (version \`${currentVersion}\`) contains a known **${severity.toUpperCase()}** severity flaw: "${title}".

🧠 Why it matters
${description || 'Unpatched dependency vulnerabilities can allow unauthorized code execution, prototype pollution, or service disruption in production environments.'}

📦 Affected package
\`${packageName}@${currentVersion}\`

🎯 Recommended version
\`${packageName}@${recommendedVersion}\`

🛠 SafeStack recommendation
Upgrade \`${packageName}\` from version \`${currentVersion}\` to \`${recommendedVersion}\` to apply the vendor security patch.

🧪 What SafeStack will test
SafeStack will regenerate package lockfiles, execute dependency tree analysis, and run automated unit tests in an isolated sandbox.

🔐 Safety guarantee
SafeStack executes this fix inside an isolated workspace branch (\`safestack/security-fix-...\`) and will never directly modify your main/production branch. You maintain full ownership over reviewing and merging the pull request.`;
  }

  static isAvailable(): boolean {
    return this.isConfigured;
  }
}

// Initialize on module load
GeminiService.initialize();
