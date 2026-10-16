<?php
/**
 * Disables customer-facing payment links for this release.
 *
 * The theme hard-codes "Pay Now" links (to /qr-code/) in Divi code modules
 * and in the footer text widget, and the footer has a PayUmoney "Gift Card"
 * link. Those cannot be filtered individually, so the final front-end HTML
 * is filtered instead. Nothing is deleted: the QR-code page, widgets and
 * any payment records remain in WordPress and reappear if this plugin is
 * deactivated or settings['payments']['disabled'] is set to false.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Payments {

	public static function init() {
		if ( ! VY_Config::setting( 'payments', 'disabled', true ) ) {
			return;
		}
		add_action( 'template_redirect', array( __CLASS__, 'redirect_payment_pages' ), 1 );
		add_action( 'template_redirect', array( __CLASS__, 'start_buffer' ), 99 );
		add_filter( 'widget_text', array( __CLASS__, 'strip_payment_links' ), 99 );
		add_filter( 'widget_text_content', array( __CLASS__, 'strip_payment_links' ), 99 );
		add_filter( 'the_content', array( __CLASS__, 'strip_payment_links' ), 99 );
	}

	public static function redirect_payment_pages() {
		$slugs = (array) VY_Config::setting( 'payments', 'redirect_slugs', array() );
		if ( $slugs && is_page( $slugs ) && ! current_user_can( 'edit_pages' ) ) {
			wp_safe_redirect( home_url( '/' ), 302 );
			exit;
		}
	}

	public static function start_buffer() {
		if ( is_admin() || wp_doing_ajax() || is_feed() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		ob_start( array( __CLASS__, 'strip_payment_links' ) );
	}

	/**
	 * Removes payment anchors. A wrapper that contains nothing but the link
	 * (e.g. <div class="a"><a>Pay Now</a></div>) is removed with it so no
	 * empty boxes remain.
	 */
	public static function strip_payment_links( $html ) {
		if ( ! is_string( $html ) || '' === $html || false === stripos( $html, '<a' ) ) {
			return $html;
		}
		$html = preg_replace_callback(
			'#(<(div|p|li|span)\b[^>]*>\s*)?<a\b([^>]*)>(.*?)</a>(\s*</\2>)?#is',
			array( __CLASS__, 'replace_anchor' ),
			$html
		);
		return $html;
	}

	private static function replace_anchor( $m ) {
		if ( ! self::is_payment_link( $m[3], $m[4] ) ) {
			return $m[0];
		}
		$opened = ! empty( $m[1] );
		$closed = ! empty( $m[5] );
		if ( $opened && $closed ) {
			return '';
		}
		// Keep any unmatched wrapper tag so the surrounding markup stays balanced.
		return ( $opened ? $m[1] : '' ) . ( $closed ? $m[5] : '' );
	}

	public static function is_payment_link( $attributes, $inner ) {
		$href = '';
		if ( preg_match( '#\bhref\s*=\s*(["\'])(.*?)\1#is', $attributes, $hm ) ) {
			$href = strtolower( html_entity_decode( $hm[2] ) );
		}
		foreach ( (array) VY_Config::setting( 'payments', 'link_patterns', array() ) as $pattern ) {
			if ( $href && false !== strpos( $href, strtolower( $pattern ) ) ) {
				return true;
			}
		}
		$text = strtolower( trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( $inner ) ) ) );
		return in_array( $text, (array) VY_Config::setting( 'payments', 'link_texts', array() ), true );
	}
}
