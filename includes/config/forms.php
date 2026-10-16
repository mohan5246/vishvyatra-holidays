<?php
/**
 * Enquiry form schemas.
 *
 * One schema per form, shared by the browser (rendering + instant
 * validation) and the server (authoritative validation), so the rules can
 * never drift apart.
 *
 * Field keys:
 *   type        text | email | tel | number | date | datetime-local | select | radio | textarea | hidden
 *   required    bool
 *   required_if array( field, value ) - required only when another field has that value
 *   show_if     array( field, value ) - shown (and validated) only when another field has that value
 *   options     list of values, or 'source' => destinations | visa_countries | visa_categories
 *   other       true adds an "Other" option that reveals "<name>_other" text input
 *   min / max   numeric bounds; integer => whole numbers only
 *   min_today   dates: not earlier than today
 *   prefix      shown before the input (e.g. ₹)
 *   width       'half' (default) or 'full'
 *
 * Cross-field rules:
 *   sum_min  fields[] sum >= min
 *   lte      a <= b (numbers)
 *   date_gte a >= b, date_gt a > b (dates / datetimes)
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

$vy_contact_fields = static function ( $name_label = 'Full name' ) {
	return array(
		array( 'name' => 'full_name', 'type' => 'text', 'label' => $name_label, 'required' => true, 'maxlength' => 100, 'autocomplete' => 'name' ),
		array( 'name' => 'mobile', 'type' => 'tel', 'label' => 'Mobile number', 'required' => true, 'placeholder' => 'e.g. 98400 90644', 'autocomplete' => 'tel' ),
		array( 'name' => 'email', 'type' => 'email', 'label' => 'Email address', 'required' => false, 'help' => 'Optional', 'autocomplete' => 'email' ),
	);
};

$vy_notes = array( 'name' => 'additional', 'type' => 'textarea', 'label' => 'Additional requirements', 'required' => false, 'maxlength' => 2000, 'width' => 'full', 'help' => 'Optional' );

return array(

	'tour'     => array(
		'title'  => 'Request a Tour Quote',
		'intro'  => 'Tell us about your trip and our team will prepare a custom quotation. Quotes depend on dates, hotels and availability; no price is fixed until confirmed by our team.',
		'submit' => 'Request a Quote',
		'fields' => array_merge(
			$vy_contact_fields(),
			array(
				array( 'name' => 'tour_type', 'type' => 'hidden', 'label' => 'Tour type', 'required' => true, 'options' => array( 'international', 'domestic' ) ),
				array( 'name' => 'destination', 'type' => 'select', 'label' => 'Destination', 'required' => true, 'options' => array( 'source' => 'destinations' ), 'other' => true ),
				array( 'name' => 'travel_date', 'type' => 'date', 'label' => 'Preferred travel date', 'required' => false, 'min_today' => true, 'help' => 'Optional' ),
				array( 'name' => 'travel_period', 'type' => 'text', 'label' => 'Or approximate travel period', 'required' => false, 'placeholder' => 'e.g. last week of December', 'maxlength' => 100 ),
				array( 'name' => 'travel_days', 'type' => 'number', 'label' => 'Number of travel days', 'required' => true, 'min' => 1, 'max' => 90, 'integer' => true ),
				array( 'name' => 'hotel_category', 'type' => 'radio', 'label' => 'Preferred hotel category', 'required' => true, 'options' => array( '3-star', '4-star' ) ),
				array( 'name' => 'adults', 'type' => 'number', 'label' => 'Adults', 'required' => true, 'min' => 0, 'max' => 99, 'integer' => true, 'default' => 2, 'width' => 'third' ),
				array( 'name' => 'children', 'type' => 'number', 'label' => 'Children', 'required' => true, 'min' => 0, 'max' => 99, 'integer' => true, 'default' => 0, 'width' => 'third' ),
				array( 'name' => 'elderly', 'type' => 'number', 'label' => 'Elderly travellers', 'required' => true, 'min' => 0, 'max' => 99, 'integer' => true, 'default' => 0, 'width' => 'third' ),
				array( 'name' => 'budget_min', 'type' => 'number', 'label' => 'Minimum budget (total)', 'required' => true, 'min' => 0, 'max' => 100000000, 'integer' => true, 'prefix' => '₹' ),
				array( 'name' => 'budget_max', 'type' => 'number', 'label' => 'Maximum budget (total)', 'required' => true, 'min' => 0, 'max' => 100000000, 'integer' => true, 'prefix' => '₹' ),
				$vy_notes,
			)
		),
		'rules'  => array(
			array( 'rule' => 'sum_min', 'fields' => array( 'adults', 'children', 'elderly' ), 'min' => 1, 'target' => 'adults', 'message' => 'Please include at least one traveller.' ),
			array( 'rule' => 'lte', 'a' => 'budget_min', 'b' => 'budget_max', 'target' => 'budget_max', 'message' => 'Maximum budget must be greater than or equal to the minimum budget.' ),
		),
	),

	'visa'     => array(
		'title'  => 'Visa Enquiry',
		'intro'  => 'Share your travel plans and we will confirm the documents you need and our service amount for your application.',
		'submit' => 'Request Special Price',
		'fields' => array_merge(
			$vy_contact_fields(),
			array(
				array( 'name' => 'country', 'type' => 'select', 'label' => 'Destination country', 'required' => true, 'options' => array( 'source' => 'visa_countries' ), 'other' => true ),
				array( 'name' => 'visa_category', 'type' => 'select', 'label' => 'Visa category / purpose', 'required' => false, 'options' => array( 'source' => 'visa_categories' ) ),
				array( 'name' => 'travel_date', 'type' => 'date', 'label' => 'Expected travel date', 'required' => false, 'min_today' => true ),
				array( 'name' => 'stay_days', 'type' => 'number', 'label' => 'Intended stay (days)', 'required' => true, 'min' => 1, 'max' => 3650, 'integer' => true ),
				array( 'name' => 'applicants', 'type' => 'number', 'label' => 'Number of applicants', 'required' => true, 'min' => 1, 'max' => 99, 'integer' => true, 'default' => 1 ),
				$vy_notes,
			)
		),
		'rules'  => array(),
	),

	'flight'   => array(
		'title'  => 'Request a Flight Quote',
		'intro'  => 'We do not show live fares on this website. Share your route and dates and our team will check options and send you a quote.',
		'submit' => 'Request Flight Quote',
		'fields' => array_merge(
			$vy_contact_fields( 'Passenger name' ),
			array(
				array( 'name' => 'trip_type', 'type' => 'radio', 'label' => 'Trip type', 'required' => true, 'options' => array( 'One-way', 'Round-trip' ), 'default' => 'One-way', 'width' => 'full' ),
				array( 'name' => 'origin', 'type' => 'text', 'label' => 'From (city or airport)', 'required' => true, 'maxlength' => 80, 'placeholder' => 'e.g. Chennai (MAA)' ),
				array( 'name' => 'destination', 'type' => 'text', 'label' => 'To (city or airport)', 'required' => true, 'maxlength' => 80, 'placeholder' => 'e.g. Dubai (DXB)' ),
				array( 'name' => 'departure_date', 'type' => 'date', 'label' => 'Departure date', 'required' => true, 'min_today' => true ),
				array( 'name' => 'return_date', 'type' => 'date', 'label' => 'Return date', 'required_if' => array( 'trip_type', 'Round-trip' ), 'show_if' => array( 'trip_type', 'Round-trip' ), 'min_today' => true ),
				array( 'name' => 'adults', 'type' => 'number', 'label' => 'Adults (12+ yrs)', 'required' => true, 'min' => 0, 'max' => 9, 'integer' => true, 'default' => 1, 'width' => 'third' ),
				array( 'name' => 'children', 'type' => 'number', 'label' => 'Children (2-11 yrs)', 'required' => true, 'min' => 0, 'max' => 9, 'integer' => true, 'default' => 0, 'width' => 'third' ),
				array( 'name' => 'infants', 'type' => 'number', 'label' => 'Infants (under 2)', 'required' => true, 'min' => 0, 'max' => 9, 'integer' => true, 'default' => 0, 'width' => 'third' ),
				array( 'name' => 'travel_class', 'type' => 'select', 'label' => 'Travel class', 'required' => false, 'options' => array( 'Economy', 'Premium Economy', 'Business', 'First' ) ),
				array( 'name' => 'airline', 'type' => 'text', 'label' => 'Airline preference', 'required' => false, 'maxlength' => 80, 'help' => 'Optional' ),
				$vy_notes,
			)
		),
		'rules'  => array(
			array( 'rule' => 'sum_min', 'fields' => array( 'adults', 'children', 'infants' ), 'min' => 1, 'target' => 'adults', 'message' => 'Please include at least one passenger.' ),
			array( 'rule' => 'lte', 'a' => 'infants', 'b' => 'adults', 'target' => 'infants', 'message' => 'Each infant must travel with an adult.' ),
			array( 'rule' => 'date_gte', 'a' => 'return_date', 'b' => 'departure_date', 'target' => 'return_date', 'message' => 'Return date cannot be earlier than the departure date.' ),
		),
	),

	'cab'      => array(
		'title'  => 'Request a Vehicle Quote',
		'intro'  => 'Tell us where and when you need a vehicle. Our team will confirm availability and the fare before anything is booked.',
		'submit' => 'Request Vehicle Quote',
		'fields' => array_merge(
			$vy_contact_fields( 'Customer name' ),
			array(
				array( 'name' => 'trip_type', 'type' => 'select', 'label' => 'Trip type', 'required' => true, 'options' => array( 'Local', 'Outstation', 'Airport transfer' ), 'other' => true ),
				array( 'name' => 'vehicle', 'type' => 'select', 'label' => 'Vehicle preference', 'required' => false, 'options' => array( 'No preference', 'Hatchback', 'Sedan', 'SUV / MUV (e.g. Innova)', 'Tempo Traveller', 'Mini bus', 'Bus' ) ),
				array( 'name' => 'pickup_location', 'type' => 'text', 'label' => 'Pickup location', 'required' => true, 'maxlength' => 150 ),
				array( 'name' => 'drop_location', 'type' => 'text', 'label' => 'Drop-off location', 'required' => true, 'maxlength' => 150 ),
				array( 'name' => 'pickup_at', 'type' => 'datetime-local', 'label' => 'Pickup date & time', 'required' => true, 'min_today' => true ),
				array( 'name' => 'return_at', 'type' => 'datetime-local', 'label' => 'Return date & time', 'required' => false, 'min_today' => true, 'help' => 'If applicable' ),
				array( 'name' => 'passengers', 'type' => 'number', 'label' => 'Number of passengers', 'required' => true, 'min' => 1, 'max' => 60, 'integer' => true, 'default' => 1 ),
				array( 'name' => 'luggage', 'type' => 'text', 'label' => 'Luggage', 'required' => false, 'maxlength' => 150, 'placeholder' => 'e.g. 3 large bags', 'help' => 'Optional' ),
				$vy_notes,
			)
		),
		'rules'  => array(
			array( 'rule' => 'date_gt', 'a' => 'return_at', 'b' => 'pickup_at', 'target' => 'return_at', 'message' => 'Return must be after the pickup date and time.' ),
		),
	),

	'hotel'    => array(
		'title'  => 'Request a Hotel Quote',
		'intro'  => 'Room rates and availability change daily, so we confirm them with you directly. Share your stay details to receive options.',
		'submit' => 'Request Hotel Quote',
		'fields' => array_merge(
			$vy_contact_fields( 'Customer name' ),
			array(
				array( 'name' => 'city', 'type' => 'text', 'label' => 'Destination / city', 'required' => true, 'maxlength' => 100 ),
				array( 'name' => 'hotel_category', 'type' => 'select', 'label' => 'Preferred hotel category', 'required' => false, 'options' => array( 'No preference', 'Budget', '3-star', '4-star', '5-star', 'Resort / villa' ) ),
				array( 'name' => 'checkin', 'type' => 'date', 'label' => 'Check-in date', 'required' => true, 'min_today' => true ),
				array( 'name' => 'checkout', 'type' => 'date', 'label' => 'Check-out date', 'required' => true, 'min_today' => true ),
				array( 'name' => 'rooms', 'type' => 'number', 'label' => 'Rooms', 'required' => true, 'min' => 1, 'max' => 50, 'integer' => true, 'default' => 1, 'width' => 'third' ),
				array( 'name' => 'adults', 'type' => 'number', 'label' => 'Adults', 'required' => true, 'min' => 1, 'max' => 200, 'integer' => true, 'default' => 2, 'width' => 'third' ),
				array( 'name' => 'children', 'type' => 'number', 'label' => 'Children', 'required' => true, 'min' => 0, 'max' => 200, 'integer' => true, 'default' => 0, 'width' => 'third' ),
				array( 'name' => 'budget_per_night', 'type' => 'number', 'label' => 'Approx. budget per room per night', 'required' => false, 'min' => 0, 'max' => 10000000, 'integer' => true, 'prefix' => '₹', 'help' => 'Optional' ),
				array( 'name' => 'meal_plan', 'type' => 'select', 'label' => 'Meal preference', 'required' => false, 'options' => array( 'No preference', 'Room only', 'Breakfast included', 'Breakfast + dinner', 'All meals' ) ),
				$vy_notes,
			)
		),
		'rules'  => array(
			array( 'rule' => 'date_gt', 'a' => 'checkout', 'b' => 'checkin', 'target' => 'checkout', 'message' => 'Check-out must be after check-in.' ),
		),
	),

	'passport' => array(
		'title'  => 'Request Passport Assistance',
		'intro'  => 'For a first enquiry we only need your contact details. Please do not share passport numbers, Aadhaar numbers or document images here.',
		'submit' => 'Request Passport Assistance',
		'fields' => array_merge(
			$vy_contact_fields(),
			array(
				array( 'name' => 'service_type', 'type' => 'radio', 'label' => 'Assistance needed', 'required' => true, 'options' => array( 'New passport', 'Passport renewal / reissue', 'Lost or damaged passport' ), 'other' => true, 'width' => 'full' ),
				array( 'name' => 'age_category', 'type' => 'select', 'label' => 'Applicant age category', 'required' => false, 'options' => array( 'Adult (18-59)', 'Minor (below 18)', 'Senior citizen (60+)' ) ),
				array( 'name' => 'urgency', 'type' => 'select', 'label' => 'Urgency', 'required' => false, 'options' => array( 'Normal', 'Urgent - please advise on Tatkaal' ) ),
				array( 'name' => 'preferred_date', 'type' => 'date', 'label' => 'Preferred assistance date', 'required' => false, 'min_today' => true, 'help' => 'Optional' ),
				array( 'name' => 'city', 'type' => 'text', 'label' => 'City / location', 'required' => true, 'maxlength' => 100 ),
				$vy_notes,
			)
		),
		'rules'  => array(),
	),

	'other'    => array(
		'title'  => 'Send Us Your Enquiry',
		'intro'  => 'Not sure which service fits? Describe what you need and the right person from our team will get back to you.',
		'submit' => 'Submit Enquiry',
		'fields' => array_merge(
			$vy_contact_fields( 'Name' ),
			array(
				array( 'name' => 'category', 'type' => 'select', 'label' => 'Service / subject', 'required' => true, 'options' => array( 'MICE', 'Trade fair', 'Destination wedding', 'Cruise packages', 'Honeymoon packages', 'Educational tours', 'Forex', 'Travel insurance', 'Security service', 'Overseas education', 'General enquiry' ), 'other' => true ),
				array( 'name' => 'contact_method', 'type' => 'radio', 'label' => 'Preferred contact method', 'required' => true, 'options' => array( 'Phone call', 'WhatsApp', 'Email' ), 'default' => 'Phone call' ),
				array( 'name' => 'description', 'type' => 'textarea', 'label' => 'Describe your requirement', 'required' => true, 'maxlength' => 3000, 'width' => 'full' ),
			)
		),
		'rules'  => array(
			array( 'rule' => 'required_if', 'field' => 'email', 'when' => 'contact_method', 'equals' => 'Email', 'target' => 'email', 'message' => 'Please enter your email address so we can reply by email.' ),
		),
	),
);
