# Spiral Nexus — Landscape, Problem & Opportunity

*A strategy briefing for turning the build into a business. Prepared 23 July 2026.*

---

## How to read this

You asked for four things: an honest picture of the landscape you're building into, the exact problem you're solving, where the real complexity lives, and where the large-scale user growth could come from — all in service of one question: **what do I pin­point to make this a real business, not a side project?**

I've read the repo (spec, roadmap, marketing copy, compliance docs) and researched the market and every competitor I could find. The short version up front, then the detail:

> **Spiral Nexus is, at heart, a liquidity engine for dormant brand assets.** The thing you're really building is not "a website where you list trademarks" — it's the *missing secondary market* for intangible assets that today only move through lawyers, brokers, and luck. The trademark-first MVP is the wedge. The business is price discovery, trust, and matching in a market that economists have described as structurally broken for decades. That framing is what turns it from a listings site into a company.

The single most important fact in this whole document: **almost every attempt to build an IP marketplace has died of the same disease — plenty of sellers, no buyers.** IPXI, IPwe, and even Denmark's government-run IP Marketplace all failed or shut for exactly this reason. Your entire strategic bet rests on one claim: *trademarks behave more like a liquid market than patents do.* I think that claim is defensible, and most of the creative angles below are really different ways of *manufacturing the demand side* so you don't repeat that history. Hold that thought — it's the spine of everything here.

---

## 1. What you've actually built so far

It's worth naming the asset clearly, because it's further along than "side project" implies.

You have a working two-sided product with the core loop closed end-to-end: **an owner lists a trademark → a buyer discovers it via browse/search/filter → the buyer contacts the owner through 1:1 messaging.** On top of that you've built auth (passwordless magic-link), user profiles with a "profile-as-home" identity layer, a member directory ("the simplest version of LinkedIn"), an IP-office redirect (deep-links out to USPTO/UKIPO/EUIPO/WIPO search), light social (save listings, follow users), and the legal/compliance scaffolding (privacy, terms, subprocessors, data inventory, admin MFA). The stack is deliberately lean and ownable — Next.js + Supabase + Stripe + Vercel — with real discipline around row-level security and tier-gating enforced server-side.

Strategically, three decisions you've already made are the right ones and worth defending:

- **Trademarks first, not patents.** This is the difference between a viable market and the patent graveyard (Section 5 explains why in depth).
- **"Introductions, not transactions" for v1.** You connect the two parties; they close the deal themselves. This keeps you out of contract law, escrow, and regulatory heaviness while you prove demand.
- **Free, invite-only pre-launch to collect Letters of Intent.** You understood the cold-start problem instinctively — a marketplace is worthless empty, so you're seeding sign-ups before switching on paywalls.

The current positioning — *"Don't let intellectual property sit unused"* / *"Where dormant IP finds its next owner"* — is genuinely good. It names a real problem in one line. The rest of this document is about whether that problem is big enough, who else is chasing it, and how to make it enormous.

---

## 2. The landscape: is the problem real and big?

Yes, and the numbers are on your side. Three facts anchor the whole opportunity.

**Intangible assets have quietly become the economy.** Intangibles now make up roughly **90% of the S&P 500's market value** (Ocean Tomo's long-running study; the 2025 figure is ~92% intangible / 8% tangible), up from 17% in 1975. In the UK, intangibles account for nearly **13% of GDP** yet WIPO describes them as "largely under-measured." We have built an economy whose primary assets have no functioning secondary market. That sentence is your entire business thesis.

**The volume of the specific asset you're starting with is huge.** Globally there were **15.2 million trademark applications in 2023** and roughly **88.2 million active registered trademarks** in force. In your beachhead market, the **UKIPO took 163,726 applications in 2023** (roughly double the 2017 level), with UK-based applicants filing 85,845 of them. This is not a niche of a niche — it's a mass asset class.

