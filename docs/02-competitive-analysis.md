# 02 — Competitive Analysis

Project: Hisaab · Phase 0 · Research date: 15 November 2026 · Status: draft for owner review

No app was installed or tested. Sources are store listings, vendor pages and reviews, each read on the research date unless marked otherwise.

## 1. Executive summary

- Khatabook and OkCredit are the direct competitors. Vyapar and myBillBook are GST billing products for a different job; their party ledger is a by-product of invoicing.
- Both ledger apps are free with ads and promote loans. OkCredit sells ad removal monthly; paying users still report ads.
- Incumbent strengths Hisaab cannot match in a browser-local build: cloud backup, automatic WhatsApp/SMS reminders, UPI collection, 11–13 languages.
- Credible openings: no ads or loans, entry speed, plain statements, credit ageing, and data the shopkeeper can export freely.

## 2. Competitor profiles

### Khatabook
- **Positioning (official claim):** bahi khata app "for businesses of every size", now described as accounting app with hisab-kitab, inventory and instant loans; 5+ crore users.
- **Ledger:** credit and debit tracking per customer; khata updates automatically on in-app payment.
- **Reminders:** payment links by SMS or WhatsApp; multiple reminders in one tap.
- **Beyond ledger:** GST and non-GST bills, inventory with low-stock alerts, QR and UPI collection, business loans of ₹10,000–₹5,00,000 through NBFC partners at 15–24% interest.
- **Languages:** English, Hindi and 10+ regional languages.
- **Commercial model:** free, contains ads; lending prominent. Paid tiers: not found in reviewed sources.
- **Data:** listing states data may be shared with third parties (personal info, financial info and four other types) and is encrypted in transit.
- Source: https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook (Verified)

### OkCredit
- **Positioning (official claim):** "If you can use WhatsApp, you will also be able to use OkCredit"; ledger at the centre, with billing, UPI, stock and loans around it.
- **Ledger:** customer and supplier khata; balance shared automatically with the customer after every transaction; reports and statements.
- **Reminders:** automatic WhatsApp or SMS reminders; bulk reminders; one-tap WhatsApp reminder with payment link.
- **Data:** real-time cloud backup; data accessible if the phone is lost; works offline (official claims).
- **Languages:** 11, including Hindi and Telugu.
- **Commercial model:** Basic free with ads. Paid 30-day plans: ₹30 "Unlimited Daily Ledger Transactions"; ₹75 ad-free with multi-device login, desktop access, "view defaulters", bills, stock; ₹99 adds unlimited transaction SMS. Loans up to ₹1,00,000 at 18–24% APR.
- **Inconsistency noted:** OkCredit's switching page says the free plan has unlimited entries; its pricing page sells unlimited daily transactions.
- Sources: https://play.google.com/store/apps/details?id=in.okcredit.merchant · https://okcredit.in/pricing · https://okcredit.in/khatabook-alternative · https://okcredit.in/payment-reminder-app (all Verified)

### Vyapar
- **Positioning:** GST billing, invoicing, inventory and accounting for retailers, distributors and traders, including kirana.
- **Ledger relevance:** payment reminders tied to invoice due dates; party statements.
- **Commercial model:** Desktop + Mobile, one year: Silver ₹4,399 (list ₹7,499), Gold ₹4,799 (list ₹9,099). Gold includes sync across devices, removal of advertisement on invoices, restore of deleted transactions, Tally export, WhatsApp Connect.
- Sources: https://play.google.com/store/apps/details?id=in.android.vyapar · https://vyaparapp.in/pricing (Verified)

### myBillBook
- **Positioning:** GST billing, stock, e-invoices and e-way bills.
- **Commercial model (yearly view):** Plus ₹291/month (list ₹403), Pro ₹333/month (list ₹665), Pro Max from ₹570/month (list ₹1,026). Plus covers 1 business and 1 user plus a CA; Pro adds desktop app, godowns, SMS and WhatsApp marketing; Pro Max adds e-invoices, POS, Tally export. Free trial for first-time users; 7-day money-back guarantee. The page's FAQ separately says the basic plan starts at ₹349/month.
- Source: https://mybillbook.in/pricing-plans (Verified)

### Others
- Pagarbook is named with Khatabook as OkCredit's main competitors (Inc42, Verified).
- Paytm for Business, PhonePe and BharatPe reach the same merchants through payments. Whether each offers a khata today: Unverified.

## 3. Feature comparison matrix

