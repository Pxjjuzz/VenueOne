insert into platform_settings (key, value)
values
  (
    'cancellation_policy',
    '{
      "cancellationDeadlineHours": 2,
      "fullRefundHours": 72,
      "partialRefundHours": 24,
      "partialRefundPercent": 50,
      "notes": "Refund eligibility is calculated from the booking start time in India Standard Time. Platform administrators may review exceptional cases."
    }'::jsonb
  ),
  ('owner_response_hours', '48'::jsonb),
  ('platform_fee_paise', '0'::jsonb),
  ('tax_percent', '0'::jsonb)
on conflict (key) do nothing;

insert into legal_pages (slug, title, content_md, requires_legal_review)
values
  (
    'terms',
    'Terms and Conditions',
    '# Terms and Conditions

> **Draft notice:** This document is a working template. It must be reviewed and completed by qualified legal counsel before the platform accepts real bookings or payments.

## 1. Who we are

This platform is operated by **[LEGAL BUSINESS NAME]**, a **[ENTITY TYPE]** registered at **[REGISTERED ADDRESS]** under registration number **[CIN / REGISTRATION NUMBER]**. References to “the platform”, “we”, “us” and “our” mean that entity.

## 2. What the platform does

The platform helps customers discover and reserve community halls and community grounds listed by independent venue owners. Venue listings are submitted by owners and reviewed before publication. We are a booking intermediary and do not own or operate the venues unless a listing explicitly says otherwise.

## 3. Accounts

You must sign in with a supported identity provider to make a booking. You are responsible for keeping access to your account secure and for information submitted through it. We may suspend accounts that are used fraudulently, unlawfully or in breach of these terms.

## 4. Venue information

Venue owners are responsible for the accuracy of listing details, photographs, facilities, capacity, dimensions, pricing and availability. We review submissions but do not independently certify every statement. Customers should confirm critical requirements directly with the venue before an event.

## 5. Bookings and payments

A booking is confirmed only after the server records a successful, verified payment or, where applicable, after the owner approval and payment steps complete. A browser success screen alone is not proof of payment. Prices are shown in Indian Rupees and include only the components displayed at checkout.

## 6. Cancellations and refunds

Cancellation eligibility and refunds are governed by the policy displayed at checkout and on the Cancellation and Refund Policy page. Refund status is recorded separately from cancellation status and is only marked processed after confirmation from the payment provider.

## 7. Acceptable use

You must not attempt to bypass access controls, scrape personal data, interfere with availability, submit false information, or use the platform for unlawful gatherings.

## 8. Liability

To the extent permitted by law, **[LIABILITY LIMITATION TO BE SET BY COUNSEL]**. Nothing in these terms excludes liability that cannot lawfully be excluded.

## 9. Governing law

These terms are governed by the laws of India. Disputes are subject to the courts at **[JURISDICTION]**.

## 10. Contact

Questions about these terms: **[GRIEVANCE EMAIL]**.

**Effective date:** [EFFECTIVE DATE]
',
    true
  ),
  (
    'privacy',
    'Privacy Policy',
    '# Privacy Policy

> **Draft notice:** This document is a working template. It must be reviewed and completed by qualified legal counsel before production use.

## 1. Controller

**[LEGAL BUSINESS NAME]**, **[REGISTERED ADDRESS]**, is the data controller for personal information processed through this platform.

## 2. Information we collect

- **Account information** from Google sign-in: name, email address, profile image and a stable account identifier.
- **Profile information** you provide, such as a phone number.
- **Booking information**: venue, date, time, guest count, event type, notes and booking history.
- **Owner application information** for venue-owner access requests, including business and contact details.
- **Payment information** processed by Razorpay. The platform stores transaction identifiers, amounts and statuses. It does not store full card or bank credentials.
- **Technical information** such as IP address, request timestamps and rate-limit counters used for security and abuse prevention.
- **Communications** you send through the contact form.

## 3. Why we use it

To provide accounts, process bookings and payments, coordinate with venue owners, prevent fraud and abuse, comply with legal obligations, and improve the reliability of the service.

## 4. Sharing

Booking details are shared with the relevant venue owner. Payment data is processed by Razorpay under its own privacy terms. Infrastructure providers process data on our behalf. We do not sell personal information.

## 5. Retention

We retain booking and payment records for as long as required for accounting, dispute resolution and legal compliance. Account and marketing data are retained according to **[RETENTION SCHEDULE TO BE DEFINED]**.

## 6. Security

We use server-side authorization, database row-level security, signed payment verification, restricted credentials and audit logging. No system is completely secure; report concerns to **[SECURITY CONTACT]**.

## 7. Your rights

Subject to applicable law, you may request access, correction, deletion or portability of your information, or object to certain processing. Contact **[GRIEVANCE EMAIL]**.

## 8. Cookies

We use strictly necessary cookies for authentication and security. Analytics or marketing cookies are **not** enabled by default and require explicit configuration and consent where required.

## 9. Changes

Material changes will be notified through the platform or by email where appropriate.

**Effective date:** [EFFECTIVE DATE]
',
    true
  ),
  (
    'refund-policy',
    'Cancellation and Refund Policy',
    '# Cancellation and Refund Policy

> **Draft notice:** The operational rules below are configured in the platform settings. This page must be completed and legally reviewed before production use.

## 1. Requesting a cancellation

Signed-in customers can request cancellation from the booking detail page. A request records the time, reason and the policy values that applied when the booking was made.

## 2. Eligibility windows

The platform calculates cancellation and refund eligibility from the booking start time in India Standard Time using the policy configured by the platform administrator. The current policy is shown before booking and on the booking page. It includes:

- a cancellation request deadline;
- a full-refund window;
- a partial-refund window and percentage;
- a no-refund period.

Do not rely on generic expectations; the values displayed at checkout govern the booking.

## 3. Approval and refunds

A cancellation request is reviewed by a platform administrator. Approval changes the booking to cancelled and releases the reserved time. Refunds are recorded as a separate transaction. A refund is marked **processed** only after the payment provider confirms it. Bank settlement times are controlled by the provider and your bank.

## 4. Non-refundable amounts

**[NON-REFUNDABLE COMPONENTS TO BE DEFINED BY COUNSEL AND FINANCE]**. Payment gateway charges, if any, are handled as described at checkout.

## 5. Venue-initiated changes

If a venue cannot honour a confirmed booking, the platform may cancel the booking and initiate an appropriate refund. **[VENUE FAILURE POLICY TO BE DEFINED]**.

## 6. Exceptions

Requests outside the configured windows may be reviewed at the platform’s discretion. Nothing in this policy limits rights available under applicable consumer law.

## 7. Contact

Refund questions: **[GRIEVANCE EMAIL]**.

**Effective date:** [EFFECTIVE DATE]
',
    true
  ),
  (
    'about',
    'About',
    '# About this platform

This platform exists to make community infrastructure easier to find and reserve. It brings community halls and community grounds into one directory, gives venue owners a clear way to present and manage their spaces, and gives customers a reliable booking record.

## What is available now

Phase 1 is the web platform: discovery, owner onboarding and approval, venue submission and review, availability, bookings, test-mode payments, cancellation handling and administrative controls.

## What is planned

- **Phase 2:** an interactive, untextured 3D venue viewer for desktop and laptop browsers, built from venue photographs and measurements. It is not part of the current release.
- **Phase 3:** an Android application that will use the same accounts, database and booking engine as the website.

## How listings work

Venue owners apply for access. Approved owners submit venues. Each venue is reviewed separately before it can be published. The directory is intentionally empty until real venues complete that process; the platform does not publish sample or fictional listings.

## Contact

Use the Contact page for questions, corrections or partnership enquiries.
',
    false
  ),
  (
    'contact',
    'Contact',
    '# Contact

Use the form on this page to reach the platform team. Messages are stored for follow-up and are not published.

**Support email:** [SUPPORT EMAIL]

**Registered address:** [REGISTERED ADDRESS]

**Grievance officer:** [GRIEVANCE OFFICER NAME], [GRIEVANCE EMAIL]

**Response times:** [SUPPORT RESPONSE COMMITMENT]
',
    true
  )
on conflict (slug) do nothing;