**And a large share of it sits idle.** For patents, the European Commission estimates **10–50% of portfolios go unused**, and Bocconi's large-scale inventor survey found big firms leave nearly *half* their patents unused, roughly split between "strategic" (deliberately withheld) and genuinely "dormant" (idle for no reason). For trademarks there's no clean global "% dormant" figure — an honest data gap — but the structural pressure is real and I'll return to it in Section 4, because one regulatory rule turns idle trademarks into *depreciating, deadline-bound* assets.

Why does all this value sit still? The economics literature on "markets for technology" (Arora/Fosfuri/Gambardella; the NBER "Deals Not Done" work) has documented for 20+ years that markets for intangibles are structurally thin and inefficient, for reasons that map exactly onto what you're building against: **there is no central venue** (deals happen ad hoc through brokers and lawyers), **search and discovery are expensive** (a buyer can't cheaply find who owns a dormant-but-perfect mark), **valuation is hard** (no comparables, no standard pricing — the UK government literally calls this a "market failure"), **information is asymmetric** (a seller can't fully reveal a thing's value without giving it away — "Arrow's disclosure paradox"), and **transaction friction dwarfs the deal** (the legal cost of assigning one £8,000 mark can exceed the mark's price, so the deal simply never happens).

That last point is the quiet giant. Most small IP deals *don't happen at all* — not because there's no willing buyer and seller, but because the friction is larger than the prize. **A marketplace that compresses search + valuation + transaction cost enough to make small deals viable is not competing for an existing pie; it's creating trades that currently do not occur.** That's a much bigger and more defensible opportunity than taking share from brokers.

---

## 3. The exact problem you're solving (sharpened)

Let me state it more precisely than the marketing copy does, because the sharpening is where the business ideas come from.

**Surface problem:** IP owners have valuable trademarks they aren't using, and businesses need brands/marks they can't easily find. There's no good place for them to meet.

**Real problem:** The secondary market for intangible assets is *illiquid* — trades that should happen don't, because discovery, trust, valuation, and transaction friction are each individually high enough to kill a small deal. Every one of those four frictions is a product surface you can own.

**Deeper problem (the one worth building a company around):** Nobody can *see* the intangible economy. An SME founder can't answer basic questions — "is there a registered brand I could license instead of naming from scratch?", "what's my dormant mark worth?", "who might want it?", "am I about to lose it to non-use?" The market is invisible, so it's inert. **Spiral Nexus's job is to make the intangible economy visible and therefore transactable.** Visibility first, liquidity second, transactions third. Frame the mission that way and the roadmap almost writes itself.

This reframing matters for fundraising and focus. "A marketplace for trademarks" invites the obvious, fatal question — *the graveyard, why won't you die like IPwe?* "The company making the intangible economy visible and liquid, starting with the cleanest, most numerous asset class" invites a different conversation about a structural shift (intangibles = 90% of value) that has no infrastructure yet.

---

## 4. The regulatory tailwind that could be your growth engine

This deserves its own section because it's the strongest, most underexploited lever I found, and almost nobody is using it.

**Trademarks are "use it or lose it."** In the UK and EU, a registered mark can be **revoked if it isn't put to genuine commercial use for any five consecutive years.** Token use doesn't count. Revocation can be total or partial. This means every idle registered trademark is quietly running down a clock: **use it, license it, sell it, or lose it.** Licensing counts as use. So a hub that helps an owner monetise a dormant mark *before the five-year clock forces them to forfeit it entirely* isn't offering a nice-to-have — it's solving a deadline-driven, loss-framed problem, which is the most motivating kind.

There's even a concrete recent trigger: Brexit "comparable" UK marks cloned from EU registrations have their own five-year use windows, with a significant one running to **31 December 2025** — a wave of UK owners who need to act on dormant rights *right now*.

The reason this is a growth engine and not just a talking point: **it gives you a reason to contact a specific owner about a specific asset at a specific time, with a real deadline.** That is the raw material for exactly the kind of demand-manufacturing the IP-marketplace graveyard shows you must do. (Section 7 turns this into a concrete acquisition angle — "the non-use radar.")

Other structural tailwinds worth knowing: **good brandable names are genuinely running out** — Beebe & Fromer's landmark study found 81% of the 1,000 most common English words and 97% of the ~86,000 most-frequent words are already claimed as marks. Trademark depletion is at "chronic" levels. That scarcity makes *existing* registered marks a more valuable, more tradeable asset every year. And **IP-backed finance is going mainstream**: the UK government ringfenced **£500m** of lending capacity (announced 12 July 2026) specifically for IP-rich SMEs with no physical collateral — an explicit state endorsement that trademarks are bankable assets, and a market that needs exactly the price-discovery layer a marketplace produces.

---

## 5. Where the complexity lies

You asked specifically where the hard parts are. There are two very different kinds of complexity, and it's important not to confuse them — one is where you *win*, the other is where you can *die*.

### 5a. Market complexity (the existential kind)

**The cold-start / liquidity problem is the whole game, and it has killed everyone before you.** IPXI (2015), IPwe (Chapter 11 in 2024, then liquidation), and Denmark's state-run IP Marketplace (closed 2022) all died of the same thing: they got listings but not buyers. Denmark's own patent office concluded a dedicated IP-trading platform "wasn't practical" because IP "is most often traded as part of a larger business deal." That is the bear case, stated by a government that tried it.

Your defence — and it's a real one — is that **trademarks are a fundamentally different asset from patents.** Patents are few, expensive, legally treacherous, and buyers have a strong incentive *not* to transact openly (they'd rather infringe and dare you to sue). Trademarks are numerous (88M+ active), cheaper, brand-emotional, cleaner to value and transfer, and — crucially — **every SME is simultaneously a potential buyer and a potential seller.** The demand side is broader and warmer. But this is a thesis to *prove*, not assume. The core complexity of your business is manufacturing the demand side faster than you accumulate dead listings. Most of Section 7 is about that.

