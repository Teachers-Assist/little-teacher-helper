import { SettingsMenu } from '@/components/SettingsMenu';

// Helper pages have no settings area of their own, so provide a floating
// settings button (bottom-left) carrying the shared language switcher.
export default function HelperLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SettingsMenu variant="floating" />
    </>
  );
}
