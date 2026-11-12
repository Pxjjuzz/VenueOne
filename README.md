# VenueOne

VenueOne is a web platform for booking community halls and open grounds in India.
Instead of calling a caretaker to ask whether a date is free, a visitor can see the
real availability, the full price and the cancellation terms before paying anything.

**Live site:** <https://venueone-team.vercel.app>

---

## The problem

Community spaces are usually booked through phone calls, WhatsApp messages and a
paper register. The same date gets promised twice, the price is quoted differently to
different people, and cancelling means another phone call with no record of what was
agreed. VenueOne puts the listing, the calendar, the price and the cancellation terms
in one place, and keeps a record of every step.

## What it does

**For customers**

- Browse halls and grounds with filters for city, capacity, price, facilities and
  surface.
- See a venue page with photographs, approved pricing, opening hours, policies and a
  live availability calendar.
- Step inside a 3D walkthrough on a laptop or desktop where an administrator has
  published one for that venue. Phones show a short note instead and never download
  the model.
- Book instantly where the venue allows it, or send a request where the owner prefers
  to review first.
- Pay online, receive an itemised invoice by email, and manage the booking from a
  dashboard.
- Request cancellation only after a booking is confirmed, with the refund amount
  calculated from the policy saved on that booking.

**For venue owners**

- Request owner access, then manage a workspace of listings, photographs, pricing,
  opening hours and blocked dates.
- Approve or decline booking requests, with a required note when declining.

**For administrators**

- Review owner access and venue publication, approve the prices that become public,
  and suspend or reject a listing with a reason.
- Work through booking, payment, cancellation and refund queues.
- Edit platform settings and legal pages, and read contact messages and the audit log.

## How a booking works

1. **Find a space.** Halls are listed with fixed half-day and full-day slots. Grounds
   are listed by the hour.
2. **Pick a real slot.** Availability comes from the booking engine and the bookings
   already held, not from a calendar image.
3. **See the total.** Subtotal, platform fee and tax are calculated on the server and
   shown before payment.
4. **Pay and confirm.** Payment is confirmed only after the provider signature or a
   verified webhook, never from a success screen in the browser.
5. **Keep the record.** Each booking keeps its price snapshot, status history,
   cancellation terms and emails.

## Honest by design

There are no seeded venues, ratings, reviews or booking passes. When no approved
venue exists in a city, the site says so instead of filling the page with stock
listings. Every venue shown has been submitted by an owner and approved by an
administrator.

## Built with

Next.js 16 (App Router) and React 19 in TypeScript, Tailwind CSS 4 with a custom
token set, Framer Motion for the scroll animation, Supabase for Postgres, Google
sign-in and file storage, Razorpay for payments, and Gmail SMTP through Nodemailer for
transactional email. Hosted on Vercel.

## Design

Warm stone paper, charcoal ink and a deep forest green, with Manrope for headings and
Inter for body text. The landing page includes a scroll-driven axonometric drawing of
a hall whose roof lifts away to show the floor plan. It is an illustration, not a
venue listing, and it says so on the page. The interface is keyboard reachable and
respects reduced-motion settings.

## Scope

This covers Phase 1 and the Phase 2 venue viewer: the complete booking web
application, plus an optional 3D interior that a Super Admin attaches to a venue and
publishes deliberately. No venue ships with a model switched on, and a published
model is labelled as conceptual, approximate or verified so nobody mistakes it for a
measured survey. An Android app (Phase 3) is not included.

## Policies and contact

The published [privacy policy](https://venueone-team.vercel.app/privacy),
[terms and conditions](https://venueone-team.vercel.app/terms) and
[cancellation and refund policy](https://venueone-team.vercel.app/refund-policy) apply
to every booking.

Questions: <venueone.team@gmail.com>

## License

Proprietary. All rights reserved.
