"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(!!currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(false);
      setMobileMenuOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navLinks = [
    { name: "Course", href: "#course" },
    { name: "Curriculum", href: "#curriculum" },
    { name: "Instructor", href: "#instructor" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm px-6 py-4"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          CSCS<span className="text-primary">ProPass</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={`/${link.href}`}
              className="text-sm font-medium hover:text-primary transition-colors text-slate-600"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Button variant="ghost" className="text-sm font-medium">
            Free Study Guide
          </Button>
          {!loading && (
            user ? (
              <>
                <Button 
                  className="rounded-full px-6 font-semibold"
                  onClick={() => router.push("/dashboard")}
                >
                  My Dashboard
                </Button>
                <Button 
                  variant="outline"
                  className="text-sm font-medium"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                className="rounded-full px-6 font-semibold"
                onClick={() => router.push("/auth")}
              >
                Enroll Now
              </Button>
            )
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-slate-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b p-6 space-y-4 flex flex-col items-center animate-in slide-in-from-top-4">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={`/${link.href}`}
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-slate-700"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 space-y-3 w-full max-w-xs flex flex-col">
            <Button variant="outline" className="w-full">
              Free Study Guide
            </Button>
            {!loading && (
              user ? (
                <>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push("/dashboard");
                    }}
                  >
                    My Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/auth");
                  }}
                >
                  Enroll Now
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
