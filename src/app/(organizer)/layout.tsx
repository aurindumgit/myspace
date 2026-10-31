import { AppShell } from "@/components/app-shell";
import { OrganizerStoreProvider } from "@/components/organizer-store";

export default function OrganizerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OrganizerStoreProvider>
      <AppShell>{children}</AppShell>
    </OrganizerStoreProvider>
  );
}