### 5b. Technical / product complexity (the kind you win with)

These are the genuinely hard, interesting problems — and unlike the cold-start problem, solving them creates *defensibility* (moats, data, switching costs). This is where I'd focus your creative energy:

**Trust and provenance.** The entire category runs on trust, and it's where the incumbents are weakest. How do you prove an owner actually owns the mark they're listing, without a slow manual review that doesn't scale? How do you keep user-submitted listings credibly separate from official registry data so nobody implies ownership they haven't earned? (Your compliance docs already treat this seriously.) Solving verification *elegantly* — matching listings against official registers automatically, flagging non-use exposure, surfacing status changes — is both hard and a moat.

**Valuation of a thing with no comparables.** "What's my mark worth?" is the question every user has and nobody answers well. Building even a rough, honest, improving valuation model for trademarks — trained on your own transaction data over time — is a genuinely hard ML/data problem *and* the single feature most likely to pull both sides onto the platform. Whoever owns trademark price discovery owns the category.

**Matching across a semantic, multi-dimensional space.** A good match isn't keyword overlap. It's "this dormant skincare mark in Nice class 3, registered in the UK, licensable, would fit *that* DTC brand expanding into cosmetics." That's embeddings over a messy space of Nice classes, jurisdictions, sectors, deal types, and intent — plus the cold-start data problem of matching well before you have much behavioural data. Hard, but this is the "AI matchmaking" your pricing already promises, done honestly.

**The two-schema asset model.** Trademarks (Nice classes, brand/logo data) and patents (IPC classes, claims, abstracts) are structurally different assets. Modelling them so the platform can extend from one to the other without a rewrite is real architectural complexity — and you've sensibly deferred patents rather than pretending they're the same table.

**Ingesting official IP-office data at scale, cleanly.** Pulling and normalising USPTO/UKIPO/EUIPO/WIPO records (each with its own format, terms of use, and update cadence) is "a whole project on its own," as your own spec says — which is why deep-linking out to them is the right MVP move. But *when* you do ingest it, that dataset becomes a moat: it's what powers verification, valuation, non-use radar, and matching all at once.

