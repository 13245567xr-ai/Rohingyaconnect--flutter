import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FeedErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside Feed component:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Force reload/refresh local state or trigger a window event if needed
    window.dispatchEvent(new CustomEvent('feed-retry-refresh'));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div id="feed-error-boundary" className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-slate-850 m-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6 max-w-sm">
            Something went wrong loading feed. Pull to refresh or retry.
          </p>
          <button 
            id="feed-retry-btn"
            onClick={this.handleRetry}
            className="px-6 py-2.5 bg-[#1877F2] text-white rounded-full font-semibold hover:bg-blue-600 transition shadow-sm hover:shadow-md cursor-pointer text-sm font-sans"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
