<?php
/**
 * Plugin Name:       VishvYatra Holidays Enhancements
 * Description:       Service-selection popup, dedicated service enquiry forms, visa document checklist download, rule-based chatbot and payment-link removal for the VishvYatra Holidays website.
 * Version:           1.0.0
 * Requires at least: 6.1
 * Requires PHP:      7.4
 * Author:            Nithiyaa Technologies (NTX)
 * License:           GPL-2.0-or-later
 * Text Domain:       vishvyatra
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

define( 'VY_VERSION', '1.0.0' );
define( 'VY_FILE', __FILE__ );
define( 'VY_DIR', plugin_dir_path( __FILE__ ) );
define( 'VY_URL', plugin_dir_url( __FILE__ ) );

require_once VY_DIR . 'includes/class-vy-config.php';
require_once VY_DIR . 'includes/class-vy-validator.php';
require_once VY_DIR . 'includes/class-vy-context.php';
require_once VY_DIR . 'includes/adapters/interface-vy-enquiry-adapter.php';
require_once VY_DIR . 'includes/adapters/class-vy-local-adapter.php';
require_once VY_DIR . 'includes/adapters/class-vy-mock-adapter.php';
require_once VY_DIR . 'includes/adapters/class-vy-whatsapp-adapter.php';
require_once VY_DIR . 'includes/class-vy-enquiry-service.php';
require_once VY_DIR . 'includes/class-vy-quiz.php';
require_once VY_DIR . 'includes/class-vy-catalog.php';
require_once VY_DIR . 'includes/class-vy-pages.php';
require_once VY_DIR . 'includes/class-vy-payments.php';
require_once VY_DIR . 'includes/class-vy-frontend.php';
require_once VY_DIR . 'includes/class-vy-admin.php';

register_activation_hook( __FILE__, array( 'VY_Pages', 'activate' ) );

add_action(
	'plugins_loaded',
	static function () {
		VY_Enquiry_Service::init();
		VY_Quiz::init();
		VY_Catalog::init();
		VY_Pages::init();
		VY_Payments::init();
		VY_Frontend::init();
		VY_Admin::init();
	}
);
