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
          "--normal-bg": "var(--evil-color-surface)",
          "--normal-text": "var(--evil-color-text)",
          "--normal-border": "var(--evil-color-border)",
          "--border-radius": "0px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !rounded-control !border-2 !border-border !bg-background !text-foreground !shadow-card",
          title: "!font-extrabold uppercase !text-current",
          description: "!font-bold !text-current/80",
          success: "!bg-success !text-success-foreground",
          error: "!bg-error !text-error-foreground",
          info: "!bg-info !text-info-foreground",
          warning: "!bg-warning !text-warning-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
