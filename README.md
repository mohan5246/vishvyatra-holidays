# VishvYatra Holidays Enhancements (WordPress plugin)

Built by Nithiyaa Technologies (NTX) for https://vishvyatraholidays.com/.

## Why a plugin

The live site is WordPress 6.1 with a custom Divi child theme (`Vishv-Yatra-Holidays`), Contact Form 7, WP Contact Slider ("Enquiry Now" side tab), Easy Contact Popup ("Contact Now" modal), WP Carousel Free and WP Testimonial. The theme source and database were not available to us, so every change ships as one self-contained plugin. It runs on top of the current theme:

- The theme, header, navigation, footer, images, page content, SEO metadata and existing URLs are untouched.
- No new framework and no new database tables. Enquiries use a private custom post type in the existing WordPress database.
- If you deactivate the plugin, the site goes back to exactly how it is today. Nothing is deleted.

## What it does

| Requirement | Implementation |
|---|---|
| Service-selection popup | Homepage only, once per browser session (`sessionStorage`). It's an accessible dialog with focus trap, Escape to close, arrow-key navigation and focus restore, and it fits mobile screens. "Explore all services" goes to the existing `/services/` page. |
| Service pages | Existing pages are reused: `/international-tours/`, `/domestic-tours/`, `/visa-services/`, `/air-ticketing/` (flight booking) and `/transport/` (cabs). New pages are created on activation: `/hotel-booking/`, `/passport-services/`, `/other-enquiries/`. On existing pages, a "What we can help with / Important information" panel and the enquiry form are added **below** the existing content. |
| Enquiry forms | One schema per form in `includes/config/forms.php`, used for both browser and server validation. Errors appear beside each field and values are kept. Duplicate submissions are blocked by disabling the button while sending and by an idempotency key checked on the server. |
| Tours | One shared form. The tour type comes from the page (International or Domestic) and the server enforces it. Destination lists are in `includes/config/destinations.php` (taken from the site's own tour pages) and include an "Other" option with a text field. Budgets are in ₹; the rules are min ≤ max and at least one traveller. |
| Visa | "Visa Service Amount: ₹5,000" comes from `includes/config/visa.php`, with optional per-country or per-category overrides. Text makes clear this is the agency charge only: embassy, VFS and other third-party fees are separate, and approval is not guaranteed. Includes a "Request Special Price" button and a "Download Visa Document Checklist" button that produces a real styled `.xlsx` file (title, disclaimer, five columns, Yes/No drop-down, verification reminder), generated in the browser with no library. |
| Flight / Cab / Hotel / Passport / Other | Forms follow the brief. Date rules: return ≥ departure, check-out > check-in, return > pickup. The passport form collects no passport or Aadhaar numbers and no file uploads. The "Other" form makes email required if the visitor picks "Email" as their contact method. |
| Chatbot | Rule-based state machine. All text is in `includes/config/chatbot.php`, and "details we will ask for" is generated from each form's required fields. It has Back, Main menu and Close controls and keeps the conversation across pages. Typed text gets a polite fallback. It uses no AI and no external service. "Request a Quote" opens the service page and focuses the form, and the panel closes so it never covers the form. |
| Homepage enquiry form removed | The "Enquiry Now" slider and "Contact Now" popup are hidden on the homepage (`settings.php > general_enquiry.hide_on`; can be set to `all`). In their place: a "Get a Quote" side tab that opens the service popup, and a "What are you looking for today?" service grid at the end of the homepage. The Contact Us page form is untouched. |
| Pay Now removed | Removes every "Pay Now" link (Divi code modules + footer, linking to `/qr-code/`) and the footer **"Gift Card" PayUmoney link** from the rendered HTML. `/qr-code/` redirects to the homepage for visitors (editors can still open it). The QR page, widgets and any payment records are kept. |
| WhatsApp (on hold) | All forms post to one REST endpoint (`POST /wp-json/vishvyatra/v1/enquiries`), which builds one payload and passes it to replaceable adapters (`includes/adapters/`). The WhatsApp adapter is disabled and its send method is deliberately not implemented. The number and token can only come from `wp-config.php` constants and are never sent to the browser. |

### Enquiry payload

```json
{
  "schema_version": 1,
  "reference": "VY-261016-1JKY0",
  "channel": "website",
  "request_type": "special_price",
  "service": { "key": "visa", "label": "Visa Services", "form": "visa" },
  "customer": { "name": "…", "mobile": "…", "email": "" },
  "answers": [ { "field": "country", "label": "Destination country", "value": "Iceland" } ],
  "values": { "…": "…" },
  "pricing": { "visa_service_amount": 5000, "currency": "INR", "note": "…" },
  "source_page": "https://…/visa-services/",
  "submitted_at": "2026-10-16T07:10:38+05:30"
}
```

Tour payloads also include `service.tour_type`.

## Configuration

All configuration is in `includes/config/*.php`. To change values without editing plugin files, use a small mu-plugin:

```php
add_filter( 'vy_settings', function ( $s ) {
    $s['submission']['notify_email'] = 'crs@vishvyatraholidays.com'; // email a copy of each enquiry
    $s['general_enquiry']['hide_on'] = 'all';
    return $s;
} );
add_filter( 'vy_config_visa', function ( $v ) {
    $v['pricing']['by_country']['USA'] = 7500;
    return $v;
} );
```

- `submission.mode`: `local` records enquiries under **WP Admin → Enquiries** (visible to editors and admins only). `mock` validates but stores nothing, and tells the visitor the enquiry was only prepared.
- Spam protection: a honeypot field plus a rate limit of 8 submissions per 10 minutes per IP.
- Shortcodes, if you'd rather place blocks in the Divi builder: `[vy_enquiry_form service="visa"]`, `[vy_service_page service="hotel"]`, `[vy_service_grid]`. If a page already contains one, nothing is added automatically. Set `auto_insert` to `false` to turn off automatic placement everywhere.

## Deployment

1. Take a full backup of the site (files and database).
2. Upload `vishvyatra-enhancements.zip` under Plugins → Add New → Upload, then activate. Activation creates the three missing pages only if they don't already exist.
3. Clear the Divi cache (Divi → Theme Options → Builder → Advanced → Static CSS file generation → Clear) and any page or CDN cache.
4. Add the three new pages to the menu (Appearance → Menus) if you want them in navigation.
5. Check the homepage, each service page and the footer on desktop and mobile.

Requires WordPress 6.1+ and PHP 7.4+.

## Testing done

The plugin was run on a local WordPress install (Twenty Twenty-One theme, SQLite, with mock copies of the live site's footer links and slider/popup markup). We could not test against the real Divi theme because the theme files were not available, so do a visual check on staging after installing.

Automated browser test: 44 checks, all passing. They cover the popup (open once per session, keyboard, Escape, mobile fit), every form's validation rules, the International and Domestic destination lists, Other fields, a double-click creating exactly one record, server-side validation rejecting tampered input, the chatbot flow, fallback and navigation, the launcher not covering the submit button on mobile, no Pay Now or Gift Card links, and no JavaScript errors. The downloaded workbook was opened with openpyxl and has the expected styles, merges, column widths and Yes/No validation.

## Open items for the client

- **Existing visa page copy** says "Zero chances of getting your VISA rejected" and "Higher Chances of Visa Approval". This conflicts with the no-guarantee wording required for the new section. We did not edit existing content; please confirm whether it should be changed.
- **Visa amount**: confirm whether ₹5,000 is per applicant or per application, and whether it varies by country or visa type. The config already supports both.
- **Gift Card (PayUmoney)**: removed as a payment link. Confirm, or remove `gift card` / `payumoney.com` from `payments` in `settings.php`.
- **Notification email**: off by default. Set `notify_email` so the team is alerted to new enquiries; otherwise check WP Admin → Enquiries.
- **WhatsApp**: needs the official WhatsApp Business number, Cloud API credentials and an approved message template before the adapter is implemented.
- **Privacy**: enquiries contain personal data. Agree how long they are kept and add a line to the privacy policy.

## Try it on WordPress Playground

`blueprint.json` builds a disposable test site in your browser with [WordPress Playground](https://playground.wordpress.net/). It uses placeholder pages at the live site's URLs, the Twenty Twenty-One theme, and this plugin installed from GitHub.

    https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/mohan5246/vishvyatra-holidays/main/blueprint.json

This needs the repository to be **public**, because Playground can't read private repos. Everything runs in the visitor's own browser: enquiries are saved only there and disappear when the tab is closed. This does not test the real Divi theme; use a staging copy of the live site for that.

## Static test copy (exact replica of the live site + the new features)

For review without WordPress, `tools/` builds a static copy of the live site's public pages with the plugin's features added. It is published on the `gh-pages` branch (GitHub Pages).

    python3 tools/crawl_live_site.py live/ 200
    wp eval-file tools/export_plugin_output.php > plugin-output.json     # on any WordPress with the plugin active
    python3 tools/build_static_demo.py live/ plugin-output.json out/ /vishvyatra-holidays/

How the test copy differs from the real site:
- Forms run in demo mode: they are checked in the browser but nothing is sent.
- The site's existing Contact Form 7 forms are switched off, so no test messages reach the business.
- Pages are marked noindex and carry a "TEST COPY" label.
- Images and theme files still load from the live website, apart from the theme's icon font, which is copied into the test copy because the live server blocks cross-domain fonts.
