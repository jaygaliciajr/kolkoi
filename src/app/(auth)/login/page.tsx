"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { focusRing, inputBase, transitionFast } from "@/lib/ui/tokens";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function BrandMark() {
  return (
    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 text-white shadow-[0_14px_28px_-14px_rgba(99,102,241,0.65)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8c3.5 0 4.7-3 8-3s4.5 3 8 3" />
        <path d="M4 16c3.5 0 4.7-3 8-3s4.5 3 8 3" />
      </svg>
    </div>
  );
}

const highlights = [
  "Realtime campaign and creator visibility",
  "Approval, proof, and payout workflows in one place",
  "Role-based operations with clean audit trails",
];

function validateEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
  return null;
}

function validatePassword(value: string) {
  if (!value.trim()) return "Password is required.";
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailError = useMemo(() => {
    if (!emailTouched) return null;
    return validateEmail(email);
  }, [email, emailTouched]);

  const passwordError = useMemo(() => {
    if (!passwordTouched) return null;
    return validatePassword(password);
  }, [password, passwordTouched]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    if (nextEmailError || nextPasswordError) {
      setEmailTouched(true);
      setPasswordTouched(true);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg text-text">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80 dark:hidden"
        animate={prefersReducedMotion ? undefined : { backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 24, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0) 45%), radial-gradient(circle at 82% 12%, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0) 42%), linear-gradient(140deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.94) 52%, rgba(248,250,252,0.98) 100%)",
          backgroundSize: "150% 150%",
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-90 dark:block"
        animate={prefersReducedMotion ? undefined : { backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 26, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(99,102,241,0.24) 0%, rgba(99,102,241,0) 48%), radial-gradient(circle at 86% 10%, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0) 44%), linear-gradient(140deg, rgba(2,6,23,0.98) 0%, rgba(15,23,42,0.96) 52%, rgba(2,6,23,0.98) 100%)",
          backgroundSize: "150% 150%",
        }}
      />

      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:42px_42px] dark:block" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-400/20"
        animate={prefersReducedMotion ? undefined : { y: [0, -16, 0], x: [0, 12, 0] }}
        transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl dark:bg-cyan-400/20"
        animate={prefersReducedMotion ? undefined : { y: [0, 14, 0], x: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-3 flex justify-end sm:mb-0">
          <ThemeToggle compact className="h-10 w-10 px-0 sm:h-10 sm:w-auto sm:px-3" />
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center">
          <div className="grid w-full items-stretch gap-8 lg:grid-cols-2 lg:gap-12">
            <section className="relative hidden overflow-hidden rounded-[28px] border border-border/60 bg-gradient-to-br from-white/35 via-white/15 to-white/5 p-10 shadow-[var(--shadow-elevated)] backdrop-blur-xl lg:flex lg:flex-col lg:justify-between dark:from-slate-900/50 dark:via-slate-900/35 dark:to-slate-900/20">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <BrandMark />
                  <div>
                    <p className="text-sm font-semibold tracking-[0.2em] text-muted">KOLKOI</p>
                    <p className="text-sm text-muted">Influencer Operations Platform</p>
                  </div>
                </div>
                <h2 className="max-w-xl text-4xl font-semibold leading-tight text-text">
                  Run creator campaigns with a faster, cleaner, enterprise-grade workflow.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
                  Centralize campaign execution, approvals, proof verification, and payments in one premium command center.
                </p>
              </div>

              <ul className="space-y-3">
                {highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/55 px-4 py-3 text-sm text-text backdrop-blur-sm"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 dark:bg-emerald-400/20 dark:text-emerald-300">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                        <path d="M6.3 11.2 3.7 8.6l-1 1 3.6 3.6L13.3 6l-1-1z" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl"
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.1, 1] }}
                transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            </section>

            <section className="flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.12 : 0.24, ease: "easeOut" }}
                className="relative w-full max-w-md"
              >
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-[24px] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-sky-500/20 blur-2xl" />

                <div className="rounded-[22px] border border-border/70 bg-surface/78 p-6 shadow-[var(--shadow-elevated)] backdrop-blur-xl sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <BrandMark />
                    <div>
                      <p className="text-sm font-semibold tracking-wide text-text">Welcome back</p>
                      <p className="text-xs text-muted">Sign in to continue</p>
                    </div>
                  </div>

                  <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-text">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        aria-invalid={Boolean(emailError)}
                        aria-describedby={emailError ? "email-error" : undefined}
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={email}
                        onBlur={() => setEmailTouched(true)}
                        onChange={(event) => setEmail(event.target.value)}
                        className={cx(
                          inputBase,
                          focusRing,
                          transitionFast,
                          "min-h-11 bg-white/60 px-3.5 dark:bg-slate-900/55",
                          emailError && "border-rose-400/80 focus-visible:ring-rose-500/35",
                        )}
                      />
                      <div className="min-h-5">
                        {emailError ? (
                          <p id="email-error" className="text-xs text-rose-600 dark:text-rose-300">
                            {emailError}
                          </p>
                        ) : (
                          <p className="text-xs text-muted">Use your registered account email.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password" className="text-sm font-medium text-text">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          aria-invalid={Boolean(passwordError)}
                          aria-describedby={passwordError ? "password-error" : undefined}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={password}
                          onBlur={() => setPasswordTouched(true)}
                          onChange={(event) => setPassword(event.target.value)}
                          className={cx(
                            inputBase,
                            focusRing,
                            transitionFast,
                            "min-h-11 bg-white/60 px-3.5 pr-11 dark:bg-slate-900/55",
                            passwordError && "border-rose-400/80 focus-visible:ring-rose-500/35",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className={cx(
                            "absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted",
                            "hover:bg-surface-2 hover:text-text",
                            transitionFast,
                            focusRing,
                          )}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M3 3l18 18" />
                              <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                              <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c5.2 0 9.3 3.4 10.8 8-1 3-3.2 5.4-6 6.8" />
                              <path d="M6.2 6.2C4 7.7 2.3 10 1.3 12c1.5 4.6 5.6 8 10.8 8 1 0 2-.1 2.9-.4" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M1.5 12s4-8 10.5-8 10.5 8 10.5 8-4 8-10.5 8S1.5 12 1.5 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="min-h-5">
                        {passwordError ? (
                          <p id="password-error" className="text-xs text-rose-600 dark:text-rose-300">
                            {passwordError}
                          </p>
                        ) : (
                          <p className="text-xs text-muted">Minimum 8+ characters recommended.</p>
                        )}
                      </div>
                    </div>

                    {errorMessage ? (
                      <p className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                        {errorMessage}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      loading={isLoading}
                      disabled={Boolean(emailError) || Boolean(passwordError)}
                      className="mt-1 min-h-12 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 text-sm font-semibold text-white shadow-[0_14px_26px_-14px_rgba(79,70,229,0.7)] hover:shadow-[0_22px_34px_-18px_rgba(79,70,229,0.76)]"
                    >
                      {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>

                  <div className="mt-5 flex items-center justify-between text-sm">
                    <a
                      href="mailto:support@kolkoi.local?subject=Password%20Reset%20Request"
                      className="text-muted hover:text-text"
                    >
                      Forgot password?
                    </a>
                    <a href="mailto:support@kolkoi.local" className="text-muted hover:text-text">
                      Contact support
                    </a>
                  </div>

                  <p className="mt-4 text-center text-sm text-muted">
                    No account yet?{" "}
                    <Link href="/register" className="font-semibold text-primary hover:underline">
                      Create one
                    </Link>
                  </p>
                </div>
              </motion.div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
