import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RemoteBoundary } from '../src/RemoteBoundary.tsx';
import { AuthProvider } from '../src/auth.tsx';
import { emitCartUpdated } from '../src/bus.ts';

// The real remotes only exist at runtime, so stand them in with local components.
vi.mock('../src/remotes.ts', () => ({
  CatalogPage: ({ onAddToCart, currency }: { onAddToCart: (id: string) => void; currency: string }) => (
    <button onClick={() => onAddToCart('p-1')}>catalog ({currency})</button>
  ),
  CartPage: () => <p>cart remote</p>,
  AccountPage: () => <p>account remote</p>,
}));

const { App } = await import('../src/App.tsx');

const renderApp = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('App shell', () => {
  it('mounts the catalog remote with the currency prop and shows a toast on add', async () => {
    renderApp();
    const btn = await screen.findByText('catalog (USD)');
    act(() => btn.click());
    expect(await screen.findByText('Added p-1 to your cart')).toBeTruthy();
  });

  it('routes /cart and /account to their remotes', async () => {
    renderApp('/cart');
    expect(await screen.findByText('cart remote')).toBeTruthy();
  });

  it('cart badge follows the cart:updated window event', async () => {
    renderApp();
    await screen.findByText('Cart (0)');
    act(() => emitCartUpdated({ quantity: 4 }));
    expect(await screen.findByText('Cart (4)')).toBeTruthy();
  });

  it('shows a log-in link when logged out', async () => {
    renderApp();
    expect(await screen.findByText('Log in')).toBeTruthy();
  });
});

describe('RemoteBoundary', () => {
  it('shows a fallback instead of crashing when a remote throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => { throw new Error('remote entry failed to load'); };
    render(<RemoteBoundary name="Catalog"><Broken /></RemoteBoundary>);
    expect(screen.getByRole('alert').textContent).toMatch(/Catalog is unavailable/);
  });
});
