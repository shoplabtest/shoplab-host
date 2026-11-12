declare module 'catalog/Page' {
  import type { ComponentType } from 'react';
  import type { Currency } from '@shoplab/ui-kit';
  const Page: ComponentType<{ onAddToCart: (productId: string) => void; currency: Currency }>;
  export default Page;
}
declare module 'cart/Cart' {
  import type { ComponentType } from 'react';
  const Cart: ComponentType<Record<string, never>>;
  export default Cart;
}
declare module 'checkout/Checkout' {
  import type { ComponentType } from 'react';
  const Checkout: ComponentType<Record<string, never>>;
  export default Checkout;
}
declare module 'account/Account' {
  import type { ComponentType } from 'react';
  const Account: ComponentType<Record<string, never>>;
  export default Account;
}
