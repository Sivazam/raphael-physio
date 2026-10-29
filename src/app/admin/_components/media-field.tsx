"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Link2, Loader2, Trash2, Upload, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * MediaField — the shared admin control for every image/video field in the
 * CMS. Two ways to set a value, side by side:
 *
 *   1. Paste a link (YouTube URL, any hosted image/video URL).
 *   2. Upload a file — POSTed to /api/admin/upload, which stores it in
 *      Firebase Storage when configured (FIREBASE_* in .env) or on the
 *      server's local disk as a development fallback.
 *
 * Shows a live preview for images and a link chip for videos; value can be
 * cleared entirely (saves as null).
 */

export function MediaField({
  id,
  label,
  kind,
  folder,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  kind: "image" | "video";
  folder: "exercises" | "team" | "services" | "stories";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = kind === "image";

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      body.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json()) as {
        ok?: boolean;
        url?: string;
        note?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed — please try again.");
      }
      onChange(data.url);
      toast.success(`Uploaded ${file.name}`, {
        description: data.note,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed — please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {isImage ? "JPEG/PNG/WebP · ≤ 10 MB" : "MP4/WebM/MOV · ≤ 64 MB"}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={id}
            value={value}
            onChange={(e) => {
              setError(null);
              onChange(e.target.value);
            }}
            placeholder={
              placeholder ??
              (isImage
                ? "https://… or upload below"
                : "https://… link, or upload below")
            }
            className="pl-9"
            aria-invalid={Boolean(error)}
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={
            isImage ? "image/jpeg,image/png,image/webp,image/gif,image/avif" : "video/mp4,video/webm,video/quicktime,video/x-matroska,video/ogg"
          }
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : isImage ? (
            <Upload className="size-4" aria-hidden="true" />
          ) : (
            <Video className="size-4" aria-hidden="true" />
          )}
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Clear ${label.toLowerCase()}`}
            title="Clear"
            onClick={() => onChange("")}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {/* preview */}
      {value ? (
        isImage ? (
          <div className="mt-1 flex items-start gap-3">
            <img
              src={value}
              alt=""
              className="h-20 w-28 shrink-0 rounded-lg border border-border object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
              }}
            />
            <p className="mt-1 break-all text-xs text-muted-foreground">
              {value}
            </p>
          </div>
        ) : (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-2 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-clay-deep hover:border-clay/60"
          >
            <Video className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{value}</span>
          </a>
        )
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {hint ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {hint}
        </p>
      ) : null}
    </div>
  );
}
