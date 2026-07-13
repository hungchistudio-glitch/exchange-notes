import AuthGuard from "@/app/components/auth/AuthGuard";
import BottomNav from "@/app/components/navigation/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div
        style={{
          paddingBottom: "calc(88px + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
