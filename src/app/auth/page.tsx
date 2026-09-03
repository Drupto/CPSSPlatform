"use client";


import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, AuthError } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile } from "@/lib/course";

/**
 * Client-side password policy enforced at signup (Firebase's own default is
 * only 6 characters). Server-side enforcement would additionally require
 * Firebase Identity Platform password policy config — tracked as follow-up.
 */
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  return null;
}

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);
    
    try {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        try {
          await createUserProfile(userCredential.user);
        } catch (profileError) {
          console.error("Error creating user profile:", profileError);
          setError(`Account created but profile setup failed: ${profileError instanceof Error ? profileError.message : "Unknown error"}`);
          setIsLoading(false);
          return;
        }
        await sendEmailVerification(userCredential.user);
      }
      setMessage(
        `A verification email has been sent to ${email}. Please verify your email before signing in.`
      );
    } catch (err) {
      const firebaseError = err as AuthError;
      setError(firebaseError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user.emailVerified) {
        router.push("/dashboard");
      } else {
        await sendEmailVerification(userCredential.user);
        setMessage(
          "You must verify your email before accessing the dashboard. A verification email has been resent."
        );
      }
    } catch (err) {
      const firebaseError = err as AuthError;
      setError(firebaseError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold tracking-tight inline-block">
            KINÉTIKA
          </Link>
          <p className="text-slate-600 mt-2">Join thousands of certified professionals</p>
        </div>

        <Tabs 
          defaultValue="signup" 
          className="w-full"
          onValueChange={() => {
            setError("");
            setEmail("");
            setPassword("");
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="signin">Sign In</TabsTrigger>
          </TabsList>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-4 p-3 bg-emerald-100 border border-emerald-400 text-emerald-700 rounded-md text-sm">
              {message}
            </div>
          )}

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500">
                  At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
              <p className="text-sm text-slate-600 text-center">
                By signing up, you agree to our{" "}
                <Link href="/terms-of-service" className="text-primary hover:underline">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="signin" className="space-y-4 mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-sm"
                disabled={isLoading}
                onClick={async () => {
                  if (!email.trim()) {
                    setError("Please enter your email address first.");
                    return;
                  }
                  setError("");
                  setMessage("");
                  setIsLoading(true);
                  try {
                    await sendPasswordResetEmail(auth, email.trim());
                    setMessage("Password reset email sent. Check your inbox.");
                  } catch (err) {
                    const firebaseError = err as AuthError;
                    setError(firebaseError.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Forgot your password?
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
