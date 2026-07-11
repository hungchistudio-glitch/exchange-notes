import AuthGuard from "@/app/components/auth/AuthGuard";
import BottomNav from "@/app/components/navigation/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {children}
      <BottomNav />
    </AuthGuard>
  );
}