The pattern to notice: **your defensibility comes almost entirely from 5b, and the data to build 5b comes from surviving 5a.** Liquidity first buys you the transaction data that makes verification, valuation, and matching genuinely good — which is what makes you hard to copy. That's the flywheel.

---

## 6. The competitor landscape

The headline: **the direct competitors are real but weak and dated; the strong, well-funded players are in adjacent businesses; and nobody credible is doing what you're doing in your market, with your design bar, for your customer.** Here's the map.

### Direct competitors — the ones actually selling registered trademarks

These are the closest to your MVP, and studying them is the highest-value competitive homework you can do:

- **U.S. Trademark Exchange** (ustrademarkexchange.com) — the single closest competitor. Live since 2009, lets owners "buy, sell & license registered trademarks," ~1,800+ listings, prices from ~$7k to millions, visible "SOLD" marks. **But:** US-centric, dated 2009-era classifieds design, no subscription model, no messaging/relationship layer, no AI, transactional feel. It proves owners want to monetise and buyers want to acquire — and that the current product experience is beatable on every axis you care about.
- **TrademarkXchange** (trademarkxchange.com) — global buy/sell/trade of registered marks, organised by country and Nice class, ~$4k–$12k listings, commission model. Same story: transactional, thin brand, no relationship or SME focus.
- A long tail of small/regional players (Trademark Marketplace, India- and UAE-focused "buy/sell trademark" sites, including a nascent UAE *government* portal). Fragmented, small, no dominant modern player anywhere.

### Adjacent and strong — but selling *new* names, not dormant marks

- **Atom.com** (formerly Squadhelp, rebranded April 2024) — the best-funded, best-designed player in the broad "brand" space. Crowdsourced naming contests + a huge brandable-*domain* marketplace + trademark-check/filing add-ons. **But it sells newly-created names to people starting a venture — not existing registered marks being licensed or sold by their owners.** It's your closest UX/quality benchmark and the most credible *potential* entrant into your space, not a current competitor.
- **BrandBucket / Brandpa / (Novanym, acquired by BrandBucket July 2025)** — curated brandable-*domain* marketplaces. Domain-centric, consolidating.
- **Sedo / Afternic / GoDaddy Auctions** — domain aftermarkets that function as *de facto* brandable-name markets (a premium .com is often bought to anchor a brand). Not trademark rights, but where a lot of "I need a brand asset" demand already flows. A reason to be crystal-clear that you sell **trademark rights**, not domains.

### The IP graveyard and the enterprise incumbents

