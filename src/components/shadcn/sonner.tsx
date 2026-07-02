"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--nb-base)",
          "--normal-text": "var(--nb-text)",
          "--normal-border": "var(--nb-ink)",
          "--border-radius": "0px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !rounded-none !border-4 !border-[var(--nb-ink)] !bg-[var(--nb-base)] !text-[var(--nb-text)] !shadow-[6px_6px_0_0_var(--nb-ink)]",
          title: "!font-black uppercase !text-current",
          description: "!font-bold !text-current/80",
          success: "!bg-[var(--nb-green)] !text-[var(--nb-button-text)]",
          error: "!bg-[var(--nb-red)] !text-[var(--nb-button-text)]",
          info: "!bg-[var(--nb-blue)] !text-[var(--nb-button-text)]",
          warning: "!bg-[var(--nb-yellow)] !text-[var(--nb-button-text)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
