import { Component, ErrorInfo, ReactNode } from 'react';

import i18n from 'i18n';
import ScreenState from 'components/ui/ScreenState';

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
          // A class component, because that is what catches a render error —
          // so the translator is reached through the instance rather than a
          // hook, which cannot be called from here.
          title={i18n.t('common.somethingWentWrong')}
          message={this.state.error.message}
          actionLabel={i18n.t('actions.tryAgain')}
          onAction={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
