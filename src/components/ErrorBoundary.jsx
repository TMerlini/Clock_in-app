import { Component } from 'react';
import { AlertCircle } from 'lucide-react';
import './ErrorBoundary.css';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const isChunkLoadError = this.state.error?.message?.includes('Failed to fetch dynamically imported module');
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertCircle className="error-icon" size={48} />
            <h2>{isChunkLoadError ? 'Update available' : 'Something went wrong'}</h2>
            <p>
              {isChunkLoadError
                ? 'A new version is available. Please refresh the page to continue.'
                : 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            <button
              onClick={isChunkLoadError ? () => window.location.reload() : this.handleReset}
              className="error-reset-button"
            >
              {isChunkLoadError ? 'Refresh page' : 'Try Again'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
