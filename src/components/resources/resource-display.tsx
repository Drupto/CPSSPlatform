import { FileText, Video, ExternalLink, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Shared display helpers for course resources (study materials incl.
 * flashcards). Used by both the admin management page and the student
 * dashboard so type rendering stays consistent in one place.
 */

export function getResourceIcon(type: string) {
  switch (type) {
    case "document":
      return <FileText className="h-5 w-5" />;
    case "video":
      return <Video className="h-5 w-5" />;
    case "link":
      return <ExternalLink className="h-5 w-5" />;
    case "flashcard":
      return <CreditCard className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

export function getResourceTypeBadge(type: string) {
  switch (type) {
    case "document":
      return <Badge variant="secondary">Document</Badge>;
    case "video":
      return <Badge variant="secondary">Video</Badge>;
    case "link":
      return <Badge variant="secondary">Link</Badge>;
    case "flashcard":
      return <Badge variant="secondary">Flashcard</Badge>;
    default:
      return <Badge variant="secondary">Resource</Badge>;
  }
}
