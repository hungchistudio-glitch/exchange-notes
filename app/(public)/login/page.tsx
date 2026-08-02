import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-5 py-8 text-black">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-black">
          English × 繁體中文
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-black">
          Exchange Notes
        </h1>

        <p className="mt-3 leading-7 text-neutral-700">
          Learn languages naturally through real conversations and everyday
          life.
        </p>

        <div className="mt-8">
          <GoogleLoginButton />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-neutral-500">
          By continuing, you agree to securely sign in with your Google
          account.
        </p>
      </section>
    </main>
  );
}