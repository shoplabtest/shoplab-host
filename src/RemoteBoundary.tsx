import { Component, Suspense, type ReactNode } from 'react';

class Boundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">{this.props.name} is unavailable right now.</p> : this.props.children;
  }
}

/** Wraps a lazily loaded remote so a missing or crashing remote never takes the shell down. */
export function RemoteBoundary({ name, children }: { name: string; children: ReactNode }) {
  return (
    <Boundary name={name}>
      <Suspense fallback={<p>Loading {name}…</p>}>{children}</Suspense>
    </Boundary>
  );
}
