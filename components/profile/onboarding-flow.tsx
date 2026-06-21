"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import {
  PROFILE_ROLES,
  SECTORS,
  JURISDICTIONS,
  NICE_CLASSES,
  type ProfileRole,
} from "@/lib/profile";
import {
  completeOnboarding,
  skipOnboarding,
} from "@/app/(app)/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChipMultiSelect } from "@/components/profile/chip-multi-select";
import { NexusMark } from "@/components/brand/nexus-mark";

type FormState = {
  display_name: string;
  headline: string;
  org_name: string;
  location: string;
  avatar_url: string;
  website: string;
  linkedin_url: string;
  bio: string;
  role_flags: ProfileRole[];
  sectors: string[];
  jurisdictions: string[];
  nice_class_interests: number[];
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

const STEPS = [
  { title: "About you", blurb: "Tell members who you are." },
  { title: "Your focus", blurb: "What brings you to Spiral Nexus." },
  { title: "A little more", blurb: "Round out your profile (optional)." },
];

const sectorOptions = SECTORS.map((s) => ({ value: s, label: s }));
const jurisdictionOptions = JURISDICTIONS.map((j) => ({ value: j, label: j }));

export function OnboardingFlow({
  initial,
}: {
  initial: Partial<FormState>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({
    display_name: initial.display_name ?? "",
    headline: initial.headline ?? "",
    org_name: initial.org_name ?? "",
    location: initial.location ?? "",
    avatar_url: initial.avatar_url ?? "",
    website: initial.website ?? "",
    linkedin_url: initial.linkedin_url ?? "",
    bio: initial.bio ?? "",
    role_flags: initial.role_flags ?? [],
    sectors: initial.sectors ?? [],
    jurisdictions: initial.jurisdictions ?? [],
    nice_class_interests: initial.nice_class_interests ?? [],
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function finish() {
    startTransition(async () => {
      const result = await completeOnboarding(state);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Welcome to Spiral Nexus.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  function skip() {
    startTransition(async () => {
      const result = await skipOnboarding();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const last = step === STEPS.length - 1;
  const percent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="animate-rise w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-md sm:p-8">
      {/* Brand + progress */}
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-[image:var(--gradient-brand)] shadow-sm">
          <NexusMark className="size-5 text-white" />
        </span>
        <span className="font-display text-lg font-medium tracking-[-0.02em] text-ink">
          Spiral Nexus
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-slate-400">{STEPS[step].title}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[image:var(--gradient-brand)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-7">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {STEPS[step].title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{STEPS[step].blurb}</p>
      </div>

      {/* Step content */}
      <div className="mt-6 space-y-6">
        {step === 0 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="display_name">Name</Label>
              <Input
                id="display_name"
                value={state.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="Jane Doe"
                maxLength={80}
                autoFocus
              />
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
                <Label htmlFor="org_name">Organisation</Label>
                <Input
                  id="org_name"
                  value={state.org_name}
                  onChange={(e) => set("org_name", e.target.value)}
                  placeholder="Acme Brands Ltd"
                  maxLength={120}
                />
              </div>
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
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-3">
              <Label>What brings you here? (pick all that apply)</Label>
              <ChipMultiSelect
                options={PROFILE_ROLES.map((r) => ({
                  value: r.value,
                  label: r.label,
                }))}
                selected={state.role_flags}
                onToggle={(v) => set("role_flags", toggle(state.role_flags, v))}
              />
            </div>
            <div className="space-y-3">
              <Label>Sectors you focus on</Label>
              <ChipMultiSelect
                options={sectorOptions}
                selected={state.sectors}
                onToggle={(v) => set("sectors", toggle(state.sectors, v))}
              />
            </div>
            <div className="space-y-3">
              <Label>Jurisdictions of interest</Label>
              <ChipMultiSelect
                options={jurisdictionOptions}
                selected={state.jurisdictions}
                onToggle={(v) =>
                  set("jurisdictions", toggle(state.jurisdictions, v))
                }
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
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
            <div className="space-y-3">
              <Label>Nice classes of interest (optional)</Label>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-border p-3">
                <ChipMultiSelect
                  options={NICE_CLASSES.map((c) => ({
                    value: c.value,
                    label: `${c.value} · ${c.label}`,
                  }))}
                  selected={state.nice_class_interests}
                  onToggle={(v) =>
                    set(
                      "nice_class_interests",
                      toggle(state.nice_class_interests, v),
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
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
            </div>
          </>
        )}
      </div>

      {/* Footer controls */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={pending}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={skip}
            disabled={pending}
          >
            Skip for now
          </Button>
          {last ? (
            <Button type="button" onClick={finish} disabled={pending}>
              <Check className="size-4" aria-hidden />
              {pending ? "Finishing…" : "Finish"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={pending}
            >
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
