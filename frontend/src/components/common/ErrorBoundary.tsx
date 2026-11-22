import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-rose-950/60 border border-rose-800/80 text-rose-200 p-6 rounded-lg text-sm dark-panel font-mono">
          <h3 className="font-semibold text-rose-300 mb-1">Visualization Module Error</h3>
          <p className="text-xs text-rose-300 mb-3">{this.props.fallbackMessage || this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition-colors"
          >
            Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
