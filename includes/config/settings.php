<?php
/**
 * General settings for the VishvYatra enhancements.
 *
 * Every value here can be overridden without editing this file, via the
 * `vy_settings` filter (e.g. from a small mu-plugin) or, for secrets, via
 * constants in wp-config.php. Never put API tokens in this file.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(

	// Business contact details shown in confirmations and the chatbot.
	// Copied from the existing website footer.
	'contact'      => array(
		'phone_display' => '+91 98400 90644',
		'phone_href'    => 'tel:+919840090644',
		'landline'      => '0413-2255233',
		'email'         => 'crs@vishvyatraholidays.com',
		'address'       => '311, M.G. Road, Muthialpet, Pondicherry-03',
		'contact_page'  => '/contact-us/',
	),

	// Service-selection popup on the homepage.
	'popup'        => array(
		'enabled'      => true,
		'delay_ms'     => 600,        // Short delay so the page paints first.
		// 'every_visit' = every time the homepage loads (client's choice);
		// 'session'     = once per browsing session.
		'frequency'    => 'every_visit',
		'storage_key'  => 'vy_service_popup_seen',
	),

	/*
	 * Smart Quote Bar: slides in under the header on every page that has an
	 * enquiry form, worded for that page, and takes the visitor to the form
	 * (with their mobile number already filled in if they type it in the bar).
	 * {title} = page / package name, {service} = service name.
	 */
	'quote_bar'    => array(
		'enabled'     => true,
		'delay_ms'    => 900,
		'button'      => 'Get my free quote',
		'placeholder' => 'Your mobile number',
		'subline'     => 'Takes about a minute · No payment needed',
		'headlines'   => array(
			'package' => 'Planning {title}?',
			'tour'    => 'Exploring {title}?',
			'visa'    => 'Visa assistance · Service amount {visa_amount}',
			'service' => '{service}: tell us your plan, get a quote',
			'other'   => 'Questions about {title}? Ask our travel experts',
		),
	),

	// Chatbot launcher shown on every front-end page.
	'chatbot'      => array(
		'enabled' => true,
	),

	/*
	 * Enquiry submission.
	 *
	 * mode:
	 *   'local' - validate on the server and record the enquiry as a private
	 *             "Enquiries" entry in WP Admin (uses the existing WordPress
	 *             database, no new tables).
	 *   'mock'  - validate and build the payload but do not store or send it.
	 *             The visitor is told the enquiry was only prepared.
	 *
	 * notify_email: optional address that receives a copy of each recorded
	 * enquiry via the site's existing wp_mail() setup. Empty = disabled.
	 */
	'submission'   => array(
		'mode'             => 'local',
		'notify_email'     => '',
		'reference_prefix' => 'VY',
		'rate_limit'       => 8,    // Max submissions per visitor per 10 minutes.
	),

	/*
	 * WhatsApp delivery - ON HOLD for this release.
	 *
	 * Stays disabled until the client supplies and approves the official
	 * WhatsApp Business configuration. The destination number and token are
	 * read ONLY from wp-config.php constants (VY_WHATSAPP_NUMBER,
	 * VY_WHATSAPP_TOKEN, VY_WHATSAPP_PHONE_NUMBER_ID) on the server and are
	 * never sent to the browser.
	 */
	'whatsapp'     => array(
		'enabled' => false,
	),

	/*
	 * Online payments are disabled for this release. Links whose href
	 * contains one of these fragments, or whose text is "Pay Now", are
	 * removed from front-end pages. The QR-code page itself is not deleted;
	 * visitors who open it directly are redirected to the homepage.
	 */
	'payments'     => array(
		'disabled'          => true,
		'link_patterns'     => array( '/qr-code', 'payumoney.com', 'razorpay', 'paytm.me', 'instamojo' ),
		'link_texts'        => array( 'pay now', 'gift card' ),
		'redirect_slugs'    => array( 'qr-code' ),
	),

	/*
	 * The general "Enquiry Now" side slider (WP Contact Slider) and the
	 * "Contact Now" popup (Easy Contact Popup) are hidden on these pages.
	 * 'front_page' = homepage only; 'all' = every page (default, since every
	 * page now has its own enquiry section).
	 */
	'general_enquiry' => array(
		'hide_on' => 'all',
	),

	/*
	 * Every page except the homepage now gets its own enquiry section (see
	 * page-context.php), so the theme's Contact Form 7 enquiry forms are
	 * replaced on those pages: the sidebar "Contact Enquiry" widget becomes
	 * a short card that jumps to our form. CF7 and its saved forms are not
	 * changed; set to false to show them again.
	 */
	'contact_form_7' => array(
		'replace' => true,
	),

	// Insert the enquiry block automatically at the end of each service page.
	// Set to false if the shortcodes are placed manually in the Divi builder.
	'auto_insert'  => true,
);