- **Patent marketplaces (IPXI, IPwe, Yet2, Ocean Tomo, Denmark's IP Marketplace)** — mostly dead, pivoted to brokerage, or retreated to advisory. The cautionary tale of Section 5a. Ocean Tomo (now part of J.S. Held) still does high-touch, high-value *patent* brokering — the opposite of a self-serve SME hub.
- **Enterprise IP platforms (Anaqua, Questel, Clarivate/CompuMark, PatSnap, IPfolio)** — own the IP data and the professional relationship, sell tools/data to corporate IP departments and law firms. None runs a two-sided SME trading hub. **Questel and Clarivate are the realistic "incumbent could enter" risk** — they own the best trademark data in the world — but their DNA (sell data to pros) is far from a consumer-grade marketplace.
- **AI-IP startups (Solve Intelligence, DeepIP, Patlytics — each raised ~$40M in 2025–26)** — the current venture money in "AI + IP" has gone almost entirely into *patent drafting and litigation tools for lawyers.* **I could not find a single well-funded AI startup building a two-sided trademark discovery/matchmaking hub for SMEs.** That specific space appears genuinely unoccupied — though "not found" is not the same as "proven empty," so treat it as an opening, not a guarantee.
- **Brand licensing ($370bn industry, per Licensing International)** — huge but agency-and-relationship-driven, aimed at big brands and retail merchandising (Disney-on-a-lunchbox), with essentially *no dominant self-serve digital deal marketplace.* Different customer than yours, but the absence of a platform is itself a whitespace signal.

### The whitespace, stated plainly

There is an obvious, currently-unfilled gap for **a credible, modern, well-designed, two-sided trademark licensing/sale hub aimed at SMEs — UK/Europe-first — with a real identity/relationship layer and honest AI matchmaking.** The direct incumbents look like 2009. The strong players sell new names, not dormant marks. The enterprise giants ignore SMEs. No funded AI startup is doing trademark matchmaking. Your risk is *not* "the gap doesn't exist." Your risk is *demand-side liquidity* — the exact rock every prior IP marketplace hit.

---

## 7. Creative angles: the interesting problems to attack

This is the part you asked for most — *be creative, name the complex problems we can solve, find the angles.* I've organised these by what they're really *for*, because the ordering is a strategy: the first cluster is about defeating the cold-start problem (your survival), the second is about defensibility (your moat), the third is about expanding what the company even is (your scale). Treat this as a menu to pick and sequence from, not a to-do list.

### Cluster A — Angles that manufacture the demand side (survival)

The graveyard teaches that you must create buyer demand deliberately. Every idea here is a way to do that.

**1. The "Use it or lose it" non-use radar.** This is the strongest single idea in the document. Build a system that identifies registered marks approaching their five-year non-use revocation window and reaches their owners with a loss-framed, deadline-driven message: *"Your mark X is at risk of revocation — license it, sell it, or lose it. List it here in minutes."* This flips the hardest problem in marketplaces (getting supply *with intent*) into an outbound, timed, high-urgency motion. It's the closest thing to a growth engine the domain offers, and *nobody is using it.*

**2. Reverse listings / "wanted" ads (demand-first, not supply-first).** Most marketplaces obsess over supply. Flip it: let buyers post *"I'm looking for a skincare-adjacent mark in Nice class 3, UK, licensable, budget £X."* Now you have concrete demand you can (a) match to existing listings, (b) use to outbound-recruit exactly the owners whose dormant marks fit, and (c) show prospective sellers as proof that buyers are waiting. Demand-first listing is how you avoid the "lots of sellers, no buyers" death spiral by construction.

**3. Concierge / brokered liquidity for the first 100 deals.** Do things that don't scale. For the earliest deals, have a human (you) actively match and shepherd both sides to a close. Every marketplace that survived cold-start faked liquidity manually first. The by-product is gold: the first real transaction data, which trains valuation and matching, which is your eventual moat.

**4. Seed supply from the non-use radar + curated imports, not open sign-ups.** A marketplace is worthless empty. Rather than wait for organic listings, curate an initial inventory of credibly-dormant, high-appeal marks (respecting each registry's data terms) so that day-one buyers see a real market, not tumbleweed.

### Cluster B — Angles that build the moat (defensibility)

**5. Own trademark valuation.** Ship the "what's my mark worth?" answer nobody else gives. Start with an honest, rules-plus-comparables estimate; improve it with every transaction you observe. This is simultaneously the best lead magnet (owners will come just for the valuation), the best matching input, and — once trained on proprietary deal data — the hardest thing for a competitor to copy. If Spiral Nexus becomes *the* source of trademark price discovery, you've won the category regardless of how many listings you have.

**6. Honest, explainable AI matchmaking.** Your pricing already promises this. Do it as embeddings over the real match space (class + jurisdiction + sector + deal type + intent), and *label it honestly* — "here's why we matched this" — rather than overpromising a model you can't back. The defensibility grows with usage data, so ship the thin version now and let it compound.

**7. Verification-as-a-feature, automated against the registers.** Turn trust from a manual bottleneck into a product surface: auto-match listings to official registry records, show live status (registered/pending/opposed/at-risk-of-non-use), and give credible listings a verified badge earned by data, not by a human reviewer's afternoon. Trust is the whole category; automated trust is a moat.

**8. The intangible-asset graph.** Longer-horizon: as you ingest registry data and accumulate listings, profiles, and deals, you're building a graph of who owns what, what's dormant, what's moving, and who wants what. That graph is the asset. It powers valuation, matching, non-use radar, and eventually analytics/market-intelligence products (which your Enterprise tier already gestures at). This is how a listings site becomes a data company.

### Cluster C — Angles that expand the business (scale)

**9. IP-backed finance as a wedge into a much bigger market.** The UK just put £500m behind lending to IP-rich SMEs with no physical collateral — and the blocker everyone names is *valuation and price discovery,* which is precisely what your marketplace generates. Position Spiral Nexus as the price-discovery and liquidity layer that makes trademarks *bankable*: partner with lenders who need comparables, and suddenly you're infrastructure for IP finance, not just a place to sell a logo. This is a plausible path from "side project" to "financial infrastructure."

**10. Licensing-deal tooling (the natural v2 revenue).** Brand licensing is a $370bn industry served by agencies, not platforms. Once introductions work, add lightweight licensing-deal support (templates, term sheets, recordal help, optionally payments) and take a cut of the deal you enabled. This is the transition from subscriptions to transaction revenue — the step that raises the ceiling from "SaaS for IP" to "the rails IP deals run on." Sequence it *after* liquidity, not before (transactions are the graveyard's heaviest trap if you do them first).

**11. "LinkedIn for the IP economy" — the network layer as the durable surface.** Your profiles + directory + follow features are more strategic than they look. Marketplaces are transactional and easy to leave once a deal's done; *networks* have retention and compounding value. If Spiral Nexus becomes where IP owners, brand builders, licensees, brokers, and IP counsel maintain a presence and see what's moving, you get the two things pure marketplaces lack: recurring reasons to return, and defensibility from the network itself. The relationship layer is what makes the subscription worth paying between deals.

**12. Adjacent expansion once the model works:** patents (the deferred second asset class, using the two-schema model you've already designed around), then other intangibles — domains-as-brand-bundles, designs, copyrights, even know-how. The mission ("make the intangible economy visible and liquid") is deliberately bigger than trademarks so the company can grow into it without a repositioning.

---

## 8. Where the large-scale user growth comes from

Pulling the acquisition threads together, because "attracting users at scale" was an explicit ask. Five channels, roughly in order of leverage:

**The non-use radar (outbound, timed, loss-framed).** Covered above — this is your highest-leverage supply channel *and* it comes with built-in urgency. It's the closest thing to a repeatable growth machine the domain offers.

**Valuation as a top-of-funnel magnet.** "What's my trademark worth?" is a search-friendly, universally-wanted, shareable hook that brings owners in *before* they've decided to sell. Free valuation → listing → deal is a clean funnel, and it works even for owners who aren't yet ready to transact (you capture them for the non-use clock).

**SME and DTC brand-builder demand.** Good names are running out (81–97% of common words claimed). Every new DTC/e-commerce brand needs an available, registrable mark, and increasingly can't find one. Positioning existing dormant marks as the answer taps a large, growing, under-served demand pool that currently overflows into domain marketplaces.

**Professional/partner channels.** IP counsel, trademark attorneys, brand consultants, and brokers each touch dozens of owners with dormant marks. A referral or embedded-tool relationship with them is a supply firehose — and the "simplest LinkedIn" network layer is what keeps them present between deals.

**Content and category ownership.** Nobody owns the public conversation about the dormant-IP problem, trademark depletion, or "use it or lose it." Owning that narrative — with data you uniquely have from the intangible-asset graph — is both SEO and category leadership, and it's cheap relative to paid acquisition.

The meta-point: **your growth should be demand-manufactured, not demand-harvested.** Because the graveyard proves organic buyer demand won't just show up, the channels that win are the ones where *you* create the reason and the timing to transact — the non-use radar, reverse listings, valuation hooks, and concierge matching. Design the growth engine around manufacturing demand and you're building the one thing every dead IP marketplace lacked.

---

## 9. The honest risks (so you go in clear-eyed)

**Liquidity is the whole game and it has killed everyone before you.** Say it out loud in every investor conversation and then explain *why trademarks are different* and *how the non-use radar / reverse listings / concierge model manufacture demand.* Owning the risk is more credible than dodging it.

**Incumbent entry.** Atom.com (could extend from new names into dormant marks) and Questel/Clarivate (own the trademark data) are the credible threats. Your moat against them is speed, UK/SME focus, design quality, and — most durably — the proprietary valuation/matching data and the network layer. None of those is a given; they're things to build deliberately.

**Trust and legal surface.** IP touches contract law, ownership claims, and (later) money movement. Your "introductions only" v1 keeps this light — protect that boundary until you have the volume to justify the heavier transaction product. Never let users imply ownership they can't prove; your compliance instincts here are already good.

**The "AI" credibility trap.** The brand leans on AI matchmaking. Ship the honest, explainable thin version and label it truthfully rather than overpromising a model you can't yet support — the domain is full of overclaiming, and credibility *is* the product here.

**A couple of data caveats** so you don't over-claim in a pitch: the "90–95% of patents never commercialised" stat is widely repeated but not traceable to a rigorous source (the defensible figure is ~30–50% unused); there's no clean public figure for the share of *trademarks* that are dormant; and the trademark-*only* licensing market size isn't cleanly isolated from the broader $356bn licensing total. The big anchors (intangibles ≈ 90% of S&P 500 value, 15.2M applications / 88M active marks, UK 163k applications/yr, the 5-year non-use rule, the £500m IP-lending scheme) are all well-sourced.

---

## 10. What I'd pinpoint

If you want the two or three things to concentrate on to make this a business rather than a project:

**Pick liquidity as the problem you're famous for solving — and manufacture the demand side deliberately.** The non-use radar and reverse/"wanted" listings are the two ideas I'd prototype first, because they attack the one thing that kills IP marketplaces. Everything else is downstream of having a warm demand side.

**Own trademark valuation and price discovery.** It's your best lead magnet, your best matching input, and — trained on your own deal data — your hardest-to-copy moat. If Spiral Nexus becomes the answer to "what's my mark worth?", the listings and the category follow.

**Reframe the company above the marketplace.** You're not "a trademark listings site" (that invites the graveyard question). You're "the company making the intangible economy — 90% of enterprise value with no functioning market — visible and liquid, starting with the cleanest asset class." That framing is what makes it fundable, expandable into IP finance and patents, and worth building a career around.

The build is genuinely ahead of where "side project" suggests, the problem is real and structurally large, the competitors are beatable, and there's a specific regulatory tailwind almost nobody is exploiting. The work now is less about more features and more about proving — with a handful of real, manufactured deals — that trademarks are the liquid market patents never were.

---

## Appendix — sources

**Market & problem:** Ocean Tomo 2025 Intangible Asset Market Value Study; IAM Media ("intangibles = 92% of S&P 500"); Bocconi / ScienceDirect "Used, blocking and sleeping patents"; WIPO IP Facts & Figures 2024; UKIPO data via Marks & Clerk "UK Trade Marks 2023 in Review"; EUIPO 30-year figures; Licensing International 2024 Global Licensing Study ($356.5bn); Beebe & Fromer "Are We Running Out of Trademarks?" (NYU/Harvard Law Review); Arora/Fosfuri/Gambardella *Markets for Technology*; NBER "Deals Not Done"; British Business Bank £500m IP-lending measure (12 July 2026); Wilson Gunn & Edwin Coe on the 5-year non-use rule and the 31 Dec 2025 comparable-mark deadline.

**Competitors:** U.S. Trademark Exchange; TrademarkXchange; Atom.com (ex-Squadhelp) rebrand; BrandBucket / Novanym acquisition; Sedo/Afternic; IPXI closure (IAM Media); IPwe bankruptcy (Law360/IAM); Ocean Tomo / J.S. Held; Denmark IP Marketplace closure (DKPTO); Anaqua, Questel, Clarivate, PatSnap; Licensing International 2025 study ($369.6bn); Solve Intelligence / DeepIP / Patlytics funding rounds.

*Full URLs are held in the research notes behind this briefing — ask and I'll append them inline, or drop them into a pitch-deck appendix.*
