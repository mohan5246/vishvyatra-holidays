<?php
/**
 * Works out which enquiry form a page gets and what to prefill, from the
 * page's slug, type, title, categories and text (rules in
 * config/page-context.php).
 *
 * resolve() takes plain data, so the same rules are used on WordPress and
 * by the static test-copy builder.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Context {

	/**
	 * Context for the current front-end request, or null.
	 */
	public static function current() {
		static $cache = array();
		if ( is_front_page() || ! is_singular( array( 'page', 'post' ) ) ) {
			return null;
		}
		$post = get_queried_object();
		if ( ! $post instanceof WP_Post ) {
			return null;
		}
		if ( array_key_exists( $post->ID, $cache ) ) {
			return $cache[ $post->ID ];
		}
		$categories = array();
		if ( 'post' === $post->post_type ) {
			foreach ( get_the_category( $post->ID ) as $term ) {
				$categories[] = $term->slug;
			}
		}
		return $cache[ $post->ID ] = self::resolve( // phpcs:ignore Squiz.PHP.DisallowMultipleAssignments
			array(
				'slug'       => $post->post_name,
				'type'       => $post->post_type,
				'title'      => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
				'categories' => $categories,
				'text'       => wp_strip_all_tags( $post->post_content ),
			)
		);
	}

	/**
	 * @param array $page { slug, type: page|post|front, title, categories[], text }
	 * @return array|null { service, prefill: array, context: { title, details, kind } }
	 */
	public static function resolve( array $page ) {
		$rules = VY_Config::get( 'page-context' );
		$slug  = isset( $page['slug'] ) ? $page['slug'] : '';
		$title = isset( $page['title'] ) ? trim( $page['title'] ) : '';
		$type  = isset( $page['type'] ) ? $page['type'] : 'page';

		if ( 'front' === $type || '' === $slug || in_array( $slug, $rules['exclude'], true ) ) {
			return null;
		}

		// Service pages keep their own form and information block.
		foreach ( VY_Config::services() as $key => $service ) {
			if ( $service['slug'] === $slug ) {
				return array( 'service' => $key, 'prefill' => array(), 'context' => null, 'service_page' => true );
			}
		}

		$subject = null;
		if ( isset( $rules['other_pages'][ $slug ] ) ) {
			$subject = $rules['other_pages'][ $slug ];
		} else {
			foreach ( $rules['other_prefixes'] as $prefix => $category ) {
				if ( 0 === strpos( $slug, $prefix ) ) {
					$subject = $category;
				}
			}
		}
		if ( $subject ) {
			return self::general( $subject, $title );
		}

		// Tour: package posts use their categories, tour pages their own slug.
		$bases = array();
		if ( 'post' === $type ) {
			foreach ( (array) $page['categories'] as $cat ) {
				$base = self::tour_base( $cat, $rules );
				if ( null !== $base ) {
					$bases[] = $base;
				}
			}
		} else {
			$base = self::tour_base( $slug, $rules );
			if ( null !== $base ) {
				$bases[] = $base;
			}
		}

		if ( ! $bases ) {
			return self::general( 'General enquiry', $title );
		}

		$domestic = false;
		foreach ( $bases as $base ) {
			foreach ( $rules['domestic_markers'] as $marker ) {
				if ( false !== strpos( $base, $marker ) ) {
					$domestic = true;
				}
			}
		}
		$tour_type = $domestic ? 'domestic' : 'international';

		// Most specific place = a base that is not a region (last one wins:
		// WordPress lists parent categories first).
		$destination = null;
		foreach ( $bases as $base ) {
			if ( ! in_array( $base, $rules['regions'], true ) ) {
				$destination = self::label( $base, $rules );
			}
		}

		$prefill = array();
		if ( $destination ) {
			$prefill = array_merge( $prefill, self::destination_prefill( $destination, $tour_type ) );
		} else {
			// Region-only packages ("south-india-tour-packages"): look for a
			// known destination in the title, e.g. "Enchanting Kerala Delight".
			$found = self::destination_in_text( $title, $tour_type );
			if ( $found ) {
				$prefill['destination'] = $found;
			}
		}

		$details = '';
		$text    = isset( $page['text'] ) ? $page['text'] : '';
		if ( 'post' === $type && preg_match( '/Duration\s*:?\s*([0-9]{1,2}\s*Nights?\s*\/?\s*([0-9]{1,2})\s*Days?)/i', $text, $m ) ) {
			$details                = preg_replace( '/\s+/', ' ', trim( $m[1] ) );
			$prefill['travel_days'] = max( 1, min( 90, (int) $m[2] ) );
		} elseif ( 'post' === $type && preg_match( '/\b([0-9]{1,2})\s*Days\b/i', $text, $m ) ) {
			$prefill['travel_days'] = max( 1, min( 90, (int) $m[1] ) );
		}

		return array(
			'service' => $domestic ? 'domestic_tours' : 'international_tours',
			'prefill' => $prefill,
			'context' => array(
				'kind'    => 'post' === $type ? 'package' : 'page',
				'title'   => $title,
				'details' => $details,
			),
		);
	}

	private static function general( $subject, $title ) {
		return array(
			'service' => 'other',
			'prefill' => array( 'category' => $subject ),
			'context' => array( 'kind' => 'page', 'title' => $title, 'details' => '' ),
		);
	}

	/** "usa-tour-packages" -> "usa"; null if not a tour slug. */
	private static function tour_base( $slug, $rules ) {
		if ( in_array( $slug, $rules['tour_slugs'], true ) ) {
			return $slug;
		}
		foreach ( $rules['tour_suffixes'] as $suffix ) {
			$len = strlen( $suffix );
			if ( strlen( $slug ) > $len && substr( $slug, -$len ) === $suffix ) {
				return substr( $slug, 0, -$len );
			}
		}
		return null;
	}

	private static function label( $base, $rules ) {
		if ( isset( $rules['labels'][ $base ] ) ) {
			return $rules['labels'][ $base ];
		}
		return ucwords( str_replace( '-', ' ', $base ) );
	}

	/**
	 * The destinations.php entry whose place name appears in the text, e.g.
	 * "Jaipur & Rajasthan" matches "Historical Rajasthan Tour".
	 */
	private static function destination_in_text( $text, $tour_type ) {
		$lists = VY_Config::get( 'destinations' );
		foreach ( $lists[ $tour_type ] as $options ) {
			foreach ( $options as $option ) {
				$names = preg_split( '/\s*(?:&|\/|,|\(|\))\s*/', strtolower( $option ), -1, PREG_SPLIT_NO_EMPTY );
				foreach ( $names as $name ) {
					if ( strlen( $name ) >= 3 && preg_match( '/\b' . preg_quote( $name, '/' ) . '\b/i', $text ) ) {
						return $option;
					}
				}
			}
		}
		return null;
	}

	/**
	 * Selects the matching dropdown entry, or "Other" + the name when the
	 * place is not in destinations.php.
	 */
	private static function destination_prefill( $destination, $tour_type ) {
		$lists = VY_Config::get( 'destinations' );
		$needle = strtolower( $destination );
		foreach ( $lists[ $tour_type ] as $options ) {
			foreach ( $options as $option ) {
				$o = strtolower( $option );
				if ( $o === $needle || 0 === strpos( $o, $needle . ' ' ) || 0 === strpos( $o, $needle . ' (' ) ) {
					return array( 'destination' => $option );
				}
			}
		}
		return array( 'destination' => VY_Validator::OTHER, 'destination_other' => $destination );
	}
}
