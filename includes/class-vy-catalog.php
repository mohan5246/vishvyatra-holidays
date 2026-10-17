<?php
/**
 * Package catalogue for the Holiday Finder, wishlist and stories: one entry
 * per package post (title, photo, days, places, tour type, themes), built
 * from the site's own posts with the same rules as the enquiry forms
 * (VY_Context).
 *
 * GET /wp-json/vishvyatra/v1/packages
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Catalog {

	const CACHE = 'vy_catalog_v1';

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_action( 'save_post_post', array( __CLASS__, 'flush' ) );
		add_action( 'deleted_post', array( __CLASS__, 'flush' ) );
		add_action( 'set_object_terms', array( __CLASS__, 'flush' ) );
	}

	public static function flush() {
		delete_transient( self::CACHE );
	}

	public static function register_routes() {
		register_rest_route(
			VY_Enquiry_Service::ROUTE_NS,
			'/packages',
			array(
				'methods'             => 'GET',
				'callback'            => static function () {
					return new WP_REST_Response( array( 'packages' => self::all() ), 200 );
				},
				'permission_callback' => '__return_true', // Public data: published packages only.
			)
		);
	}

	/** Theme labels/icons for the browser. */
	public static function themes() {
		$out = array();
		foreach ( VY_Config::get( 'engage' )['themes'] as $key => $theme ) {
			$out[ $key ] = array( 'label' => $theme['label'], 'icon' => $theme['icon'] );
		}
		return $out;
	}

	/** All published package posts (cached; refreshed when posts change). */
	public static function all() {
		$cached = get_transient( self::CACHE );
		if ( is_array( $cached ) ) {
			return $cached;
		}
		$size  = has_image_size( 'et-pb-post-main-image' ) ? 'et-pb-post-main-image' : 'medium_large';
		$posts = get_posts(
			array(
				'post_type'        => 'post',
				'post_status'      => 'publish',
				'posts_per_page'   => -1,
				'suppress_filters' => false,
			)
		);
		$out = array();
		foreach ( $posts as $post ) {
			$entry = self::entry(
				array(
					'slug'       => $post->post_name,
					'type'       => 'post',
					'title'      => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
					'categories' => wp_list_pluck( get_the_category( $post->ID ), 'slug' ),
					'text'       => wp_strip_all_tags( $post->post_content ),
					'image'      => (string) get_the_post_thumbnail_url( $post, $size ),
					'url'        => get_permalink( $post ),
				)
			);
			if ( $entry ) {
				$out[] = $entry;
			}
		}
		set_transient( self::CACHE, $out, 12 * HOUR_IN_SECONDS );
		return $out;
	}

	/**
	 * One catalogue entry from plain page facts, or null if the post is not
	 * a tour package.
	 *
	 * @param array $page { slug, type, title, categories[], text, image, url }
	 */
	public static function entry( array $page ) {
		if ( ( isset( $page['type'] ) ? $page['type'] : '' ) !== 'post' ) {
			return null;
		}
		$context = VY_Context::resolve( $page );
		if ( ! $context || ! in_array( $context['service'], array( 'international_tours', 'domestic_tours' ), true ) ) {
			return null;
		}
		$text   = isset( $page['text'] ) ? $page['text'] : '';
		$places = '';
		if ( preg_match( '/Destinations?\s*:\s*(.{3,200}?)(?=\s+(?:We |Our |Duration|Day\s*1\b|Overview|Tour Type|Group Size)|$)/i', $text, $m ) ) {
			$places = trim( preg_replace( '/\s+/', ' ', $m[1] ), " .,\t" );
		}
		$prefill     = $context['prefill'];
		$destination = isset( $prefill['destination_other'] ) ? $prefill['destination_other'] : ( isset( $prefill['destination'] ) ? $prefill['destination'] : '' );

		return array(
			'slug'        => $page['slug'],
			'title'       => $page['title'],
			'url'         => isset( $page['url'] ) ? $page['url'] : home_url( '/' . $page['slug'] . '/' ),
			'image'       => isset( $page['image'] ) ? $page['image'] : '',
			'tour_type'   => 'domestic_tours' === $context['service'] ? 'domestic' : 'international',
			'service'     => $context['service'],
			'destination' => $destination,
			'days'        => isset( $prefill['travel_days'] ) ? (int) $prefill['travel_days'] : null,
			'duration'    => $context['context']['details'],
			'places'      => mb_substr( $places, 0, 160 ),
			'themes'      => self::themes_for( $page['title'] . ' ' . $places . ' ' . str_replace( '-', ' ', implode( ' ', (array) $page['categories'] ) ) ),
		);
	}

	private static function themes_for( $text ) {
		$text = ' ' . strtolower( $text ) . ' ';
		$out  = array();
		foreach ( VY_Config::get( 'engage' )['themes'] as $key => $theme ) {
			foreach ( $theme['words'] as $word ) {
				if ( preg_match( '/\b' . preg_quote( $word, '/' ) . '\b/', $text ) ) {
					$out[] = $key;
					break;
				}
			}
		}
		return $out;
	}
}
