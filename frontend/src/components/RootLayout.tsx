import { Outlet, ScrollRestoration } from 'react-router'

export function RootLayout() {
  return (
    <>
      {/* Every full page load shares the key "default"; key those by path so they don't restore each other's scroll. */}
      <ScrollRestoration getKey={(location) => (location.key === 'default' ? location.pathname : location.key)} />
      <Outlet />
    </>
  )
}
