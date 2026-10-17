<?php
/**
 * Travel quiz: 5 easy picture questions; all correct = a quotation reward.
 *
 * Photos are the website's own images (wp-content/uploads), so no stock or
 * third-party images are used. `image` is relative to the uploads folder.
 *
 * IMPORTANT - business terms: the reward percentage and terms below are what
 * the client asked for in this release. VishvYatra Holidays must confirm the
 * exact terms (what the discount applies to, validity, exclusions) before
 * go-live; edit `terms` accordingly.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

return array(
	'enabled'          => true,
	'questions'        => 5,     // asked per quiz, picked at random from the pool
	'required_correct' => 5,     // all correct to win
	'reward_percent'   => 10,
	'reward_label'     => '10% off your quotation',
	'code_prefix'      => 'VYQ',
	'code_days'        => 180,   // how long issued codes are recognised
	'invite_delay_ms'  => 4000,
	'terms'            => 'Reward applies to a quotation from VishvYatra Holidays and is confirmed by our team when they send your quote. One reward per customer; cannot be combined with other offers. Government, embassy and other third-party fees are not discounted. Full terms to be confirmed by VishvYatra Holidays.',

	// Question pool. answer = index into options (0-based).
	'pool'             => array(
		array( 'id' => 'taj', 'image' => '2021/02/agra-1.jpg', 'alt' => 'A white marble mausoleum with four minarets behind a long reflecting pool', 'question' => 'Which famous monument is this?', 'options' => array( 'Taj Mahal', 'Red Fort', 'Qutub Minar', 'Gateway of India' ), 'answer' => 0, 'fact' => 'The Taj Mahal in Agra took around 20 years to build and is a UNESCO World Heritage Site.' ),
		array( 'id' => 'petronas', 'image' => '2021/03/Kuala-Lumpur-and-Kota-KinabaluSabah.png', 'alt' => 'Two identical tall silver towers joined by a sky bridge, lit up at dusk', 'question' => 'These twin towers are in which country?', 'options' => array( 'Singapore', 'Malaysia', 'Thailand', 'UAE' ), 'answer' => 1, 'fact' => 'The Petronas Twin Towers in Kuala Lumpur are joined by a sky bridge on the 41st and 42nd floors.' ),
		array( 'id' => 'colosseum', 'image' => '2021/03/Discover-Italy-Package.png', 'alt' => 'A huge ancient oval stone amphitheatre with arches at sunset', 'question' => 'In which city is this ancient amphitheatre?', 'options' => array( 'Athens', 'Paris', 'Rome', 'Istanbul' ), 'answer' => 2, 'fact' => 'The Colosseum in Rome could hold an estimated 50,000 spectators.' ),
		array( 'id' => 'eiffel', 'image' => '2021/03/Swiss-Paris-Delight.png', 'alt' => 'A tall iron lattice tower against a blue sky', 'question' => 'Which city is home to this tower?', 'options' => array( 'London', 'Paris', 'New York', 'Dubai' ), 'answer' => 1, 'fact' => 'The Eiffel Tower was built for the 1889 World\'s Fair in Paris.' ),
		array( 'id' => 'pyramids', 'image' => '2021/03/Grand-Egypt-Tour.jpg', 'alt' => 'Great stone pyramids rising above a city in the desert haze', 'question' => 'These pyramids are in which country?', 'options' => array( 'Mexico', 'Jordan', 'Egypt', 'Morocco' ), 'answer' => 2, 'fact' => 'The Great Pyramid of Giza is the oldest of the Seven Wonders of the Ancient World.' ),
		array( 'id' => 'burj', 'image' => '2021/03/dubai-packages.png', 'alt' => 'An extremely tall, slender skyscraper with fountains in front', 'question' => 'The world\'s tallest building is in which city?', 'options' => array( 'Dubai', 'Shanghai', 'New York', 'Kuala Lumpur' ), 'answer' => 0, 'fact' => 'The Burj Khalifa in Dubai is about 828 metres tall.' ),
		array( 'id' => 'marina', 'image' => '2021/03/Super-Saver-Singapore-with-Night-Safari.png', 'alt' => 'Three hotel towers topped by a long ship-shaped deck, lit at night by the water', 'question' => 'Where is this famous hotel with a rooftop "ship"?', 'options' => array( 'Hong Kong', 'Sydney', 'Dubai', 'Singapore' ), 'answer' => 3, 'fact' => 'Marina Bay Sands in Singapore has an infinity pool 57 floors up.' ),
		array( 'id' => 'bigben', 'image' => '2021/03/London-Getaway.png', 'alt' => 'A gothic clock tower beside a grand riverside palace and a bridge', 'question' => 'This clock tower stands in which city?', 'options' => array( 'London', 'Paris', 'Berlin', 'Prague' ), 'answer' => 0, 'fact' => '"Big Ben" is actually the name of the great bell inside the Elizabeth Tower in London.' ),
		array( 'id' => 'houseboat', 'image' => '2021/03/Marvelous-Kerala-with-Alleppey.png', 'alt' => 'A traditional thatched houseboat on calm backwaters lined with palm trees', 'question' => 'Houseboat cruises on these backwaters are famous in which Indian state?', 'options' => array( 'Goa', 'Kerala', 'Rajasthan', 'Punjab' ), 'answer' => 1, 'fact' => 'Alleppey (Alappuzha) in Kerala is often called the "Venice of the East".' ),
		array( 'id' => 'fuji', 'image' => '2021/03/Captivating-Japan.png', 'alt' => 'A snow-capped volcano rising behind a city skyline with a red tower', 'question' => 'This snow-capped mountain is in which country?', 'options' => array( 'Nepal', 'China', 'Japan', 'South Korea' ), 'answer' => 2, 'fact' => 'Mount Fuji is Japan\'s highest mountain at 3,776 metres.' ),
		array( 'id' => 'santorini', 'image' => '2021/03/Fascinating-Greece.png', 'alt' => 'White-washed houses and blue-domed churches above a deep blue sea', 'question' => 'These blue domes are a famous sight in which country?', 'options' => array( 'Greece', 'Italy', 'Spain', 'Turkey' ), 'answer' => 0, 'fact' => 'Santorini\'s villages sit on the rim of an ancient volcanic caldera.' ),
		array( 'id' => 'pisa', 'image' => '2021/03/Italy-Packages.png', 'alt' => 'A round white marble bell tower that leans to one side', 'question' => 'The famous leaning tower is in which country?', 'options' => array( 'France', 'Italy', 'Germany', 'Spain' ), 'answer' => 1, 'fact' => 'The Leaning Tower of Pisa started to tilt during construction in the 12th century.' ),
	),
);
