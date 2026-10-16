<?php
/**
 * Records enquiries as private "Enquiries" entries in WP Admin, using the
 * existing WordPress database (custom post type, no new tables).
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Local_Adapter implements VY_Enquiry_Adapter {

	const POST_TYPE = 'vy_enquiry';

	public function name() {
		return 'local';
	}

	public function is_enabled() {
		return 'local' === VY_Config::setting( 'submission', 'mode' );
	}

	public function submit( array $payload ) {
		$title = sprintf( '%s - %s - %s', $payload['reference'], $payload['service']['label'], $payload['customer']['name'] );

		$post_id = wp_insert_post(
			array(
				'post_type'    => self::POST_TYPE,
				'post_status'  => 'private',
				'post_title'   => $title,
				'post_content' => VY_Enquiry_Service::format_text( $payload ),
			),
			true
		);

		if ( is_wp_error( $post_id ) ) {
			return array( 'ok' => false, 'status' => 'failed', 'detail' => $post_id->get_error_message() );
		}

		update_post_meta( $post_id, '_vy_reference', $payload['reference'] );
		update_post_meta( $post_id, '_vy_service', $payload['service']['key'] );
		update_post_meta( $post_id, '_vy_payload', wp_slash( wp_json_encode( $payload ) ) );

		$notify = VY_Config::setting( 'submission', 'notify_email' );
		if ( $notify && is_email( $notify ) ) {
			wp_mail( $notify, 'New enquiry: ' . $title, VY_Enquiry_Service::format_text( $payload ) );
		}

		return array( 'ok' => true, 'status' => 'recorded' );
	}
}
