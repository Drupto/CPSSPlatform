import { User } from "firebase/auth";
import { getUserProfile } from "@/lib/course";
import { UserProfile } from "@/lib/types";

/**
 * Checks if a user's profile is complete
 * A profile is considered complete if the user has a displayName
 */
export async function isProfileComplete(user: User | null): Promise<boolean> {
  if (!user) return false;
  
  try {
    const profile = await getUserProfile(user.uid);
    return !!profile?.displayName;
  } catch (error) {
    console.error("Error checking profile completion:", error);
    return false;
  }
}