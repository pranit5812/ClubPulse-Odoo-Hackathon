import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ClubPulse Caught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/organizer/overview';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0E0F1D] flex items-center justify-center p-4">
          <div className="bg-[#17182B] border border-[#2B2E4E] rounded-3xl max-w-lg w-full p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#D9485F]/15 border border-[#D9485F]/30 text-[#D9485F] flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs text-[#8B93A7] leading-relaxed">
                An unexpected view error occurred while rendering this interface. Your data remains completely safe.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-3 rounded-xl bg-[#0E0F1D] border border-[#2B2E4E] text-left text-[11px] font-mono text-[#D9485F] overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-[#625BF6] hover:bg-[#5048E5] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-[#625BF6]/25"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="px-4 py-2.5 rounded-xl bg-[#1E2038] hover:bg-[#252848] text-[#8B93A7] hover:text-white border border-[#2B2E4E] text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Command Hub</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
