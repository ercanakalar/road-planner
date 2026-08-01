import React, { Component, ErrorInfo, ReactNode } from 'react';

import ScreenState from './ScreenState';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}


class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  private handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <ScreenState
          variant='error'
          title='Something went wrong'
          message={this.state.error.message}
          actionLabel='Try again'
          onAction={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
