<?php
/**
 * Engagement features: Holiday Finder, wishlist & compare, interactive
 * itinerary and destination stories.
 *
 * Everything here uses the website's own packages and photos.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(
	'finder'    => array( 'enabled' => true, 'results' => 6 ),
	'wishlist'  => array( 'enabled' => true, 'compare_max' => 3 ),
	'itinerary' => array( 'enabled' => true ),

	/*
	 * Package themes, found from words in the package title, its
	 * "Destinations" line and its categories. A package can have several.
	 */
	'themes'    => array(
		'beach'      => array( 'label' => 'Beaches & islands', 'icon' => '🏝️', 'words' => array( 'beach', 'island', 'islands', 'maldives', 'goa', 'bali', 'andaman', 'havelock', 'mauritius', 'seychelles', 'phuket', 'krabi', 'pattaya', 'koh', 'langkawi', 'sentosa', 'lakshadweep', 'coast', 'coastal', 'fiji', 'reunion', 'madagascar', 'zanzibar', 'cruise', 'caribbean', 'jamaica', 'caicos', 'santorini', 'bentota', 'lombok', 'nusa', 'gili', 'boracay', 'cebu', 'bintan', 'marine', 'sea', 'costa rica', 'trinidad', 'tobago', 'philippines', 'sabah', 'mauritius' ) ),
		'mountains'  => array( 'label' => 'Mountains & nature', 'icon' => '🏔️', 'words' => array( 'hill', 'hills', 'himalaya', 'himalayan', 'kashmir', 'srinagar', 'gulmarg', 'shimla', 'manali', 'himachal', 'ladakh', 'leh', 'darjeeling', 'gangtok', 'sikkim', 'ooty', 'kodaikanal', 'munnar', 'coorg', 'wayanad', 'nainital', 'mussoorie', 'mussorie', 'uttaranchal', 'uttarakhand', 'swiss', 'switzerland', 'alps', 'titlis', 'jungfrau', 'iceland', 'norway', 'fjord', 'new zealand', 'rocky', 'mountain', 'mountains', 'alaska', 'glacier', 'valley', 'shillong', 'shilling', 'meghalaya', 'araku', 'nature', 'lake', 'cameron', 'highlands', 'bhutan', 'nepal', 'tasmania', 'kerala', 'backwater', 'backwaters', 'alleppey', 'rockies', 'whistler', 'vancouver', 'mahabaleshwar', 'heavenly' ) ),
		'culture'    => array( 'label' => 'Culture & heritage', 'icon' => '🏛️', 'words' => array( 'heritage', 'historical', 'history', 'palace', 'fort', 'rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'agra', 'taj', 'delhi', 'golden triangle', 'egypt', 'pharaoh', 'cairo', 'rome', 'italy', 'greece', 'athens', 'istanbul', 'cappadocia', 'turkey', 'jordan', 'petra', 'angkor', 'cambodia', 'siem', 'china', 'beijing', 'kyoto', 'japan', 'castle', 'castles', 'ajanta', 'ellora', 'hampi', 'mysore', 'gujarat', 'culture', 'cultural', 'prague', 'vienna', 'budapest', 'croatia', 'dubrovnik', 'spain', 'portugal', 'france', 'europe', 'vietnam', 'morocco', 'ancient', 'wonders' ) ),
		'adventure'  => array( 'label' => 'Adventure & wildlife', 'icon' => '🦁', 'words' => array( 'adventure', 'safari', 'wildlife', 'kenya', 'masai', 'samburu', 'tanzania', 'south africa', 'kruger', 'zimbabwe', 'victoria falls', 'jungle', 'trek', 'trekking', 'hiking', 'rafting', 'paragliding', 'billing', 'bir', 'desert', 'dune', 'corbett', 'ranthambore', 'kaziranga', 'komodo', 'amazon', 'brazil', 'patagonia', 'night safari', 'niagara', 'grand canyon', 'bike', 'walk', 'sarawak', 'borneo', 'ayers', 'alice springs', 'south america', 'costa rica' ) ),
		'pilgrimage' => array( 'label' => 'Pilgrimage & spiritual', 'icon' => '🛕', 'words' => array( 'pilgrimage', 'spiritual', 'holy', 'darshan', 'yatra', 'chardham', 'char dham', 'tirupati', 'varanasi', 'kashi', 'haridwar', 'rishikesh', 'allahabad', 'bodh gaya', 'buddhist', 'temple', 'temples', 'shirdi', 'dwarka', 'dwarkadhish', 'rameswaram', 'madurai', 'vaishno', 'kedarnath', 'badrinath', 'amarnath', 'bible', 'holyland', 'jerusalem', 'israel', 'mathura', 'vrindavan', 'puri' ) ),
		'city'       => array( 'label' => 'Cities & shopping', 'icon' => '🌆', 'words' => array( 'city', 'cities', 'singapore', 'dubai', 'abu dhabi', 'doha', 'london', 'paris', 'new york', 'las vegas', 'los angeles', 'san francisco', 'hong kong', 'macau', 'bangkok', 'kuala lumpur', 'seoul', 'tokyo', 'shanghai', 'sydney', 'melbourne', 'mumbai', 'hyderabad', 'chennai', 'kolkata', 'amsterdam', 'brussels', 'berlin', 'shopping', 'disney', 'universal', 'marina', 'orlando' ) ),
	),

	/*
	 * Destination stories on the homepage. Images are paths in the
	 * website's uploads folder. `link` is a page slug on the site.
	 */
	'stories'   => array(
		'enabled' => true,
		'items'   => array(
			array( 'label' => 'Kerala', 'cover' => '2021/03/Marvelous-Kerala-with-Alleppey.png', 'link' => 'south-india-tour-packages', 'service' => 'domestic_tours', 'slides' => array(
				array( '2021/03/Marvelous-Kerala-with-Alleppey.png', 'Houseboat cruises on the Alleppey backwaters' ),
				array( '2021/02/kerala.jpg', 'Traditional kettuvallam houseboats' ),
				array( '2021/03/Enchanting-Kerala.png', 'Palm-fringed backwaters' ),
			) ),
			array( 'label' => 'Kashmir', 'cover' => '2021/02/kashmir-honey-moon.jpg', 'link' => 'north-india-tour-packages', 'service' => 'domestic_tours', 'slides' => array(
				array( '2021/03/Kashmir.png', 'Snow-covered pine forests in winter' ),
				array( '2021/03/Combo-Kashmir-Package.jpg', 'Mountain meadows and valleys' ),
				array( '2021/02/kashmir-honey-moon.jpg', 'Shikara rides on Dal Lake' ),
			) ),
			array( 'label' => 'Dubai', 'cover' => '2021/03/dubai-packages.png', 'link' => 'dubai-tour-packages', 'service' => 'international_tours', 'slides' => array(
				array( '2021/03/dubai-packages.png', 'The Burj Khalifa - the world\'s tallest building' ),
				array( '2021/03/Dubai-Family-Holidays.jpg', 'Family beach days by the Burj Al Arab' ),
				array( '2021/03/Exceptional-Dubai-Getaway-1.jpg', 'Dubai Marina lit up at night' ),
			) ),
			array( 'label' => 'Singapore', 'cover' => '2021/03/Super-Saver-Singapore-with-Night-Safari.png', 'link' => 'singapore-tour-packages', 'service' => 'international_tours', 'slides' => array(
				array( '2021/03/Super-Saver-Singapore-with-Night-Safari.png', 'Marina Bay Sands lit up at night' ),
				array( '2021/03/Singapore-with-Sentosa-Island.png', 'Treetop walks through the rainforest' ),
				array( '2021/03/Amazing-Singapore-Tour.png', 'The Supertrees at Gardens by the Bay' ),
			) ),
			array( 'label' => 'Bali', 'cover' => '2021/03/Amazing-Bali.jpg', 'link' => 'bali-tour-packages', 'service' => 'international_tours', 'slides' => array(
				array( '2021/03/Amazing-Bali.jpg', 'Dramatic cliffs and ocean waves' ),
				array( '2021/03/Bali-with-Nusa-Penida.png', 'Carved Balinese temple gateways' ),
				array( '2021/03/Mesmerizing-Bali.jpg', 'Lake temples in the hills' ),
			) ),
			array( 'label' => 'Maldives', 'cover' => '2021/03/Honeymooners-Paradise-Maldives.png', 'link' => 'maldives-tour-packages', 'service' => 'international_tours', 'slides' => array(
				array( '2021/03/Maldives.png', 'Beach bungalows under the palms' ),
				array( '2021/03/Honeymooners-Paradise-Maldives.png', 'Over-water villas on turquoise lagoons' ),
				array( '2021/03/Luxury-Escape-at-Cocoon-Maldives.png', 'Private pool villas over the sea' ),
			) ),
			array( 'label' => 'Europe', 'cover' => '2021/03/Swiss-Paris-Delight.png', 'link' => 'europe-tour-packages', 'service' => 'international_tours', 'slides' => array(
				array( '2021/03/Swiss-Paris-Delight.png', 'Paris and the Eiffel Tower' ),
				array( '2021/03/Discover-Italy-Package.png', 'The Colosseum in Rome' ),
				array( '2021/03/Fascinating-Greece.png', 'Blue domes of Santorini' ),
				array( '2021/03/London-Getaway.png', 'London\'s Big Ben and Westminster' ),
			) ),
			array( 'label' => 'Egypt', 'cover' => '2021/03/Grand-Egypt-Tour.jpg', 'link' => 'egypt-tour-packages', 'service' => 'international_tours', 'slides' => array(
				array( '2021/03/Grand-Egypt-Tour.jpg', 'The Pyramids of Giza' ),
				array( '2021/03/Egypt-land-of-pharaohs.jpg', 'Up close with the Great Pyramid' ),
			) ),
		),
	),
);
