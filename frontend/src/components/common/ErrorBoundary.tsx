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
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-6 rounded-xl text-sm font-mono shadow-xs">
          <h3 className="font-bold text-rose-800 text-base mb-1">Visualization Module Error</h3>
          <p className="text-sm text-rose-700 mb-4">{this.props.fallbackMessage || this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
