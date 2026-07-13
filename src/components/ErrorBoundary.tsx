import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: string;
}

// On-device we can't open a console, so a thrown render error just blanks the webview to black.
// This paints the error (message + stack) on screen instead, so failures are diagnosable on the phone.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(_error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? '' });
  }

  override render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-full overflow-auto bg-canvas p-4 text-sm text-red-300">
        <p className="mb-2 font-semibold text-red-400">Something crashed</p>
        <pre className="whitespace-pre-wrap break-words text-xs text-red-300">{error.message}</pre>
        {error.stack && <pre className="mt-3 whitespace-pre-wrap break-words text-[10px] text-neutral-500">{error.stack}</pre>}
        {info && <pre className="mt-3 whitespace-pre-wrap break-words text-[10px] text-neutral-600">{info}</pre>}
      </div>
    );
  }
}
