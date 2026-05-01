import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto">
      <Outlet />
    </div>
  );
}
