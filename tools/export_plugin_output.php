<?php
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
echo wp_json_encode( $out );
