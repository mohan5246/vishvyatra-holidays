End-to-end browser test (Playwright). Run against a WordPress site with the plugin active:

    BASE=http://localhost:8080 node tests/e2e.js

It expects pages with the slugs used on the live site (international-tours, domestic-tours, visa-services, air-ticketing, transport) to exist, and it submits real enquiries (use a staging site, or set submission mode to 'mock').
