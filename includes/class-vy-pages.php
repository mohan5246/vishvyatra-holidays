<?php
/**
 * Service pages: creates the missing ones on activation and adds the
 * enquiry block to every service page without touching existing content.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Pages {

	public static function init() {
		add_filter( 'the_content', array( __CLASS__, 'append_service_block' ), 20 );
	}

	/**
	 * Creates pages for services that have no page yet. Existing pages
	 * (including the ones already on the site) are never modified.
	 */
	public static function activate() {
		foreach ( VY_Config::services() as $key => $service ) {
			if ( get_page_by_path( $service['slug'], OBJECT, 'page' ) ) {
				continue;
			}
			wp_insert_post(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_title'   => $service['label'],
					'post_name'    => $service['slug'],
					'post_content' => '[vy_service_page service="' . $key . '"]',
				)
			);
		}
	}

	/**
	 * Adds the service information + enquiry form under the page's own
	 * content, unless the page already places the shortcode itself.
	 */
	public static function append_service_block( $content ) {
		static $done = array();

		if ( ! VY_Config::get( 'settings' )['auto_insert'] || is_admin() || ! is_singular( 'page' ) || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}
		$post = get_post();
		$key  = VY_Config::service_for_post( $post );
		if ( ! $key || isset( $done[ $post->ID ] ) ) {
			return $content;
		}
		if ( has_shortcode( $post->post_content, 'vy_service_page' ) || has_shortcode( $post->post_content, 'vy_enquiry_form' ) ) {
			return $content;
		}
		$done[ $post->ID ] = true;
		return $content . VY_Frontend::render_service_block( $key, false );
	}
}
