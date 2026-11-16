# VenueOne mobile app: initial requirements

Status: draft, v0. Written 16 November 2026. Nothing is built yet. This file lists
what the first mobile release must do, so the scope can be agreed and changed before
any code is written.

Naming: `ROADMAP.md` calls this Phase 3 (Android app). The product owner calls it the
Phase 2 mobile app. The label is cosmetic. The scope below is what matters.

## 1. Scope

A customer app for finding and booking a hall or ground. One release, small.

- Browse and search published venues.
- Read a venue page: photographs, price, hours, policies, live availability.
- Book a slot and pay through Razorpay.
- See your own bookings and their status.

Owner and admin tools stay on the responsive web dashboards for this release.

## 2. Platform

- Android first, because that is what the roadmap already commits to. iOS is a later
  decision, not part of this release.
- One codebase that talks to the existing Next.js server. Business rules stay in
  `src/lib` and are not reimplemented in the app.
- Minimum Android version to be confirmed. Target the version that covers the current
  Play Store floor.

## 3. Accounts

- Browsing works signed out.
- Sign in with phone OTP through Supabase Auth. Email sign in is optional for v0.
- The same account works on web and app. A booking made in one appears in the other.
- Session stored in the platform secure store, not in plain preferences.

## 4. Catalogue and search

- List published venues only. Never show `draft`, `under_review` or rejected listings.
- Filters that match the web: city, capacity, price range, facilities, space type.
- Text search on venue name and city.
- Result card shows cover photo, name, area, capacity, "from" price and photo count.
  The price range label must read the same way as the web, with no invented total.
- Empty state says plainly that no venue matches, with a way to clear filters.

## 5. Venue page

- Photo gallery with the cover first.
- Price per slot, in rupees, from `venue_pricing` only. No client-side price maths.
- Opening hours, contact details and cancellation terms, labelled the same as web.
- Availability for the selected date comes from the server, not from a cached guess.
- Provisional values (price, hours) carry the same provisional label as the web.
- 3D viewer: phones do not download the GLB in v0. Show the preview image and a short
  note that the walkthrough is available on a larger screen. This matches the current
  web behaviour at phone widths.

## 6. Booking and payment

- Booking uses the existing server quote: slot, platform fee and tax are calculated on
  the server and shown before payment.
- Both policies are supported: instant booking, and owner approval with its payment
  window.
- Payment opens Razorpay checkout. A booking is confirmed only by the server, on
  signature or webhook, exactly as on web. The app never marks a booking paid itself.
- The payment window countdown is visible, and an expired hold is shown as expired.
- After payment the app shows the booking reference and offers the invoice.

## 7. Notifications

- Booking confirmed, booking rejected, payment window expiring and cancellation
  outcome. Email is the guaranteed channel in v0.
- Push notifications are optional for v0 and must not be required to complete a
  booking.

## 8. Offline and performance

- With no connection the app explains that it is offline and offers retry. No offline
  booking, no cached availability.
- Cold start target and image budget to be set with the first build. Photographs are
  already served as resized WebP.
- The app holds no service role key and no Razorpay secret. Only public keys ship.

## 9. Out of scope for v0

- Owner dashboard and admin tools.
- iOS.
- In-app chat, ratings, reviews and favourites.
- 3D model download on phones.
- Saved payment methods and wallet.
- Multi-language.

## 10. Open questions

1. Native wrapper (Expo or React Native) or a thin WebView shell that reuses web pages?
2. Phone OTP only, or phone plus email from day one?
3. Which Android versions must be supported?
4. Is a store listing part of this release, or is a direct APK enough at first?
5. Should owner and admin get a separate app later, or stay on web permanently?

## 11. Next step

Answer the five questions, then write a one page build plan with screens, API
endpoints and a test list. No app code until that plan is agreed.
