import { DEFAULT_CURRENCY, Toast } from '@shoplab/ui-kit';
import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.tsx';
import { onCartUpdated } from './bus.ts';
import { RemoteBoundary } from './RemoteBoundary.tsx';
import { AccountPage, CartPage, CatalogPage } from './remotes.ts';

export function App() {
  const { user, logout } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => onCartUpdated(({ quantity }) => setCartCount(quantity)), []);
  const onAddToCart = useCallback((productId: string) => setNotice(`Added ${productId} to your cart`), []);

  return (
    <>
      <header>
        <nav>
          <Link to="/">Shop</Link> <Link to="/cart">Cart ({cartCount})</Link>{' '}
          {user ? <button onClick={() => void logout()}>Log out</button> : <Link to="/account">Log in</Link>}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<RemoteBoundary name="Catalog"><CatalogPage onAddToCart={onAddToCart} currency={DEFAULT_CURRENCY} /></RemoteBoundary>} />
          <Route path="/cart" element={<RemoteBoundary name="Cart"><CartPage /></RemoteBoundary>} />
          <Route path="/account/*" element={<RemoteBoundary name="Account"><AccountPage /></RemoteBoundary>} />
        </Routes>
      </main>
      {notice && <Toast kind="success" message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
