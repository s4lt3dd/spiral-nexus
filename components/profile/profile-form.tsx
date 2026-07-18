"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { PublicProfile } from "@/lib/types";
import {
  PROFILE_ROLES,
  SECTORS,
  JURISDICTIONS,
  COUNTRIES,
  NICE_CLASSES,
  type ProfileRole,
} from "@/lib/profile";
import { updateProfile } from "@/app/(app)/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChipMultiSelect } from "@/components/profile/chip-multi-select";
import { TypeaheadMultiSelect } from "@/components/ui/typeahead-multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  display_name: string;
  headline: string;
  org_name: string;
  location: string;
  country: string;
  avatar_url: string;
  website: string;
  linkedin_url: string;
  bio: string;
  role_flags: ProfileRole[];
  sectors: string[];
  jurisdictions: string[];
  nice_class_interests: number[];
};

function initialState(p: PublicProfile): FormState {
  return {
    display_name: p.display_name ?? "",
    headline: p.headline ?? "",
    org_name: p.org_name ?? "",
    location: p.location ?? "",
    country: p.country ?? "",
    avatar_url: p.avatar_url ?? "",
    website: p.website ?? "",
    linkedin_url: p.linkedin_url ?? "",
    bio: p.bio ?? "",
    role_flags: (p.role_flags as ProfileRole[]) ?? [],
    sectors: p.sectors ?? [],
    jurisdictions: p.jurisdictions ?? [],
    nice_class_interests: p.nice_class_interests ?? [],
  };
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

const sectorOptions = SECTORS.map((s) => ({ value: s, label: s }));
const jurisdictionOptions = JURISDICTIONS.map((j) => ({ value: j, label: j }));

export function ProfileForm({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => initialState(profile));
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  // A name is required for every member (matches the server schema).
  const nameOk = state.display_name.trim().length > 0;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfile(state);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {/* Identity */}
      <section className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display_name">
              Name <span className="text-brand-text">*</span>
            </Label>
            <Input
              id="display_name"
              value={state.display_name}
              onChange={(e) => set("display_name", e.target.value)}
              placeholder="Jane Doe"
              maxLength={80}
              aria-required
            />
            {!nameOk && (
              <p className="text-xs text-slate-500">
                Required — every member needs a name.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_name">Organisation</Label>
            <Input
              id="org_name"
              value={state.org_name}
              onChange={(e) => set("org_name", e.target.value)}
              placeholder="Acme Brands Ltd"
              maxLength={120}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={state.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Trademark portfolio owner & licensor"
            maxLength={140}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={state.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="London, UK"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              items={COUNTRIES.map((c) => ({ value: c, label: c }))}
              value={state.country || null}
              onValueChange={(v) => set("country", v ?? "")}
            >
              <SelectTrigger id="country" className="w-full">
                <SelectValue placeholder="Where you're based" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Not specified</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar_url">Profile photo URL</Label>
          <Input
            id="avatar_url"
            type="url"
            value={state.avatar_url}
            onChange={(e) => set("avatar_url", e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={state.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="A few lines about you, your portfolio, and what you're looking for."
            rows={4}
            maxLength={1000}
          />
        </div>
      </section>

      {/* Intent */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-medium text-foreground">
            What brings you here?
          </h2>
          <p className="text-sm text-slate-500">Pick all that apply.</p>
        </div>
        <ChipMultiSelect
          options={PROFILE_ROLES.map((r) => ({ value: r.value, label: r.label }))}
          selected={state.role_flags}
          onToggle={(v) => set("role_flags", toggle(state.role_flags, v))}
        />
      </section>

      {/* Sectors */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-medium text-foreground">Sectors</h2>
          <p className="text-sm text-slate-500">
            The industries you focus on.
          </p>
        </div>
        <TypeaheadMultiSelect
          options={sectorOptions}
          values={state.sectors}
          onChange={(v) => set("sectors", v)}
          placeholder="Search sectors…"
        />
      </section>

      {/* Jurisdictions */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-medium text-foreground">
            Jurisdictions
          </h2>
          <p className="text-sm text-slate-500">
            Where your interests lie.
          </p>
        </div>
        <TypeaheadMultiSelect
          options={jurisdictionOptions}
          values={state.jurisdictions}
          onChange={(v) => set("jurisdictions", v)}
          placeholder="Search jurisdictions…"
        />
      </section>

      {/* Nice classes */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-medium text-foreground">
            Nice classes of interest
          </h2>
          <p className="text-sm text-slate-500">
            The trademark classes you care about.
          </p>
        </div>
        <TypeaheadMultiSelect
          options={NICE_CLASSES.map((c) => ({
            value: c.value,
            label: `${c.value} · ${c.label}`,
          }))}
          values={state.nice_class_interests}
          onChange={(v) => set("nice_class_interests", v)}
          placeholder="Search classes…"
        />
      </section>

      {/* Links */}
      <section className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={state.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn</Label>
          <Input
            id="linkedin_url"
            type="url"
            value={state.linkedin_url}
            onChange={(e) => set("linkedin_url", e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={pending || !nameOk}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => router.push("/dashboard")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
