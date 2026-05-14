import { Bebas_Neue } from "next/font/google";

import { LoginForm } from "@/components/forms/login-form";

const fontDisplay = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

export default function LoginPage() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-5xl rounded-[36px] border border-border/70 bg-white/80 p-6 soft-shadow md:p-10">
        <div className="flex flex-col items-center text-center">
          <img
            alt="Logo Rumah Jengkar"
            className="h-[100px] w-[100px] object-contain"
            height={100}
            src="/rumah-jengkar-logo.png"
            width={100}
          />
          <h1
            className={`${fontDisplay.className} mt-6 text-5xl uppercase leading-none tracking-[0.03em] text-foreground md:text-7xl`}
          >
            Saling Jaga Saling Ridho
          </h1>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
