-- VenueOne public policies supplied by the platform team.
-- Applied after the initial template seed so these replace the placeholders.

update legal_pages
set
  title = 'Privacy Policy',
  content_md = $policy$
# Privacy Policy

**Platform:** VenueOne
**Website:** https://venueone-team.vercel.app
**Contact:** venueone.team@gmail.com
**Last Updated:** 11 November 2026

## 1. Information We Collect

We may collect your name, email address, phone number, Google profile information, booking details, payment references and basic device information.

Venue owners may also provide venue details, photographs and verification documents.

## 2. How We Use Your Information

We use your information to:

- Create and manage accounts.
- Process bookings and payments.
- Verify venue owners and listings.
- Send booking updates and notifications.
- Handle cancellations, refunds and support requests.
- Maintain platform security and prevent fraud.

## 3. Sharing of Information

We do not sell your personal information.

Relevant booking details may be shared with venue owners. Information may also be processed by service providers such as Google, Supabase, Vercel and Razorpay.

We may disclose information when legally required.

## 4. Data Security

We use reasonable security measures to protect your information. However, no online platform can guarantee complete security.

## 5. Data Retention

We retain information only as long as necessary for platform operations, legal requirements and dispute resolution.

## 6. Your Rights

You may request access, correction or deletion of your personal information, subject to applicable law.

For privacy-related requests, contact us at venueone.team@gmail.com.

## 7. Cookies and Third-Party Services

We may use essential cookies for login sessions, security and website functionality. Third-party services are governed by their respective privacy policies.

## 8. Changes and Contact

We may update this policy when necessary. Changes will be published on our website.

VenueOne
https://venueone-team.vercel.app
venueone.team@gmail.com
$policy$,
  requires_legal_review = false,
  updated_at = now()
where slug = 'privacy';

update legal_pages
set
  title = 'Terms and Conditions',
  content_md = $policy$
# Terms and Conditions

**Platform:** VenueOne
**Website:** https://venueone-team.vercel.app
**Contact:** venueone.team@gmail.com
**Last Updated:** 11 November 2026

## 1. Acceptance

By accessing or using VenueOne, you agree to these Terms and Conditions.

## 2. Platform Services

VenueOne allows users to discover and book community halls, playgrounds, sports grounds, turfs and other listed venues.

VenueOne acts as a booking platform connecting customers and venue owners.

## 3. User Accounts

- Users must provide accurate information.
- Google authentication is required for booking.
- Customers must be at least 18 years old.
- Users are responsible for maintaining account security.

## 4. Venue Owners

- Owners must apply for approval before listing venues.
- Every venue requires separate administrative approval.
- Owners must provide accurate venue details, pricing and availability.
- Owners must honour confirmed bookings.
- VenueOne may suspend listings that violate platform policies.

## 5. Bookings and Payments

Booking availability and prices are displayed before confirmation.

Some venues allow instant booking, while others require owner approval.

A booking is confirmed only after the required approval and successful payment verification.

Payment processing is subject to the payment provider's terms.

During the demonstration phase, payments may operate in test mode without real money being collected.

## 6. Cancellations and Refunds

Cancellations and refunds are governed by VenueOne's Cancellation and Refund Policy.

Users should review the applicable policy before completing a booking.

## 7. User Responsibilities

Users must not:

- Provide false information.
- Make fraudulent bookings.
- Misuse the platform.
- Damage venues or violate venue rules.
- Attempt unauthorized access to the platform.

## 8. Platform Availability

We aim to provide reliable services but do not guarantee uninterrupted availability.

VenueOne may modify, suspend or discontinue features when necessary.

## 9. Limitation of Liability

VenueOne is a platform facilitating bookings. Venue owners remain responsible for the condition, safety and lawful operation of their venues.

VenueOne will address platform-related issues in accordance with applicable law.

## 10. Changes and Contact

We may update these terms when necessary. Continued use of the platform after updates constitutes acceptance where permitted by law.

VenueOne
https://venueone-team.vercel.app
venueone.team@gmail.com
$policy$,
  requires_legal_review = false,
  updated_at = now()
where slug = 'terms';

update legal_pages
set
  title = 'Cancellation and Refund Policy',
  content_md = $policy$
# Cancellation and Refund Policy

**Platform:** VenueOne
**Website:** https://venueone-team.vercel.app
**Contact:** venueone.team@gmail.com
**Last Updated:** 11 November 2026

## 1. Customer Cancellations

Customers may request cancellation through their VenueOne account.

Refund eligibility depends on the cancellation rules configured by VenueOne's Super Admin.

The applicable cancellation deadline and refund percentage will be displayed before payment.

## 2. Venue Owner Cancellations

If a venue owner cancels a confirmed booking because they cannot provide the venue, the customer will ordinarily receive a full refund.

Repeated cancellations may result in administrative action against the venue owner.

## 3. Refund Processing

- Approved refunds will be initiated through the applicable payment provider.
- Refunds will be returned to the original payment method wherever supported.
- Actual crediting time depends on the payment provider and customer's bank.
- Customers may contact support if a refund is delayed.

## 4. Failed or Duplicate Payments

If payment fails but money is deducted, or a duplicate payment occurs, customers should contact VenueOne with the transaction reference.

Verified eligible amounts will be handled through the payment provider.

## 5. No-Shows and Disputes

Customers who fail to use a confirmed booking may not be eligible for a refund.

Booking disputes should be reported to VenueOne with relevant details.

## 6. Changes to This Policy

VenueOne may update this policy when necessary. The applicable rules will be displayed to customers before booking.

## 7. Contact

For cancellations, refunds or payment-related issues:

VenueOne
venueone.team@gmail.com
https://venueone-team.vercel.app
$policy$,
  requires_legal_review = false,
  updated_at = now()
where slug = 'refund-policy';
