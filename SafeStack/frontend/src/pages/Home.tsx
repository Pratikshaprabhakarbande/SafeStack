import { Link } from 'react-router-dom';
import { Shield, Lock, CheckCircle, Github, Upload, Search } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary-600" />
              <span className="text-2xl font-bold text-secondary-900">SafeStack</span>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-secondary-900 mb-6">
            Secure Your Software Supply Chain
          </h1>
          <p className="text-xl text-secondary-600 mb-8">
            SafeStack helps developers find, understand, and safely fix vulnerable dependencies
            in Node.js projects — without ever touching your main branch.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 transition shadow-lg"
          >
            Start Security Scan
            <Search className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How SafeStack Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Detect Vulnerabilities</h3>
            <p className="text-secondary-600">
              Scan your Node.js projects for security vulnerabilities using npm audit and OSV database.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Explanations</h3>
            <p className="text-secondary-600">
              Get clear, beginner-friendly explanations of each vulnerability using AI.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Safe Automated Fixes</h3>
            <p className="text-secondary-600">
              Create fixes in isolated branches. You always have final control over merging.
            </p>
          </div>
        </div>
      </section>

      {/* Safety Guarantee */}
      <section className="container py-16">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 max-w-3xl mx-auto">
          <div className="flex items-start space-x-4">
            <Lock className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-bold text-green-900 mb-2">
                Your Code is Safe
              </h3>
              <p className="text-green-800">
                <strong>SafeStack NEVER directly modifies your main/master/production branch.</strong>
                {' '}All automated fixes happen in isolated SafeStack branches. You review the changes
                and decide whether to merge them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Options */}
      <section className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Get Started in Seconds</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-md border-2 border-secondary-200 hover:border-primary-400 transition">
            <Github className="w-12 h-12 text-secondary-700 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Connect GitHub</h3>
            <p className="text-secondary-600 mb-4">
              Connect your GitHub repository and let SafeStack scan your project for vulnerabilities.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-6 py-3 bg-secondary-900 text-white rounded-lg hover:bg-secondary-800 transition"
            >
              Connect Repository
            </Link>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md border-2 border-secondary-200 hover:border-primary-400 transition">
            <Upload className="w-12 h-12 text-secondary-700 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Upload Project</h3>
            <p className="text-secondary-600 mb-4">
              Upload a ZIP file of your Node.js project and start scanning immediately.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-6 py-3 bg-secondary-900 text-white rounded-lg hover:bg-secondary-800 transition"
            >
              Upload ZIP
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-8 mt-20">
        <div className="container text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="w-6 h-6" />
            <span className="text-xl font-bold">SafeStack</span>
          </div>
          <p className="text-secondary-400">
            Software Supply Chain Security Platform
          </p>
          <p className="text-secondary-500 text-sm mt-2">
            © 2026 SafeStack. Phase 1 Foundation.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
