<?php
/**
 * Visa service configuration: service amount, countries, categories and the
 * downloadable document checklist.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(

	/*
	 * VishvYatra Holidays' visa service amount (agency service charge).
	 *
	 * `default` is the business-provided amount for this release. If the
	 * amount later varies, add entries to `by_country` and/or `by_category`
	 * (country beats category beats default), e.g.
	 *   'by_country'  => array( 'USA' => 7500 ),
	 *   'by_category' => array( 'Student' => 6000 ),
	 */
	'pricing'    => array(
		'currency'    => 'INR',
		'default'     => 5000,
		'by_country'  => array(),
		'by_category' => array(),
		'label'       => 'Visa Service Amount',
		'notes'       => array(
			'This is VishvYatra Holidays\' service charge for visa assistance.',
			'Embassy / consulate visa fees, visa application centre (VFS / BLS etc.) charges, travel insurance, courier and other third-party costs are not included and are payable separately as applicable.',
			'Visa decisions are made solely by the embassy or consulate. We help you prepare a complete application but cannot guarantee approval or processing times.',
		),
	),

	// Destination countries offered in the dropdown. The first group comes
	// from the "Visa Country" list already on the Visa Services page.
	'countries'  => array(
		'Australia', 'Armenia', 'Bahrain', 'Cambodia', 'Canada', 'Dubai / United Arab Emirates', 'Ethiopia', 'Georgia',
		'Hong Kong', 'Jordan', 'Kenya', 'Kuwait', 'Malaysia', 'Myanmar', 'Oman', 'Qatar', 'Schengen (Europe)',
		'Singapore', 'Sri Lanka', 'Thailand', 'Turkey', 'United Kingdom', 'USA', 'Vietnam',
	),

	// Visa types listed on the existing Visa Services page.
	'categories' => array( 'Tourist', 'Business', 'Student', 'Employment', 'Medical', 'Conference', 'Journalist', 'Intern', 'Dependent / Family', 'Other' ),

	/*
	 * Document checklist used for the Excel download.
	 *
	 * requirement: 'Generally required' | 'Conditionally required' | 'Country-specific'
	 * Add country-specific lists under `by_country` using the same country
	 * names as above; they are added as an extra sheet when that country is
	 * selected in the form.
	 */
	'checklist'  => array(
		'title'      => 'VishvYatra Holidays - Visa Document Checklist',
		'disclaimer' => 'This is a general checklist to help you prepare. Requirements differ by country, visa category and your circumstances, and not every item applies to every application. Always verify the latest requirements with the destination country\'s official embassy, consulate or visa application centre before applying.',
		'reminder'   => 'Reminder: verify the latest document list, photo specifications and fees on the official embassy / consulate / visa application centre website before you submit your application.',
		'general'    => array(
			array( 'Passport', 'Original passport, usually valid for at least 6 months beyond your return date, with blank visa pages. Include old passports if any.', 'Generally required' ),
			array( 'Passport copies', 'Copies of the passport bio-data page, address page and previous visas.', 'Generally required' ),
			array( 'Visa application form', 'Completed and signed application form (online or paper) as prescribed by the embassy.', 'Generally required' ),
			array( 'Passport-size photographs', 'Recent colour photographs. Size, background and number vary by country.', 'Generally required' ),
			array( 'Travel itinerary', 'Day-wise plan of your trip, including cities you will visit.', 'Conditionally required' ),
			array( 'Accommodation details', 'Hotel bookings, or an invitation / address proof of your host if staying with friends or family.', 'Conditionally required' ),
			array( 'Flight reservation', 'Return or onward flight reservation / itinerary. Some countries ask for this only at a later stage.', 'Conditionally required' ),
			array( 'Financial proof', 'Bank statements (often last 3-6 months), income tax returns or sponsor\'s financial documents.', 'Generally required' ),
			array( 'Employment documents', 'Employer leave / NOC letter and recent salary slips, for salaried applicants.', 'Conditionally required' ),
			array( 'Business documents', 'Business registration, GST / company documents and a covering letter, for self-employed applicants.', 'Conditionally required' ),
			array( 'Student documents', 'Admission / enrolment letter, bonafide certificate or university documents, for students.', 'Conditionally required' ),
			array( 'Travel insurance', 'Travel medical insurance meeting the destination\'s minimum cover, where mandated (e.g. Schengen).', 'Country-specific' ),
			array( 'Invitation letter', 'Invitation from a host, company or event organiser, for business, conference or family visits.', 'Conditionally required' ),
			array( 'Covering letter', 'Letter explaining the purpose and duration of travel.', 'Conditionally required' ),
			array( 'Visa-category supporting documents', 'Documents specific to the visa type, e.g. medical appointment letters, conference registration, offer letter or work permit.', 'Country-specific' ),
			array( 'Minor applicants', 'Birth certificate and parents\' consent / passport copies for applicants under 18.', 'Conditionally required' ),
		),
		'by_country' => array(),
	),
);
