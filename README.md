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
| Service-selection popup | Homepage only, on every homepage visit (`popup.frequency` = `every_visit`; set it to `session` for once per visit). `?show_popup=1` always shows it. It's an accessible dialog with focus trap, Escape to close, arrow-key navigation and focus restore, and it fits mobile screens. "Explore all services" goes to the existing `/services/` page. |
| Smart Quote Bar | Slides in under the header on every page with an enquiry form. It is worded for the page: "Planning **Best of Niagara Falls with Buffalo**?" with chips for "USA" and "09 Nights / 10 Days", or "Visa assistance · Service amount ₹5,000". It has a mobile-number box and a **Get my free quote** button that jumps to the form, fills in the number, highlights the form and puts the cursor on the next empty field. It hides while the form is on screen, and the visitor can close it for the rest of the visit. On phones it has a compact two-line layout. Text is in `settings.php > quote_bar`. |
| Travel quiz | 5 easy picture questions, using the website's own photos (12-question pool, 5 at random per visitor). Getting all 5 right unlocks **10% off the quotation**, with a confetti and "10% OFF" stamp animation and a reward code (`VYQ-XXXXXX`). It is offered on every page: an invite card slides up a few seconds after landing (on the homepage, after the service popup is closed), and a 🎁 "Win 10% off" button stays on every page until the visitor plays. It's one quiz per visitor: a wrong answer uses up the chance, and an unfinished quiz resumes where it left off. The server re-checks the answers before issuing a code (`POST /wp-json/vishvyatra/v1/quiz/claim`). The code is added to every enquiry the visitor sends and checked against issued codes, so WP Admin shows "Quiz reward: 10% off, code …, verified". Questions, percentage and terms are in `includes/config/quiz.php`. **The client must confirm the reward terms before go-live.** The limit is per browser: someone could replay in a private window, so the team should apply the reward once per customer when quoting. |
| Package catalogue | Built from the site's own package posts: title, photo, days, places, India or abroad, and themes (beach, mountains, culture, adventure, pilgrimage, city) found from the package's own words. Served at `GET /wp-json/vishvyatra/v1/packages` and cached; it refreshes when posts change. Theme words are in `includes/config/engage.php`. |
| Holiday Finder | 4 taps (Where? Vibe? How long? Who?) → up to 6 matching **real** packages as photo cards with ♡, "View trip" and "Get quote". The "Who" answer prefills the traveller counts on tour forms. If nothing matches every answer, it shows the closest packages and says so. Opened from the homepage service grid, the homepage popup and the chatbot ("✨ Find my perfect holiday"). |
| Wishlist & compare | ♡ on every package card (theme listing pages and Finder results) and a "Save to My Trips" button under each package title. A "♥ My Trips" button appears once something is saved. It lists saved trips, compares 2–3 side by side (duration, a days bar, places, India/abroad, best for), and can **send the whole list as one enquiry**, which prefills the general form on Other Enquiries. Saved per browser (localStorage). |
| Interactive itinerary | On package pages, the "Day 1 / Day 2…" accordion becomes a journey timeline. A plane moves down the route as you scroll, numbered stops fill in, and days expand and collapse (with "Expand all"). "✎ I'd like to change this day" adds "Please customise: Day 3 (…)" to the enquiry notes. The original accordion stays in the page, hidden, for search engines. |
| Destination stories | Instagram-style circles on the homepage under the banner: Kerala, Kashmir, Dubai, Singapore, Bali, Maldives, Europe and Egypt. Each story steps through the site's own photos with captions: tap or swipe, hold to pause, keyboard arrows. It ends on a card with "See packages", "Get a quote" and "Find my perfect holiday". Seen stories turn grey. Stories, photos and captions are in `includes/config/engage.php`. |
| Service pages | Existing pages are reused: `/international-tours/`, `/domestic-tours/`, `/visa-services/`, `/air-ticketing/` (flight booking) and `/transport/` (cabs). New pages are created on activation: `/hotel-booking/`, `/passport-services/`, `/other-enquiries/`. On existing pages, a "What we can help with / Important information" panel and the enquiry form are added **below** the existing content. |
| Enquiry forms | One schema per form in `includes/config/forms.php`, used for both browser and server validation. Errors appear beside each field and values are kept. Duplicate submissions are blocked by disabling the button while sending and by an idempotency key checked on the server. |
| Tours | One shared form. The tour type comes from the page (International or Domestic) and the server enforces it. Destination lists are in `includes/config/destinations.php` (taken from the site's own tour pages) and include an "Other" option with a text field. Budgets are in ₹; the rules are min ≤ max and at least one traveller. |
| Visa | "Visa Service Amount: ₹5,000" comes from `includes/config/visa.php`, with optional per-country or per-category overrides. Text makes clear this is the agency charge only: embassy, VFS and other third-party fees are separate, and approval is not guaranteed. Includes a "Request Special Price" button and a "Download Visa Document Checklist" button that produces a real styled `.xlsx` file (title, disclaimer, five columns, Yes/No drop-down, verification reminder), generated in the browser with no library. |
| Flight / Cab / Hotel / Passport / Other | Forms follow the brief. Date rules: return ≥ departure, check-out > check-in, return > pickup. The passport form collects no passport or Aadhaar numbers and no file uploads. The "Other" form makes email required if the visitor picks "Email" as their contact method. |
| Chatbot | Rule-based state machine. All text is in `includes/config/chatbot.php`, and "details we will ask for" is generated from each form's required fields. It has Back, Main menu and Close controls and keeps the conversation across pages. Typed text gets a polite fallback. It uses no AI and no external service. "Request a Quote" opens the service page and focuses the form, and the panel closes so it never covers the form. |
| Enquiry on every page | Each page gets the right form, prefilled from the page (rules in `includes/config/page-context.php`, logic in `VY_Context`). **Package posts** get the tour form with International or Domestic and the destination taken from the post's categories or title, the number of days from "Duration", and the package name shown on the form and saved with the enquiry. Example: *Best of Niagara Falls with Buffalo* → International, USA, 10 days. Country and region tour pages get the tour form; visa pages the visa form; MICE, Forex, Study-in-… and similar pages the general form with that subject selected; all other pages the general form. The theme's sidebar "Contact Enquiry" widget (Contact Form 7) becomes a short "Enquire about this package" card that jumps to the form. Other CF7 forms on those pages are replaced by our form. CF7 itself and its saved forms are unchanged (`contact_form_7.replace` in `settings.php`). |
| Homepage enquiry form removed | The "Enquiry Now" slider and "Contact Now" popup are hidden on the homepage (`settings.php > general_enquiry.hide_on`; can be set to `all`). They are now hidden on every page (`general_enquiry.hide_on` = `all`), since every page has its own form. A "Get a Quote" side tab on every page jumps to that page's form, or on the homepage opens the service popup. The homepage also gets a "What are you looking for today?" service grid at the end. |
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

- **Quiz reward terms**: confirm what the 10% applies to (agency service charge, full package, exclusions), validity, and one-per-customer rules, then update `terms` in `includes/config/quiz.php`.

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
    python3 tools/build_static_demo.py extract live/ pages.json
    VY_PAGES=pages.json wp eval-file tools/export_plugin_output.php > plugin-output.json   # on any WordPress with the plugin active
    python3 tools/build_static_demo.py live/ plugin-output.json out/ /vishvyatra-holidays/

How the test copy differs from the real site:
- Forms run in demo mode: they are checked in the browser but nothing is sent.
- The site's existing Contact Form 7 forms are switched off, so no test messages reach the business.
- Pages are marked noindex and carry a "TEST COPY" label.
- Images and theme files still load from the live website, apart from the theme's icon font, which is copied into the test copy because the live server blocks cross-domain fonts.
