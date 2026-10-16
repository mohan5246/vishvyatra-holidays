<?php
/**
 * Rule-based chatbot script. No AI: every message, button and transition is
 * defined here, and the bot only moves between these states.
 *
 * Button actions:
 *   array( 'goto' => '<state>' )             show another state
 *   array( 'explore' => '<service key>' )    open that service page
 *   array( 'quote' => '<service key>' )      open the service page at its enquiry form
 *   array( 'url' => '/path/' )               open any page
 *   array( 'back' => true )                  previous state
 *
 * Service states are generated from services.php; `services` below supplies
 * their wording. "Details we will ask for" is generated from the required
 * fields of each service's form.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(
	'title'     => 'VishvYatra Assistant',
	'subtitle'  => 'Quick answers - pick an option',
	'launcher'  => 'Need help?',
	'greeting'  => 'Welcome to VishvYatra Holidays! How can we help you today?',
	'fallback'  => 'Sorry, I can only help with the options below. Please choose a service, or use Other Enquiries to describe what you need.',
	'needs_intro' => 'For a quote we will ask for:',

	'services'  => array(
		'international_tours' => 'We plan international holidays to Asia, Europe, the Middle East, Africa, the Americas, island destinations and the Pacific, built around your dates, group and budget.',
		'domestic_tours'      => 'We arrange tours across North, South, East and West India - hill stations, beaches, heritage and pilgrimage trips.',
		'visa'                => 'We help you prepare your visa application and documents and book embassy / VFS appointments. Our visa service amount is shown on the page; embassy and third-party fees are separate, and approval is decided by the embassy. You can also download a document checklist there.',
		'flight'              => 'We book domestic and international flights. Share your route and dates and we will send fare options - fares are confirmed by our team, not shown live online.',
		'cab'                 => 'We provide cars, SUVs, tempo travellers and buses for local trips, outstation travel and airport transfers. Availability and fare are confirmed by our team.',
		'hotel'               => 'We book hotels and resorts in India and abroad. Tell us your city, dates and preferred category and we will share options and rates.',
		'passport'            => 'We assist with new passports, renewal / reissue and lost or damaged passports. Applications are processed by the Government of India Passport Seva; we help you prepare. Appointment dates and processing times are set by the passport office.',
		'other'               => 'MICE, trade fairs, destination weddings, cruises, forex, travel insurance or something else - describe what you need and the right team member will contact you.',
	),

	'buttons'   => array(
		'explore'   => 'Explore Service',
		'quote'     => 'Request a Quote',
		'back'      => 'Back',
		'main_menu' => 'Back to Main Menu',
		'contact'   => 'Contact Details',
		'other'     => 'Other Enquiries',
	),

	'contact_message' => 'You can reach VishvYatra Holidays at the details below, or visit our Contact page.',
	'input_placeholder' => 'Type a message or pick an option',
);
