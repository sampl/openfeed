import React from "react";
import ErrorState from "./ErrorState";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // TODO - log the error to an error reporting service here
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorState error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
