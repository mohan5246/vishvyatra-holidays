<?php
/**
 * Destination dropdown lists for the tour enquiry form.
 *
 * Based on the destinations already listed on the website's International
 * and Domestic tour pages. Add or remove entries freely; the form also
 * offers "Other" with a free-text field.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(
	'international' => array(
		'Asia'        => array( 'Bali (Indonesia)', 'Cambodia', 'China', 'Dubai (UAE)', 'Hong Kong', 'Japan', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam' ),
		'Europe'      => array( 'Switzerland', 'United Kingdom (London)', 'France', 'Greece', 'Italy', 'Spain', 'Europe multi-country' ),
		'Middle East' => array( 'Egypt', 'Israel', 'Jordan', 'Oman', 'Qatar', 'Turkey' ),
		'Africa'      => array( 'South Africa', 'Kenya', 'Seychelles', 'Zimbabwe', 'Morocco' ),
		'Americas'    => array( 'USA', 'Canada', 'Alaska', 'Central America', 'South America' ),
		'Islands'     => array( 'Maldives', 'Mauritius', 'Sri Lanka', 'Madagascar', 'Reunion' ),
		'Pacific'     => array( 'Australia', 'New Zealand', 'Fiji' ),
	),
	'domestic'      => array(
		'North India' => array( 'Delhi', 'Agra', 'Jaipur & Rajasthan', 'Varanasi', 'Haridwar & Rishikesh', 'Mussoorie', 'Shimla & Manali', 'Kashmir', 'Ladakh', 'Jim Corbett' ),
		'South India' => array( 'Kerala', 'Munnar', 'Ooty', 'Kodaikanal', 'Coorg', 'Wayanad', 'Madurai & Rameswaram', 'Chennai & Mahabalipuram', 'Pondicherry', 'Hyderabad', 'Andaman Islands' ),
		'East India'  => array( 'Darjeeling', 'Gangtok & Pelling (Sikkim)', 'Meghalaya', 'Assam', 'Odisha (Puri & Konark)', 'Kolkata' ),
		'West India'  => array( 'Goa', 'Mumbai', 'Pune & Mahabaleshwar', 'Aurangabad (Ajanta & Ellora)', 'Gujarat' ),
	),
);
