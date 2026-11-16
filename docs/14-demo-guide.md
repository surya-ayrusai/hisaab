# 14 — Demo Guide

Project: HISAAB · For the demonstration on 20 November 2026 · https://hisaab-ayrus3.vercel.app

## 1. Before you start

- **Open the link in a browser that has never opened it**, or press **Erase all
  data** in Settings and reload. A browser that has been used for testing will
  show the test entries instead of the clean sample shop.
- Check the headline reads **Rs 11,820** over **8 customers**. If it does not,
  the browser is holding earlier data.
- Add `?today=2026-11-15` to the link if you want the dates in the demo to match
  this script exactly. Without it the app uses today's real date, which is fine —
  only the day counts in "Dues by age" will differ.
- A phone is the right device. This is a product for a shopkeeper standing
  behind a counter, and showing it on a laptop undersells that.

## 2. The story to tell

> A kirana shop keeps a paper khata. The shopkeeper knows roughly who owes what,
> but not exactly, not by age, and never in a form they can send to the customer.
> HISAAB is that notebook, with the arithmetic done for them and a reminder one
> tap away.

Lead with the number at the top. Everything else is in service of it.

## 3. The run, in six minutes

| # | Do this | Say this |
| --- | --- | --- |
| 1 | Open the page. Let the total land. | "The first thing the shop sees is what it is owed today. Rs 11,820 across 8 customers. On paper that is twenty minutes of adding up." |
| 2 | Tap **Dues by age**. | "And it is not one number, it is five. Rs 9,180 has been waiting more than a month. Payments count against the oldest credit first, so this is the money that has genuinely been sitting." Point out that the bands add up to the total. |
| 3 | Close. Tap **Payment** on any customer with a due. Type an amount. Save. | "Recording a payment is three taps: Payment, the amount, Save. The shopkeeper is standing at the counter with a customer in front of them." |
| 4 | Point at the toast. Tap **Undo**. | "And every save can be undone. A ledger that can't be corrected is a ledger nobody trusts." |
| 5 | Tap **WhatsApp** on a customer who owes money. | "The reminder opens with the message already written, with the shop's name and the exact amount. The shopkeeper presses send. We never send it for them — a message from a number the customer doesn't recognise is how a shop loses a customer." Come back without sending. |
| 6 | Open a customer, then **Statement**. | "And if the customer disputes it, here is the statement: opening balance, every entry, closing balance. Print it or save it as a PDF." |

If there is time, show **Settings → Download backup** and say the one honest
sentence in section 5 below.

## 4. Questions you will be asked

| Question | Answer |
| --- | --- |
| "Where is the data stored?" | In the shopkeeper's own browser, on their own phone. It never reaches a server. That is a privacy advantage and a real limitation — see section 5. |
| "What if they lose the phone?" | Settings has a backup file they can download and restore. Sync is the first thing we would build next. |
| "Can two people use it?" | Not today. One shopkeeper, one device. That needs accounts. |
| "Does it send reminders automatically?" | No, by design. It opens WhatsApp with the message ready and the shopkeeper presses send. |
| "Can they delete a wrong entry?" | They cancel it. It stays visible, struck through, and stops counting. A ledger that can silently lose a row is not a ledger. |
| "What does it cost to run?" | Nothing meaningful. There is no server, no database and no AI provider. It is a static page. |
| "How is this different from Khatabook?" | Theirs is an app with an account and a server. This is a page that opens instantly, holds nothing of the shop's on anyone else's machine, and does the one job. See `docs/02`. |

## 5. The one honest sentence

Say it before anyone finds it:

> "Everything is on this one device. That is why there is a backup button, and
> syncing across devices is the first thing we would build next."

It is in `docs/12` as limitation L1. Saying it first reads as confidence; being
caught by it reads as a gap.

## 6. If something goes wrong

| Problem | Fix, live |
| --- | --- |
| Numbers look wrong or there are unfamiliar customers | The browser holds earlier data. Settings → **Erase all data** → reload. The sample shop comes back. |
| Page looks stale after a recent push | Hard reload. Vercel serves the new build immediately, but the old page may still be open. |
| WhatsApp does not open | The device has no WhatsApp installed. Show the link itself instead and read the message out. |
| A sheet will not close | Press Escape, or tap the dark area outside it. |

## 7. What not to do

- Do not demonstrate the import box unless asked. It is there for the automated
  tester and it is the least interesting thing on the page.
- Do not promise sync, interest calculation or multiple users as "coming soon"
  without agreeing a date first.
- Do not send a real WhatsApp message to a real number during the demo.
