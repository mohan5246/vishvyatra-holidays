<?php
/**
 * Contract for enquiry delivery adapters.
 *
 * Every service form produces the same payload shape (see
 * VY_Enquiry_Service::build_payload()) and hands it to adapters that
 * implement this interface. To add a delivery channel (e.g. WhatsApp, CRM,
 * email), implement the interface and register it via the
 * `vy_enquiry_adapters` filter.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

interface VY_Enquiry_Adapter {

	/** Short machine name, e.g. 'local'. */
	public function name();

	/** Whether the adapter is configured and allowed to run. */
	public function is_enabled();

	/**
	 * Deliver or record the payload.
	 *
	 * @param array $payload Structured enquiry payload.
	 * @return array{ok: bool, status: string, detail?: string}
	 *         status is 'recorded', 'prepared', 'sent', 'disabled' or 'failed'.
	 */
	public function submit( array $payload );
}
