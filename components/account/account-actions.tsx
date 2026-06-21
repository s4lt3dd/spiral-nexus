"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { exportMyData, deleteMyAccount } from "@/app/(app)/dashboard/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AccountActions() {
  const router = useRouter();
  const [exporting, startExport] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");

  function onExport() {
    startExport(async () => {
      const res = await exportMyData();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spiral-nexus-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded.");
    });
  }

  function onDelete() {
    setDeleting(true);
    deleteMyAccount(confirm).then((res) => {
      if (!res.ok) {
        setDeleting(false);
        toast.error(res.error);
        return;
      }
      // Account gone + session cleared — leave the app.
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* Export */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-display text-lg font-medium text-ink">
          Export your data
        </h2>
        <p className="mt-1 max-w-prose text-sm text-slate-600">
          Download a JSON copy of your profile, listings, conversations you take
          part in, messages you&apos;ve sent, saved listings, and follows.
        </p>
        <Button
          variant="outline"
          onClick={onExport}
          disabled={exporting}
          className="mt-4"
        >
          <Download className="size-4" aria-hidden />
          {exporting ? "Preparing…" : "Download my data"}
        </Button>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/30 bg-surface p-6 shadow-sm">
        <h2 className="font-display text-lg font-medium text-destructive">
          Delete your account
        </h2>
        <p className="mt-1 max-w-prose text-sm text-slate-600">
          Permanently deletes your account and all your data — profile, listings,
          messages, saved listings, and follows. Conversations are removed for
          the other participant too. This cannot be undone.
        </p>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" className="mt-4" />
            }
          >
            <Trash2 className="size-4" aria-hidden />
            Delete account
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and all associated data.
                This action cannot be undone. Type <strong>DELETE</strong> to
                confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className="sr-only">
                Type DELETE to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirm("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={confirm !== "DELETE" || deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
