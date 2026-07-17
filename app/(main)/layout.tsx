import AuthGuard from "@/app/components/auth/AuthGuard";
import BottomNav from "@/app/components/navigation/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-[100dvh]">{children}</div>
      <BottomNav />
    </AuthGuard>
  );
}
