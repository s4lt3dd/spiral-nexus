"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileText, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
const DOC_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const DOC_MAX_BYTES = 10 * 1024 * 1024;

// NOTE on orphans: uploads happen before the listing is saved, so a user who
// abandons the form leaves objects behind. Explicit Remove/Replace deletes
// the object (below); abandoned-form and deleted-listing cleanup is a later
// admin/cron concern, acknowledged in the PR.

function ownFolderPath(userId: string, file: File): string {
  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}

// -------------------------------------------------------------------------
// Listing images: up to `max` images in the public listing-images bucket.
// Value is the array of public URLs (what the ip_assets.images column stores).
// -------------------------------------------------------------------------
export function ListingImagesField({
  values,
  onChange,
  max = 6,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - values.length;
    if (files.length > room) toast.error(`You can upload up to ${max} images.`);

    const valid = Array.from(files)
      .slice(0, room)
      .filter((file) => {
        if (!IMAGE_TYPES.includes(file.type)) {
          toast.error(`${file.name}: use PNG, JPEG, WebP, SVG, or GIF.`);
          return false;
        }
        if (file.size > IMAGE_MAX_BYTES) {
          toast.error(`${file.name}: images must be under 5 MB.`);
          return false;
        }
        return true;
      });
    if (!valid.length) return;

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setBusy(false);
      return;
    }

    // Independent uploads run concurrently; failures surface individually.
    const results = await Promise.allSettled(
      valid.map(async (file) => {
        const path = ownFolderPath(user.id, file);
        const { error } = await supabase.storage
          .from("listing-images")
          .upload(path, file, { contentType: file.type });
        if (error) throw new Error(`${file.name}: ${error.message}`);
        return supabase.storage.from("listing-images").getPublicUrl(path).data
          .publicUrl;
      }),
    );
    const added: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") added.push(r.value);
      else toast.error(r.reason instanceof Error ? r.reason.message : "Upload failed.");
    }
    if (added.length) onChange([...values, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(url: string) {
    // Form-state only: the object is NOT deleted, because the user may cancel
    // the edit and the saved listing would then render a broken image. Public
    // image orphans are cheap; reaping them is a later admin concern.
    onChange(values.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      {values.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {values.map((url) => (
            <li
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-slate-50"
            >
              <Image
                src={url}
                alt="Listing image"
                fill
                sizes="120px"
                unoptimized
                className="object-contain p-2"
              />
              <button
                type="button"
                aria-label="Remove image"
                // Disabled while uploading: a removal mid-upload would be
                // silently undone by the stale `values` the upload captured.
                disabled={busy}
                onClick={() => removeImage(url)}
                className="absolute top-1.5 right-1.5 rounded-md bg-ink/80 p-1.5 text-slate-600 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 disabled:pointer-events-none"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {values.length < max && (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center transition-colors hover:border-brand/40 hover:bg-brand-tint/30",
            busy && "pointer-events-none opacity-60",
          )}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin text-brand-text" aria-hidden />
          ) : (
            <ImagePlus className="size-5 text-slate-400" aria-hidden />
          )}
          <span className="text-sm font-medium text-slate-600">
            {busy ? "Uploading…" : "Add images of the mark"}
          </span>
          <span className="text-xs text-slate-400">
            PNG, JPEG, WebP, SVG, or GIF · up to 5 MB · max {max}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Registration certificate: a single document in the PRIVATE listing-docs
// bucket. Value is the Storage object path (ip_assets.certificate_path);
// the detail page turns it into a short-lived signed URL server-side.
// -------------------------------------------------------------------------
export function CertificateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!DOC_TYPES.includes(file.type)) {
      toast.error("Use a PDF or an image (PNG, JPEG, WebP).");
      return;
    }
    if (file.size > DOC_MAX_BYTES) {
      toast.error("The certificate must be under 10 MB.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in.");
      setBusy(false);
      return;
    }
    try {
      const path = ownFolderPath(user.id, file);
      const { error } = await supabase.storage
        .from("listing-docs")
        .upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      onChange(path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeCertificate() {
    const old = value;
    onChange(null);
    // Delete the retracted document — a certificate the owner removed must
    // not stay downloadable by members who captured its path.
    if (old) {
      createClient()
        .storage.from("listing-docs")
        .remove([old])
        .catch(() => {});
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-slate-50/60 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2.5 text-sm text-slate-700">
          <FileText className="size-4 shrink-0 text-brand-text" aria-hidden />
          <span className="truncate font-medium">Certificate uploaded</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={removeCertificate}>
          <Trash2 className="size-4" aria-hidden />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-5 transition-colors hover:border-brand/40 hover:bg-brand-tint/30",
        busy && "pointer-events-none opacity-60",
      )}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin text-brand-text" aria-hidden />
      ) : (
        <Upload className="size-4 text-slate-400" aria-hidden />
      )}
      <span className="text-sm font-medium text-slate-600">
        {busy ? "Uploading…" : "Upload registration certificate"}
      </span>
      <span className="text-xs text-slate-400">PDF or image · up to 10 MB</span>
      <input
        ref={inputRef}
        type="file"
        accept={DOC_TYPES.join(",")}
        className="sr-only"
        disabled={busy}
        onChange={(e) => onFile(e.target.files)}
      />
    </label>
  );
}