Key: **VA** verified available · **AL** available with limitations · **PO** paid-only or plan-dependent · **NF** not found in reviewed sources · **UV** unverified. NF is not proof of absence.

| Attribute | Khatabook | OkCredit | Vyapar | myBillBook |
| --- | --- | --- | --- | --- |
| Intended user | Small businesses of every kind; now accounting + loans | Small merchants; khata-centred | Businesses that issue bills | Businesses that issue GST bills |
| Customer creation | VA (steps NF) | VA (steps NF) | VA as "party" | VA as "party" |
| Credit and payment recording | VA | VA | AL: via invoices and payments | AL: via invoices and payments |
| Balance and history | VA | VA; balance auto-shared with customer | VA | VA |
| WhatsApp/SMS reminders | VA: links by SMS/WhatsApp, bulk | VA: automatic and bulk; user-reported as now limited on free plan; unlimited SMS PO | VA: invoice due reminders | PO: SMS and WhatsApp marketing on Pro |
| Statements | NF on listing; user-reported PDF reports with limits (Techjockey 2024) | VA: reports and statements | VA | UV |
| Attachments on entries | AL: user review refers to uploaded photos | NF | NF | NF |
| Import/export | AL: item-wise report export | NF | PO: Tally export on Gold | PO: Tally export on Pro Max |
| Backup/restore | UV on listing; user-reported recovery problems (2022, 2025) | VA: real-time cloud backup (official claim) | PO: sync on Gold | UV |
| Offline behaviour | UV | VA (official claim) | UV | UV |
| Languages | VA: English, Hindi, 10+ regional | VA: 11 | NF | NF |
| Voice input | NF | NF | NF | NF |
| Integrations | UPI, cards, wallets, QR | UPI (NPCI), net banking | Tally export | Tally export |
| Pricing model | Free with ads; loans | Free with ads; ₹30/₹75/₹99 per 30 days; loans | Annual licence from ₹4,399 | Subscription from ₹291/month billed yearly |
| Correction or reversal of entries | NF | NF | PO: restore deleted transactions on Gold | NF |
| Credit ageing by days | NF | AL/PO: "view defaulters" on ₹75 plan | NF | NF |
| Strengths | Reach, languages, collection tools | Khata focus, auto-share, backup, offline | Depth for billing users | Low entry price for billing |
| Weaknesses or friction | Ads; loan promotion; interface called messy; QR reported removed | Ads even for payers (user-reported); monthly-only plans; reminders reported limited | Heavy for a credit notebook; sync and Tally paid | Billing-first; most features paid |
| Evidence and confidence | Play listing + 3 recent reviews; medium | Play listing, 3 vendor pages, 3 recent reviews; medium-high | Play listing + pricing page; medium | Pricing page + Play search card; low-medium |

## 4. Common workflow analysis

What can be said from sources, without having used the apps:

| Workflow | Observed pattern | Evidence quality |
| --- | --- | --- |
| Add customer | Name and phone; OkCredit and Khatabook lean on the phone contact list (both request personal-info data) | Low: inferred from listings |
| Record entry | Two actions per customer ("gave"/"got" style). A Khatabook reviewer with 213 helpful votes says saving an entry name requires pressing Back before Save | Medium for the friction; low for the layout |
| Balance and history | Per-customer running balance; OkCredit messages the customer after each entry | Medium (official claim) |
| Partial payment | Treated as an ordinary payment that reduces the balance | Assumption; not documented in sources |
| Correcting a mistake | Not found for the ledger apps. Vyapar sells "restore deleted transactions", which implies deletion is the correction model there | Low |
| Reminders | Automated and bulk, with payment link; delivery tracked by the vendor's own channel | Medium (official claims) |
| Changing phone | OkCredit: cloud restore (official claim). Khatabook: users report confusion | Medium |

Tap counts for a routine entry remain unmeasured. This is the most useful thing to check by hand before the PRD.

## 5. User pain points with evidence

One review is not a trend. Frequency below is my judgement from the small sample read; it is not a count.

