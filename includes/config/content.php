<?php
/**
 * Service information shown above each enquiry form.
 *
 * Existing pages keep all their current content; this block is added below
 * it. `intro` is used only for the pages this plugin creates (hotel,
 * passport, other), which have no existing content.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(
	'international_tours' => array(
		'includes'  => array( 'Itinerary planned around your dates, interests and budget', 'Flights, hotels, transfers and sightseeing arranged together', 'Visa and travel insurance guidance for your destination', 'Family, honeymoon, group and educational tours' ),
		'important' => array( 'Every international tour is quoted individually - prices depend on travel dates, hotel availability and exchange rates.', 'Visa fees, travel insurance and personal expenses are quoted separately unless your quotation says otherwise.', 'Your passport should usually be valid for at least 6 months beyond your return date.' ),
	),
	'domestic_tours'      => array(
		'includes'  => array( 'Tours across North, South, East and West India', 'Hotel stays, local transport and sightseeing', 'Family, pilgrimage, honeymoon, group and educational trips', 'Customised day-wise itineraries' ),
		'important' => array( 'Each tour is quoted individually based on dates, hotel category and group size.', 'Peak-season and festival dates may need early booking.' ),
	),
	'visa'                => array(
		'includes'  => array( 'Guidance on the documents your visa type needs', 'Help filling in the application form', 'Booking embassy / VFS appointments', 'Updates while your application is processed' ),
		'important' => array(),
	),
	'flight'              => array(
		'includes'  => array( 'Domestic and international air tickets', 'One-way and round-trip itineraries', 'Group and family bookings', 'Date changes and rescheduling support' ),
		'important' => array( 'Fares are not displayed live on this website. Our team will share current options; a fare is confirmed only when the ticket is issued.', 'Please make sure names match your passport / ID exactly.' ),
	),
	'cab'                 => array(
		'includes'  => array( 'Local city trips and sightseeing', 'Outstation trips', 'Airport and railway station transfers', 'Cars, SUVs, tempo travellers and buses' ),
		'important' => array( 'A vehicle is booked only after our team confirms availability and the fare with you.', 'Tolls, parking, permits and driver allowance may apply depending on the trip.' ),
	),
	'hotel'               => array(
		'intro'     => 'Looking for the right place to stay? VishvYatra Holidays can arrange hotels, resorts and serviced stays in India and abroad - for holidays, business trips, family functions and groups. Share your city, dates and preferences and we will suggest suitable options.',
		'includes'  => array( 'Hotels and resorts in India and abroad', 'Budget to 5-star categories', 'Group and multi-room bookings', 'Meal plans and special requests' ),
		'important' => array( 'Room rates and availability change daily and are confirmed by our team before booking.', 'Hotel cancellation policies vary and will be shared with your quote.' ),
	),
	'passport'            => array(
		'intro'     => 'VishvYatra Holidays offers assistance with passport applications - helping you understand the process, prepare your documents and book your appointment. Passports are issued only by the Government of India through Passport Seva; we are a private travel agency and not a government office.',
		'includes'  => array( 'New passport applications', 'Renewal / reissue of passports', 'Lost or damaged passport applications', 'Help with document preparation and appointment booking' ),
		'important' => array( 'Passport applications are decided and processed by the Passport Seva / Regional Passport Office. We cannot guarantee appointment availability, approval or processing time.', 'Government passport fees are payable separately to the passport office.', 'Do not send passport numbers, Aadhaar numbers or document images through this form - we will tell you securely what is needed.' ),
	),
	'other'               => array(
		'intro'     => 'Besides tours, visas and tickets, VishvYatra Holidays handles MICE events, trade fairs, destination weddings, cruise packages, forex, travel insurance and more. If your requirement is not listed, tell us about it here.',
		'includes'  => array( 'MICE and corporate travel', 'Trade fairs and exhibitions', 'Destination weddings', 'Cruises, forex, travel insurance and more' ),
		'important' => array(),
	),
);
