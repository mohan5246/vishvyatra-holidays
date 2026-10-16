<?php
/**
 * Service catalogue: one entry per service shown in the popup and chatbot.
 *
 * `slug` is the WordPress page slug. Existing website pages are reused where
 * they already exist (international-tours, domestic-tours, visa-services,
 * air-ticketing, transport); the rest are created on plugin activation.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(
	'international_tours' => array(
		'label'     => 'International Tours',
		'slug'      => 'international-tours',
		'existing'  => true,
		'form'      => 'tour',
		'tour_type' => 'international',
		'icon'      => 'globe',
		'summary'   => 'Tailor-made holidays abroad across Asia, Europe, the Middle East, Africa, the Americas, islands and the Pacific.',
	),
	'domestic_tours'      => array(
		'label'     => 'Domestic Tours',
		'slug'      => 'domestic-tours',
		'existing'  => true,
		'form'      => 'tour',
		'tour_type' => 'domestic',
		'icon'      => 'map',
		'summary'   => 'Tour packages across North, South, East and West India planned around your dates and budget.',
	),
	'visa'                => array(
		'label'    => 'Visa Services',
		'slug'     => 'visa-services',
		'existing' => true,
		'form'     => 'visa',
		'icon'     => 'stamp',
		'summary'  => 'Guidance with visa documentation, application forms and embassy or VFS appointments.',
	),
	'flight'              => array(
		'label'    => 'Flight Booking',
		'slug'     => 'air-ticketing',
		'existing' => true,
		'form'     => 'flight',
		'icon'     => 'plane',
		'summary'  => 'Domestic and international air tickets. Share your route and dates and we will send a fare quote.',
	),
	'cab'                 => array(
		'label'    => 'Cabs / Vehicle Rentals',
		'slug'     => 'transport',
		'existing' => true,
		'form'     => 'cab',
		'icon'     => 'car',
		'summary'  => 'Local, outstation and airport transfers in cars, SUVs and tempo travellers.',
	),
	'hotel'               => array(
		'label'    => 'Hotel Booking',
		'slug'     => 'hotel-booking',
		'existing' => false,
		'form'     => 'hotel',
		'icon'     => 'bed',
		'summary'  => 'Hotel stays in India and abroad matched to your city, dates, category and budget.',
	),
	'passport'            => array(
		'label'    => 'Passport Issue / Renewal',
		'slug'     => 'passport-services',
		'existing' => false,
		'form'     => 'passport',
		'icon'     => 'passport',
		'summary'  => 'Help with preparing new, renewal / reissue and lost or damaged passport applications.',
	),
	'other'               => array(
		'label'    => 'Others',
		'slug'     => 'other-enquiries',
		'existing' => false,
		'form'     => 'other',
		'icon'     => 'chat',
		'summary'  => 'MICE, trade fairs, destination weddings, cruises, forex and anything else you need.',
	),
);
