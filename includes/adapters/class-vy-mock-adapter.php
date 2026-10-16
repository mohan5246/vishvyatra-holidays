<?php
/**
 * Mock adapter: accepts the payload without storing or sending anything.
 * Used for demos and testing (submission mode 'mock').
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Mock_Adapter implements VY_Enquiry_Adapter {

	public function name() {
		return 'mock';
	}

	public function is_enabled() {
		return 'mock' === VY_Config::setting( 'submission', 'mode' );
	}

	public function submit( array $payload ) {
		/**
		 * Lets developers inspect the payload in mock mode (e.g. log it).
		 */
		do_action( 'vy_mock_enquiry', $payload );
		return array( 'ok' => true, 'status' => 'prepared' );
	}
}
