import { Component, type ReactNode } from 'react';

/**
 * If a screen crashes, show a short message with a way home instead of a white page.
 * `resetKey` (the current screen) clears the error when the player moves on.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; title: string; body: string; home: string; onHome: () => void },
  { error: Error | null; key: string }
> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: Error | null; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error) {
    console.error('Screen crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen crash-screen">
        <div className="crash-card glass">
          <h1 className="title">{this.props.title}</h1>
          <p className="caption">{this.props.body}</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            ↻
          </button>
          <button className="btn glass" onClick={this.props.onHome}>
            {this.props.home}
          </button>
        </div>
      </div>
    );
  }
}
