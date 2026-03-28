import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { House, BookmarkSimple, Gear } from "@phosphor-icons/react";
import { ErrorBoundary, BottomNav, Toaster, type BottomNavItem } from "./ui_components";
import { Debug } from "./ui_components";
import { Header } from "./components/Header";
import { FeedPage } from "./pages/FeedPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SavedPage } from "./pages/SavedPage";
import { RunsPage } from "./pages/RunsPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SourcesPage } from "./pages/SourcesPage";
import { ConfigPage } from "./pages/ConfigPage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { UIComponentsPage } from "./pages/UIComponentsPage";
import { useLatestRun } from "./hooks/useLatestRun";

// Routes that use the bottom nav (primary destinations) — no shared header on these
const BOTTOM_NAV_ROUTES = ["/", "/saved", "/settings"];

const AppNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const latestRun = useLatestRun();
  console.log(`🧭 AppNav render — pathname=${pathname}`);

  if (!BOTTOM_NAV_ROUTES.includes(pathname)) {
    return <Header />;
  }

  const hasErrors = latestRun?.status === "error";

  const navItems: BottomNavItem[] = [
    {
      label: "Feed",
      icon: <House size={22} />,
      onClick: () => navigate("/"),
      active: pathname === "/",
    },
    {
      label: "Saved",
      icon: <BookmarkSimple size={22} />,
      onClick: () => navigate("/saved"),
      active: pathname === "/saved",
    },
    {
      label: "Settings",
      icon: <Gear size={22} />,
      onClick: () => navigate("/settings"),
      active: pathname === "/settings",
      badge: hasErrors,
    },
  ];

  return <BottomNav items={navItems} />;
};

export const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AppNav />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:id" element={<RunDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
        <Route path="/ui-components" element={<UIComponentsPage />} />
      </Routes>
      <Debug persistenceId="openfeed" />
      <Toaster />
    </BrowserRouter>
  </ErrorBoundary>
);
