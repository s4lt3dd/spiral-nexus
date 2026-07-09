"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  listingSchema,
  type ListingInput,
  type ListingValues,
} from "@/lib/validation/listing";
import { TRADEMARK_STATUSES, DEAL_TYPES, CURRENCIES } from "@/lib/listings";
import { createListing, updateListing } from "@/app/(app)/listings/actions";
import type { IpAsset } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NiceClassMultiSelect } from "@/components/listings/nice-class-multi-select";
import { ChipsInput } from "@/components/ui/chips-input";
import {
  ListingImagesField,
  CertificateField,
} from "@/components/listings/upload-fields";
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

// Form sections keep the expanded data set scannable: a premium listing form,
// not a wall of inputs. Each section is a card-like fieldset with a heading.
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

const RENEWAL_OPTIONS = [
  { value: "unspecified", label: "Not specified" },
  { value: "yes", label: "Open to renewal" },
  { value: "no", label: "Not open to renewal" },
] as const;

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
      nice_classes: listing?.nice_classes ?? [],
      deal_type: listing?.deal_type ?? "license",
      asking_price: listing?.asking_price ?? "",
      currency: listing?.currency ?? "GBP",
      office_url: listing?.office_url ?? "",
      territory: listing?.territory ?? [],
      filing_date: listing?.filing_date ?? "",
      license_duration: listing?.license_duration ?? "",
      license_renewable: listing?.license_renewable ?? null,
      encumbrances: listing?.encumbrances ?? "",
      quality_control: listing?.quality_control ?? "",
      certificate_path: listing?.certificate_path ?? "",
      images: listing?.images ?? [],
      is_published: listing?.is_published ?? false,
    },
  });

  // License terms only make sense when the deal includes a license.
  const dealType = useWatch({ control, name: "deal_type" });
  const showLicenseTerms = dealType !== "sale";

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
      <fieldset className="space-y-6" disabled={submitting}>
        <Section title="The trademark">
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

          <div className="space-y-2">
            <Label htmlFor="nice_classes">Nice classes</Label>
            <Controller
              control={control}
              name="nice_classes"
              render={({ field }) => (
                <NiceClassMultiSelect
                  id="nice_classes"
                  values={(field.value as number[]) ?? []}
                  onChange={field.onChange}
                  ariaInvalid={!!errors.nice_classes}
                />
              )}
            />
            <FieldError message={errors.nice_classes?.message} />
          </div>
        </Section>

        <Section
          title="Registration"
          hint="Where and when the mark is registered, and where the rights apply."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Registration office</Label>
              <Input
                id="jurisdiction"
                placeholder="e.g. UKIPO — United Kingdom"
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
              <Label htmlFor="filing_date">Filing date</Label>
              <Input id="filing_date" type="date" {...register("filing_date")} />
              <FieldError message={errors.filing_date?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="office_url">Link to the official record</Label>
            <Input
              id="office_url"
              type="url"
              placeholder="https://… (the mark's page at the registration office)"
              {...register("office_url")}
            />
            <FieldError message={errors.office_url?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="territory">Territory</Label>
            <Controller
              control={control}
              name="territory"
              render={({ field }) => (
                <ChipsInput
                  id="territory"
                  values={(field.value as string[]) ?? []}
                  onChange={field.onChange}
                  placeholder="Type a country and press Enter — e.g. United Kingdom"
                  ariaInvalid={!!errors.territory}
                />
              )}
            />
            <p className="text-xs text-slate-400">
              The countries where the trademark rights apply.
            </p>
            <FieldError message={errors.territory?.message} />
          </div>

          <div className="space-y-2">
            <Label>Registration certificate</Label>
            <Controller
              control={control}
              name="certificate_path"
              render={({ field }) => (
                <CertificateField
                  value={(field.value as string) || null}
                  onChange={(p) => field.onChange(p ?? "")}
                />
              )}
            />
            <p className="text-xs text-slate-400">
              The official Trade Mark Registration Certificate. Visible to
              signed-in members viewing your listing.
            </p>
            <FieldError message={errors.certificate_path?.message} />
          </div>
        </Section>

        <Section title="The deal">
          <div className="grid gap-5 sm:grid-cols-2">
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
              <Label htmlFor="asking_price">Asking price</Label>
              <div className="flex gap-2">
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select
                      value={(field.value as string) || "GBP"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="currency"
                        aria-label="Currency"
                        className="w-28 shrink-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  id="asking_price"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Optional"
                  className="flex-1"
                  {...register("asking_price")}
                />
              </div>
              <FieldError
                message={
                  errors.asking_price?.message ?? errors.currency?.message
                }
              />
            </div>
          </div>

          {showLicenseTerms && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="license_duration">License duration</Label>
                <Input
                  id="license_duration"
                  placeholder="e.g. 5 years"
                  {...register("license_duration")}
                />
                <p className="text-xs text-slate-400">
                  How long you&apos;re willing to license the mark for.
                </p>
                <FieldError message={errors.license_duration?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_renewable">Renewal</Label>
                <Controller
                  control={control}
                  name="license_renewable"
                  render={({ field }) => (
                    <Select
                      value={
                        field.value === true
                          ? "yes"
                          : field.value === false
                            ? "no"
                            : "unspecified"
                      }
                      onValueChange={(v) =>
                        field.onChange(v === "yes" ? true : v === "no" ? false : null)
                      }
                    >
                      <SelectTrigger id="license_renewable" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RENEWAL_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.license_renewable?.message} />
              </div>
            </div>
          )}
        </Section>

        <Section
          title="Images"
          hint="Show the mark itself — a wordmark, logo, or product shots."
        >
          <Controller
            control={control}
            name="images"
            render={({ field }) => (
              <ListingImagesField
                values={(field.value as string[]) ?? []}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError message={errors.images?.message} />
        </Section>

        <Section
          title="Additional details"
          hint="Optional — anything a serious counterparty should know upfront."
        >
          <div className="space-y-2">
            <Label htmlFor="encumbrances">Encumbrances or restrictions</Label>
            <Textarea
              id="encumbrances"
              rows={3}
              placeholder="e.g. existing licenses, coexistence agreements, security interests, territorial carve-outs."
              {...register("encumbrances")}
            />
            <FieldError message={errors.encumbrances?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quality_control">Quality &amp; control</Label>
            <Textarea
              id="quality_control"
              rows={3}
              placeholder="e.g. quality standards, approval rights, or brand-use requirements you'd expect in a license."
              {...register("quality_control")}
            />
            <FieldError message={errors.quality_control?.message} />
          </div>
        </Section>
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
