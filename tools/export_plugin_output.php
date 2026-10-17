<?php
defined( 'ABSPATH' ) || exit; // Only via `wp eval-file`.
/**
 * Run with: wp eval-file tools/export_plugin_output.php > plugin-output.json
 * Exports the plugin's front-end config and rendered blocks so the static
 * test copy uses exactly the same markup as the WordPress plugin.
 */
$out = array(
	'home_url' => home_url( '/' ),
	'config'   => VY_Frontend::public_config(),
	'grid'     => VY_Frontend::shortcode_service_grid( array() ),
	'blocks'   => array(),
	'services' => VY_Config::services(),
);
foreach ( VY_Config::services() as $key => $service ) {
	$out['blocks'][ $key ] = array(
		'existing' => VY_Frontend::render_service_block( $key, false ),
		'new'      => VY_Frontend::render_service_block( $key, true ),
	);
}
// Per-page enquiry sections for the static copy: VY_PAGES points to the JSON
// written by `build_static_demo.py extract` (slug, type, title, categories, text).
$pages_file = getenv( 'VY_PAGES' );
if ( $pages_file && is_readable( $pages_file ) ) {
	$out['pages']   = array();
	$out['catalog'] = array();
	foreach ( json_decode( file_get_contents( $pages_file ), true ) as $page ) { // phpcs:ignore WordPress.WP.AlternativeFunctions
		$entry = VY_Catalog::entry( $page );
		if ( $entry ) {
			$out['catalog'][] = $entry;
		}
		$context = VY_Context::resolve( $page );
		if ( ! $context ) {
			continue;
		}
		$out['pages'][ $page['slug'] ] = array(
			'service' => $context['service'],
			'block'   => ! empty( $context['service_page'] ) ? null : VY_Frontend::render_context_block( $context ),
			'cta'     => VY_Frontend::render_sidebar_cta( $context ),
		);
	}
}

echo wp_json_encode( $out );
