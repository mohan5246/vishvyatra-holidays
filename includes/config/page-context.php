<?php
/**
 * Which enquiry form each page gets, and what is prefilled.
 *
 * Order of rules (first match wins), see VY_Context::resolve():
 *   1. `exclude`          - no form (homepage uses the popup + service grid)
 *   2. service pages      - from services.php
 *   3. `other_pages` / `other_prefixes` - general form with this subject
 *   4. package posts      - tour form from the post's categories
 *      (e.g. america-tour-packages + usa-tour-packages -> International, USA),
 *      the post title and its "Duration ... Days"
 *   5. pages named "<place>-tour-packages" - tour form for that place/region
 *   6. anything else      - general form, subject "General enquiry"
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(
	'exclude'        => array( 'qr-code' ),

	'other_pages'    => array(
		'mice'                  => 'MICE',
		'eventz'                => 'MICE',
		'trade-fair'            => 'Trade fair',
		'destination-wedding'   => 'Destination wedding',
		'cruise-packages'       => 'Cruise packages',
		'honey-moon-packages'   => 'Honeymoon packages',
		'educational-tours'     => 'Educational tours',
		'educational-tour'      => 'Educational tours',
		'family-tours'          => 'Family tours',
		'family-tour'           => 'Family tours',
		'adventure-tours'       => 'Adventure tours',
		'forex-trading-services' => 'Forex',
		'security-service'      => 'Security service',
		'overseas-education'    => 'Overseas education',
		'insurance-investments' => 'Travel insurance',
	),
	'other_prefixes' => array(
		'study-in-' => 'Overseas education',
	),

	// Slug endings that mark a tour category or tour page.
	'tour_suffixes'  => array( '-tour-packages', '-tours-packages', '-tour-package', '-tours', '-packages' ),
	// Plain tour slugs without a suffix.
	'tour_slugs'     => array( 'middle-east' ),

	// Regions: used as context, not as a single destination.
	'regions'        => array( 'africa', 'america', 'asia', 'europe', 'middle-east', 'island', 'pacific', 'central-america', 'south-america', 'india', 'north-india', 'south-india', 'east-india', 'west-india', 'tours', 'holiday', 'honey-moon' ),

	// Slugs containing one of these are domestic (India) tours.
	'domestic_markers' => array( 'india', 'kerala', 'goa', 'kashmir', 'ladakh', 'rajasthan', 'andaman', 'sikkim', 'darjeeling', 'ooty', 'munnar', 'coorg', 'manali', 'shimla', 'pondicherry' ),

	// Category / page slug base -> destination name used in the dropdown.
	'labels'         => array(
		'bail'             => 'Bali (Indonesia)',
		'bali'             => 'Bali (Indonesia)',
		'usa'              => 'USA',
		'uae'              => 'Dubai (UAE)',
		'dubai'            => 'Dubai (UAE)',
		'united-kingdom'   => 'United Kingdom (London)',
		'london'           => 'United Kingdom (London)',
		'swiss'            => 'Switzerland',
		'korea'            => 'South Korea',
		'denmark-republic' => 'Denmark',
		'belgium-kingdom'  => 'Belgium',
		'norway-kingdom'   => 'Norway',
		'netherland'       => 'Netherlands',
	),
);
