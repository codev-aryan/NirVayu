import { useEffect, useState } from "react";
import { Moon, Sun, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  currentRole: "citizen" | "authority";
}

export function ThemeToggle({ currentRole }: ThemeToggleProps) {
  useEffect(() => {
    if (currentRole === "authority") {
      document.body.setAttribute("data-theme", "authority");
    } else {
      document.body.removeAttribute("data-theme");
    }
  }, [currentRole]);

  return null; // Logic only, visual toggle happens via route changes usually
}