| Pain point | Product | What was said (paraphrased) | Source and date | Label | Seen how often |
| --- | --- | --- | --- | --- | --- |
| Ads despite paying | OkCredit | Paying monthly, yet ads appear after entries; another pays ₹99 and still sees ads (15 found it helpful) | Play reviews, 23 Oct and 1 Sep 2026 | User-reported, Verified | 2 of 3 visible reviews |
| Forced monthly plan, no yearly option; reminders now limited; battery drain | OkCredit | Long-time user disappointed by recent changes | Play review, 20 Sep 2026 | User-reported, Verified | 1 of 3 |
| Vendor confirms ads fund the product | OkCredit | Developer reply: ads cover development cost; ad-free needs the ₹75 plan | Play, 24 Oct 2026 | Official, Verified | — |
| Loan promotion and clutter | Khatabook | Messy interface; QR feature removed; loan offers shown, then "not eligible" | Play review, 3 Nov 2026 | User-reported, Verified | 1 of 3 |
| Entry friction | Khatabook | Must press Back to reach Save; wants photo rotate and share | Play review, 17 Aug 2026, 213 helpful votes | User-reported, Verified | 1 of 3, strongly endorsed |
| Loan terms | Khatabook | Repayment tenure cut from 12 to 6 months | Play review, 10 Nov 2026 | User-reported, Verified | 1 of 3 |
| Onboarding and findability | Khatabook | Setup confusing; features hard to find; wants a tutorial | Techjockey, Jul–Oct 2024: https://www.techjockey.com/reviews/khatabook | User-reported, Verified | 3 of 10 |
| Performance | Khatabook | Slow at peak hours; delayed notifications | Techjockey, Aug–Oct 2024 | User-reported, Verified | 2 of 10 |
| Multi-device | Khatabook | Records across devices not smooth | Techjockey, Oct 2024 | User-reported, Verified | 1 of 10 |
| Reports | Khatabook | Cannot download full reports | Techjockey, Aug 2024 | User-reported, Verified | 1 of 10 |
| Data loss or recovery | Khatabook | Earlier records missing after re-login (2022); lost phone, unsure how to recover (2025) | AppGrooves, G2 | Search excerpt | Isolated, dated |
| Data loss and sync | Vyapar | Sync problems, data mismatch, slow support | Capterra summary of 181 reviews | Search excerpt | Minority theme |

Not found in reviewed sources: complaints about wrong balances, regional-language quality, or WhatsApp reminder delivery.

## 6. Gaps and opportunity areas

| Opportunity | Basis | Strength of evidence |
| --- | --- | --- |
| A khata with no ads, loans or upsell | Ads and loan complaints on both leaders, confirmed by vendor reply | Medium |
| Faster, more obvious entry | Highly endorsed Khatabook review on save friction; onboarding complaints | Medium |
| Free view of who owes and for how long | OkCredit puts "view defaulters" in a paid plan; ageing not found elsewhere | Low-medium |
| Safe correction of mistakes | Not found for ledger apps | Low (absence only) |
| Free, open export and import | Exports elsewhere are partial or paid | Low-medium |
| No sign-up, nothing shared with third parties | Both leaders declare third-party data sharing | Medium as fact; unknown as user motive |

## 7. SWOT

| | Khatabook | OkCredit | Vyapar | myBillBook | Hisaab (proposed) |
| --- | --- | --- | --- | --- | --- |
| Strengths | Scale, languages, collections | Khata focus, backup, offline, auto-share | Billing depth | Price for billing | Focus, speed, privacy, no install |
| Weaknesses | Clutter, ads, loan push | Ads, monthly paywall | Too heavy for udhaar | Paid for most features | No cloud backup, no auto reminders, no UPI, one device |
| Opportunities | — | — | — | — | Users tired of ads; shops that only want the khata; traders who value ageing |
| Threats | — | — | — | — | Incumbents are free and can add a "lite" mode; data loss on a local-only app would destroy trust |

## 8. Sources

All accessed 15 Nov 2026.

- Google Play: Khatabook, OkCredit, Vyapar listings and "mybillbook" search (URLs in section 2)
- https://okcredit.in/pricing · https://okcredit.in/khatabook-alternative · https://okcredit.in/payment-reminder-app · https://okcredit.in/llms.txt
- https://vyaparapp.in/pricing · https://mybillbook.in/pricing-plans
- https://www.techjockey.com/reviews/khatabook
- https://inc42.com/buzz/tiger-global-backed-okcredit-narrows-fy25-loss-by-34-to-inr-23-cr/
- https://cwv.yourstory.com/2024/11/ms-dhoni-backed-khatabook-clocks-rs-1027-cr-revenue-cuts-losses-7-in-fy24
- Search excerpts only: https://www.capterra.com/p/180579/Vyapar/ · https://www.g2.com/products/khatabook/reviews · AppGrooves Khatabook negative reviews
