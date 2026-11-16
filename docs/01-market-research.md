# 01 — Market Research

Project: Hisaab · Phase 0 · Research date: 15 November 2026 · Status: draft for owner review

Evidence labels used throughout: **Verified** (read on a page opened on the research date), **Official claim** (the vendor's own statement), **User-reported** (individual reviews), **Search excerpt** (seen in search results, page not opened), **Unverified**, **Assumption**, **Recommendation**.

No competitor app was installed or tested. All product descriptions come from store listings, vendor pages and reviews.

## 1. Executive summary

- The kirana channel is very large and customer credit is one of the reasons households stay with it.
- The digital khata category is mature. Both ledger leaders are free, ad-supported, and now bundle billing, stock, UPI collection and loans.
- Recent reviews of both leaders complain about ads, upselling and clutter, including from paying users. That is the most credible opening for a focused product.
- Neither leader has made the ledger profitable. Monetisation of a pure khata is unproven.
- A browser-local Hisaab cannot match incumbents on cloud backup, automatic reminders or UPI collection. Its honest advantages are focus, speed, privacy and no sign-up.

## 2. Market and user problem

| Finding | Evidence | Label |
| --- | --- | --- |
| Kirana stores held about 91% of India's grocery market in CY2025 and are projected at about 86% in CY2030 | Redseer, published 21 Jan 2026: https://redseer.com/reports/why-indias-mass-grocery-still-leans-on-kirana-stores/ | Verified |
| More than 230 million low-to-middle income households rely on kiranas for frequent small purchases; credit for households on daily or weekly cash flow is cited as a kirana advantage | Same Redseer page | Verified |
| About 1.4 crore kirana stores; 75–80% of FMCG sales | Reported from a DPIIT–ONDC roundtable, June 2026: https://knnindia.co.in/news/newsdetails/sectors/dpiit-ondc-hold-discussion-on-digitising-indias-kirana-trade | Search excerpt |
| No census-grade count of kirana stores exists; figures range from about 1.3 to 1.4 crore | https://okcredit.in/blog/how-to-open-a-kirana-store/ | Search excerpt |
| Only about 14 lakh of 1.3 crore stores are "digitised" | Attributed to AICPDF in a secondary briefing; original not seen | Unverified |

The problem Hisaab addresses is narrow and well understood: a shopkeeper gives goods on credit, writes it in a notebook, and later has to total it, remember it and ask for it. Notebooks fail on arithmetic, on finding a customer quickly, on disputes, and on loss or damage.

## 3. Category economics

| Company | Latest reported year | Revenue | Net loss | Source | Label |
| --- | --- | --- | --- | --- | --- |
| Khatabook | FY24 | ₹102.70 crore | ₹116.24 crore | https://cwv.yourstory.com/2024/11/ms-dhoni-backed-khatabook-clocks-rs-1027-cr-revenue-cuts-losses-7-in-fy24 | Verified |
| OkCredit | FY25 | ₹23.3 crore operating | ₹23.2 crore | https://inc42.com/buzz/tiger-global-backed-okcredit-narrows-fy25-loss-by-34-to-inr-23-cr/ (24 Oct 2025) | Verified |

Reading: the ledger is given away to acquire merchants; money is sought from ads, subscriptions and lending. This explains why both apps keep adding non-ledger features. It also means Hisaab should not assume shopkeepers will pay for a ledger alone.

## 4. Scale of incumbents (Google Play, India store, read 15 Nov 2026)

| App | Rating | Reviews | Downloads | Last updated | Ads label |
| --- | --- | --- | --- | --- | --- |
| Khatabook Credit Account Book | 4.5 | 5.93 lakh | 100M+ | 6 Nov 2026 | Contains ads |
| OkCredit: Ledger, UPI, Billing | 4.6 | 4.33 lakh | 1 crore+ | 13 Nov 2026 | Contains ads |
| Vyapar Invoice GST Billing App | 4.8 | 2 lakh | 10M+ | 12 Nov 2026 | No ads label shown |
| myBillBook Invoice Billing App | 4.7 | 1.5 lakh | 1 crore+ | Not read | Not read |

Sources: https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook · https://play.google.com/store/apps/details?id=in.okcredit.merchant · https://play.google.com/store/apps/details?id=in.android.vyapar · Play search results for "mybillbook". All Verified.

High ratings alongside sharp recent complaints means dissatisfaction is real but not majority. Do not read the complaints in document 02 as evidence that these apps are failing.

## 5. Technical feasibility findings that affect the product

| Topic | Finding | Source | Label |
| --- | --- | --- | --- |
| WhatsApp click-to-chat | Format is `https://wa.me/<international number, digits only>?text=<URL-encoded text>`. The link pre-fills the message; the sender must press send; the app cannot learn whether it was sent | https://bird.com/explained/whatsapp/what-is-a-whatsapp-click-to-chat-link (summarising WhatsApp's help page, which could not be opened) | Verified on secondary page |
| Browser speech recognition | No browser has full support. Chrome, Chrome for Android, Safari and Samsung Internet are partial; Firefox ships it disabled; Firefox for Android does not support it | https://caniuse.com/speech-recognition | Verified |
| Speech recognition for Telugu and code-mixed Hindi/English | Quality in a noisy shop | — | Unverified |

## 6. Research limitations and unanswered questions

1. No app was installed. Tap counts for common tasks, correction flows, statement layouts and onboarding steps are therefore not measured.
2. khatabook.com and WhatsApp's help centre could not be opened from this environment. Khatabook facts come from its Play listing.
3. Apple App Store listings were not reviewed.
4. Only the three or four reviews Google Play shows by default were read per app. Frequency of each complaint is not quantified.
5. No primary user research. Every statement about what shopkeepers want is an inference from reviews and vendor positioning.
6. Whether competitors offer credit ageing, opening balances or voice entry was not found in reviewed sources. Not found is not proof of absence.
7. Unanswered: what share of kirana owners who keep credit still use paper, and why those who tried an app stopped.

## 7. Recommended validation before any commercial commitment

- Ten short conversations with shopkeepers in Hyderabad who keep udhaar: what they use, what annoyed them about apps, whether they would trust a phone-only record.
- One hour with the four apps on an Android phone to fill the "not found" cells in the comparison matrix.
