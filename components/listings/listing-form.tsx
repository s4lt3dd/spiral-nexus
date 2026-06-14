"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  listingSchema,
  type ListingInput,
  type ListingValues,
} from "@/lib/validation/listing";
import { TRADEMARK_STATUSES, DEAL_TYPES } from "@/lib/listings";
import { createListing, updateListing } from "@/app/(app)/listings/actions";
import type { IpAsset } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function ListingForm({ listing }: { listing?: IpAsset }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(listing);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ListingInput, unknown, ListingValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      jurisdiction: listing?.jurisdiction ?? "",
      registration_number: listing?.registration_number ?? "",
      status: listing?.status ?? "",
      nice_class: listing?.nice_class ?? "",
      deal_type: listing?.deal_type ?? "license",
      asking_price: listing?.asking_price ?? "",
      mark_image_url: listing?.mark_image_url ?? "",
      is_published: listing?.is_published ?? false,
    },
  });

  function onSubmit(publish: boolean) {
    return handleSubmit(async (values) => {
      setSubmitting(true);
      const payload = { ...values, is_published: publish };
      const result = isEdit
        ? await updateListing(listing!.id, payload)
        : await createListing(payload);
      setSubmitting(false);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isEdit
          ? "Listing updated."
          : publish
            ? "Listing published."
            : "Draft saved.",
      );
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form className="space-y-6">
      <fieldset
        className="space-y-5 rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8"
        disabled={submitting}
      >
        <div className="space-y-2">
          <Label htmlFor="title">Trademark name</Label>
          <Input
            id="title"
            placeholder="e.g. NIMBUS"
            aria-invalid={!!errors.title}
            {...register("title")}
          />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="What the mark covers, the brand story, why you're licensing or selling it."
            {...register("description")}
          />
          <FieldError message={errors.description?.message} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Input
              id="jurisdiction"
              placeholder="e.g. United Kingdom"
              {...register("jurisdiction")}
            />
            <FieldError message={errors.jurisdiction?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_number">Registration number</Label>
            <Input
              id="registration_number"
              placeholder="e.g. UK00003456789"
              {...register("registration_number")}
            />
            <FieldError message={errors.registration_number?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={(field.value as string) || ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADEMARK_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.status?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nice_class">Nice class (1–45)</Label>
            <Input
              id="nice_class"
              type="number"
              min={1}
              max={45}
              placeholder="e.g. 25"
              {...register("nice_class")}
            />
            <FieldError message={errors.nice_class?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal_type">Deal type</Label>
            <Controller
              control={control}
              name="deal_type"
              render={({ field }) => (
                <Select
                  value={(field.value as string) || "license"}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="deal_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.deal_type?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asking_price">Asking price (£)</Label>
            <Input
              id="asking_price"
              type="number"
              min={0}
              step="any"
              placeholder="Optional"
              {...register("asking_price")}
            />
            <FieldError message={errors.asking_price?.message} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mark_image_url">Mark image URL</Label>
          <Input
            id="mark_image_url"
            type="url"
            placeholder="https://… (optional — file upload comes later)"
            {...register("mark_image_url")}
          />
          <FieldError message={errors.mark_image_url?.message} />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSubmit(true)} disabled={submitting}>
          {isEdit ? "Save & publish" : "Publish listing"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSubmit(false)}
          disabled={submitting}
        >
          Save as draft
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
