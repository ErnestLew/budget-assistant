"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { LogOut, User, ChevronDown, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import type { User as AuthUser } from "next-auth";
import { useCurrency } from "@/hooks/use-currency";

interface HeaderProps {
  user?: AuthUser;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-secondary-200 dark:border-secondary-700 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-all"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

function CurrencySwitcher() {
  const { currency, setCurrency, isUpdating, supportedCurrencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="flex items-center gap-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 px-2.5 py-1.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:border-secondary-300 transition-all disabled:opacity-50"
      >
        <span className="text-xs text-secondary-400">$</span>
        <span>{currency}</span>
        <ChevronDown className="h-3 w-3 text-secondary-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-52 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-secondary-900 shadow-lg shadow-secondary-200/50 dark:shadow-black/30 ring-1 ring-secondary-100 dark:ring-secondary-700 py-1 z-50">
          {supportedCurrencies.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                c.code === currency
                  ? "bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-medium"
                  : "text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800"
              }`}
            >
              <span>{c.code}</span>
              <span className="text-xs text-secondary-400">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({ user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-end gap-3 border-b border-secondary-100 dark:border-secondary-800 bg-white/80 dark:bg-secondary-950/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
      <ThemeToggle />
      <CurrencySwitcher />

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-all"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {user?.image ? (
            <Image
              src={user.image}
              alt={user.name || "User"}
              width={32}
              height={32}
              className="rounded-lg"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          <span className="hidden lg:block text-sm font-medium text-secondary-700 dark:text-secondary-300">
            {user?.name || "User"}
          </span>
          <ChevronDown className="hidden lg:block h-4 w-4 text-secondary-400" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-secondary-900 shadow-lg shadow-secondary-200/50 dark:shadow-black/30 ring-1 ring-secondary-100 dark:ring-secondary-700 py-1 animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                {user?.name}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate mt-0.5">
                {user?.email}
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-600 dark:text-secondary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800 hover:text-secondary-900 dark:hover:text-secondary-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
