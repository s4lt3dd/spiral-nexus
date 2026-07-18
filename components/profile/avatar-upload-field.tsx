"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Trash2, Upload, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

// Native profile-photo control (replaces the old URL text field):
//   • Upload photo — file picker (accept="image/*": library on mobile, files
//     on desktop).
//   • Take photo — opens the live camera in-page via getUserMedia, snaps a
//     square frame — the way native web apps do it (works on desktop too, not
//     just a mobile capture attribute).
// Both paths upload to the public avatars bucket and store the URL.
//
// NOTE: the object is uploaded immediately (before the form saves), so an
// abandoned edit can orphan an avatar. Cheap for public images; reaping is a
// later admin concern, same as listing images.
export function AvatarUploadField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOpen(false);
  }, []);

  // Attach the stream once the video element is on screen.
  useEffect(() => {
    if (camOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [camOpen]);

  // Always release the camera if the component unmounts mid-capture.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  // Close the camera view on Escape.
  useEffect(() => {
    if (!camOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCamera();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [camOpen, closeCamera]);

  async function uploadBlob(blob: Blob, contentType: string, ext: string) {
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
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    onChange(
      supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl,
    );
    setBusy(false);
  }

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error("That file isn't a supported image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That image is too large — please pick one under 2 MB.");
      return;
    }
    const ext =
      file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";
    await uploadBlob(file, file.type, ext);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Your browser doesn't support in-page camera capture.");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setCamOpen(true);
    } catch {
      toast.error("Couldn't open the camera — check your browser permissions.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Square centre-crop so it fills the round avatar cleanly.
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size,
    );
    closeCamera();
    canvas.toBlob(
      (blob) => {
        if (blob) void uploadBlob(blob, "image/jpeg", "jpg");
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised text-slate-400">
        {value ? (
          <Image
            src={value}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="size-full object-cover"
          />
        ) : (
          <UserRound className="size-9" strokeWidth={1.75} aria-hidden />
        )}
      </span>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {value ? "Change photo" : "Upload photo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={openCamera}
        >
          <Camera className="size-4" aria-hidden />
          Take photo
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onChange(null)}
            className="text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => onFile(e.target.files)}
        />
      </div>

      {camOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeCamera}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-medium text-foreground">
                Take a photo
              </p>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="mt-3 aspect-square w-full overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="size-full object-cover"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeCamera}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={capture} disabled={busy}>
                <Camera className="size-4" aria-hidden />
                Capture
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
