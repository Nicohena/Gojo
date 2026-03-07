import React, { Component } from "react";
import logger from "../utils/logger";
import { AlertCircle, Home, RotateCcw } from "lucide-react";

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 * Restyled for luxury dark/gold theme.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("Error caught by boundary", error, {
      componentStack: errorInfo.componentStack,
    });
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6" style={{ backgroundImage: "radial-gradient(circle at center, #111 0%, #0a0a0a 100%)" }}>
          <div className="max-w-xl w-full bg-[#111] border border-[#d4af37]/10 rounded-2xl shadow-2xl p-10 text-center animate-in fade-in zoom-in duration-700">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 mb-8">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>

            <h2 className="text-3xl text-[#f8f6f3] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              System Interruption
            </h2>
            <p className="text-[#9a9a9a] mb-8 leading-relaxed max-w-sm mx-auto">
              Our secure protocols encountered an unexpected anomaly. The target component could not be resolved.
            </p>

            {import.meta.env.MODE === "development" && this.state.error && (
              <div className="mb-10 p-5 bg-[#0a0a0a] border border-red-500/20 rounded-xl text-left overflow-hidden">
                <p className="text-xs font-mono text-red-400 mb-3 break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-[10px] font-mono text-[#9a9a9a] mt-3 border-t border-white/5 pt-3">
                    <summary className="cursor-pointer text-[#d4af37] font-bold uppercase tracking-widest mb-2">
                      Trace Diagnostics
                    </summary>
                    <pre className="mt-2 overflow-auto max-h-40 whitespace-pre-wrap opacity-60">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-8 py-3 bg-[#d4af37] text-[#0a0a0a] text-xs font-bold uppercase tracking-widest hover:bg-[#b8941f] transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Re-establish Session
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-8 py-3 bg-transparent border border-[#d4af37]/20 text-[#d4af37] text-xs font-bold uppercase tracking-widest hover:bg-[#d4af37]/5 transition-all flex items-center justify-center gap-2"
              >
                <Home size={14} /> Return to Hub
              </button>
            </div>

            <p className="text-[10px] text-[#9a9a9a]/40 mt-10 uppercase tracking-[0.2em] font-bold">
              Secure Estate Management Systems • v3.0
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
