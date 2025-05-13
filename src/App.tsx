import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import CartPage from "./pages/CartPage";
import { PageTransitionContent } from "./components/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";

// Layout component that includes the PageTransition inside the Router context
const AppLayout = () => {
  return (
    <>
      <NetworkStatus />
      <PageTransitionContent />
      <Outlet />
    </>
  );
};

// Define routes with the layout wrapper
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "menu/:merchantId", element: <MenuPage /> },
      { path: "cart", element: <CartPage /> },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SettingsProvider>
          <CartProvider>
            <div className="max-w-md mx-auto min-h-screen bg-gray-100 shadow-lg relative">
              <RouterProvider router={router} />
            </div>
          </CartProvider>
        </SettingsProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
