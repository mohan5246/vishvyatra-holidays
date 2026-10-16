<?php
/**
 * WhatsApp delivery adapter - PREPARED BUT DISABLED.
 *
 * WhatsApp integration is on hold until the client supplies and approves
 * the official WhatsApp Business configuration. Until then this adapter
 * never sends anything; it only formats the message so the output can be
 * reviewed.
 *
 * To enable in a later phase:
 *   1. Define these in wp-config.php (never in plugin files or JavaScript):
 *        define( 'VY_WHATSAPP_NUMBER', '91XXXXXXXXXX' );          // destination
 *        define( 'VY_WHATSAPP_PHONE_NUMBER_ID', '...' );          // Cloud API sender id
 *        define( 'VY_WHATSAPP_TOKEN', '...' );                    // access token
 *   2. Set settings['whatsapp']['enabled'] = true via the `vy_settings` filter.
 *   3. Implement send_via_cloud_api() below (approved template message) and
 *      test against a non-production number first.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_WhatsApp_Adapter implements VY_Enquiry_Adapter {

	public function name() {
		return 'whatsapp';
	}

	public function is_enabled() {
		return (bool) VY_Config::setting( 'whatsapp', 'enabled' )
			&& defined( 'VY_WHATSAPP_NUMBER' ) && VY_WHATSAPP_NUMBER
			&& defined( 'VY_WHATSAPP_TOKEN' ) && VY_WHATSAPP_TOKEN
			&& defined( 'VY_WHATSAPP_PHONE_NUMBER_ID' ) && VY_WHATSAPP_PHONE_NUMBER_ID;
	}

	public function submit( array $payload ) {
		if ( ! $this->is_enabled() ) {
			return array( 'ok' => true, 'status' => 'disabled' );
		}
		return $this->send_via_cloud_api( $this->format_message( $payload ) );
	}

	/** Plain-text WhatsApp message for the business team. */
	public function format_message( array $payload ) {
		return "*New website enquiry*\n" . VY_Enquiry_Service::format_text( $payload );
	}

	/**
	 * Placeholder for the approved WhatsApp Cloud API call. Intentionally not
	 * implemented in this release so no message can be sent by accident.
	 */
	private function send_via_cloud_api( $message ) {
		unset( $message );
		return array( 'ok' => false, 'status' => 'disabled', 'detail' => 'WhatsApp sending is not implemented in this release.' );
	}
}
