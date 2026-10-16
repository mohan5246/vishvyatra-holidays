<?php
/**
 * Common enquiry submission service used by every service form.
 *
 * Browser -> POST /wp-json/vishvyatra/v1/enquiries -> validate ->
 * build payload -> adapters (local/mock + WhatsApp when enabled).
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Enquiry_Service {

	const ROUTE_NS = 'vishvyatra/v1';

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route(
			self::ROUTE_NS,
			'/enquiries',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => '__return_true', // Public enquiry form; protected by validation, honeypot and rate limit.
			)
		);
	}

	/** @return array<VY_Enquiry_Adapter> */
	public static function adapters() {
		return apply_filters(
			'vy_enquiry_adapters',
			array( new VY_Local_Adapter(), new VY_Mock_Adapter(), new VY_WhatsApp_Adapter() )
		);
	}

	public static function handle( WP_REST_Request $request ) {
		$params      = $request->get_json_params();
		$params      = is_array( $params ) ? $params : array();
		$service_key = isset( $params['service'] ) ? sanitize_key( $params['service'] ) : '';
		$service     = VY_Config::service( $service_key );
		$fields      = isset( $params['fields'] ) && is_array( $params['fields'] ) ? $params['fields'] : array();

		if ( ! $service ) {
			return new WP_REST_Response( array( 'message' => 'Unknown service.' ), 400 );
		}

		// Honeypot: real visitors never fill this hidden field.
		if ( ! empty( $params['website'] ) ) {
			return new WP_REST_Response( array( 'message' => 'Unable to process this enquiry.' ), 400 );
		}

		$idem_key = isset( $params['idempotency_key'] ) ? preg_replace( '/[^a-zA-Z0-9\-]/', '', (string) $params['idempotency_key'] ) : '';
		if ( $idem_key ) {
			$previous = get_transient( 'vy_idem_' . md5( $idem_key ) );
			if ( $previous ) {
				return new WP_REST_Response( $previous, 200 );
			}
		}

		$context = array();
		if ( ! empty( $service['tour_type'] ) ) {
			// The page decides the tour type, never the browser.
			$fields['tour_type']  = $service['tour_type'];
			$context['tour_type'] = $service['tour_type'];
		}

		$result = VY_Validator::validate( $service['form'], $fields, $context );
		if ( $result['errors'] ) {
			return new WP_REST_Response(
				array( 'message' => 'Please correct the highlighted fields.', 'errors' => $result['errors'] ),
				422
			);
		}

		if ( ! self::within_rate_limit() ) {
			return new WP_REST_Response( array( 'message' => 'Too many enquiries were sent from this device. Please try again in a few minutes or call us.' ), 429 );
		}

		$payload = self::build_payload(
			$service_key,
			$result['values'],
			array(
				'request_type' => isset( $params['request_type'] ) ? sanitize_key( $params['request_type'] ) : 'quote',
				'source_page'  => isset( $params['source_page'] ) ? esc_url_raw( $params['source_page'] ) : '',
			)
		);

		$statuses = array();
		foreach ( self::adapters() as $adapter ) {
			if ( 'whatsapp' !== $adapter->name() && ! $adapter->is_enabled() ) {
				continue;
			}
			$outcome                       = $adapter->submit( $payload );
			$statuses[ $adapter->name() ] = $outcome['status'];
			if ( empty( $outcome['ok'] ) && 'whatsapp' !== $adapter->name() ) {
				return new WP_REST_Response(
					array( 'message' => sprintf( 'Sorry, we could not record your enquiry right now. Please call us on %s.', VY_Config::setting( 'contact', 'phone_display' ) ) ),
					500
				);
			}
		}

		do_action( 'vy_enquiry_processed', $payload, $statuses );

		$recorded = in_array( 'recorded', $statuses, true ) || in_array( 'sent', $statuses, true );
		$response = array(
			'status'    => $recorded ? 'recorded' : 'prepared',
			'reference' => $payload['reference'],
			'whatsapp'  => isset( $statuses['whatsapp'] ) ? $statuses['whatsapp'] : 'disabled',
			'message'   => self::confirmation_message( $payload, $recorded ),
		);

		if ( $idem_key ) {
			set_transient( 'vy_idem_' . md5( $idem_key ), $response, 10 * MINUTE_IN_SECONDS );
		}

		return new WP_REST_Response( $response, 200 );
	}

	/**
	 * The structured payload shared by every adapter.
	 */
	public static function build_payload( $service_key, array $values, array $meta = array() ) {
		$service = VY_Config::service( $service_key );
		$forms   = VY_Config::get( 'forms' );
		$form    = $forms[ $service['form'] ];

		$answers = array();
		foreach ( $form['fields'] as $field ) {
			$name = $field['name'];
			if ( ! array_key_exists( $name, $values ) || in_array( $name, array( 'full_name', 'mobile', 'email' ), true ) ) {
				continue;
			}
			$answers[] = array(
				'field' => $name,
				'label' => $field['label'],
				'value' => self::display_value( $field, $values[ $name ] ),
			);
		}

		$payload = array(
			'schema_version' => 1,
			'reference'      => self::new_reference(),
			'channel'        => 'website',
			'request_type'   => isset( $meta['request_type'] ) && 'special_price' === $meta['request_type'] ? 'special_price' : 'quote',
			'service'        => array(
				'key'   => $service_key,
				'label' => $service['label'],
				'form'  => $service['form'],
			),
			'customer'       => array(
				'name'   => isset( $values['full_name'] ) ? $values['full_name'] : '',
				'mobile' => isset( $values['mobile'] ) ? $values['mobile'] : '',
				'email'  => isset( $values['email'] ) ? $values['email'] : '',
			),
			'answers'        => $answers,
			'values'         => $values,
			'source_page'    => isset( $meta['source_page'] ) ? $meta['source_page'] : '',
			'submitted_at'   => wp_date( 'c' ),
		);

		if ( ! empty( $service['tour_type'] ) ) {
			$payload['service']['tour_type'] = $service['tour_type'];
		}

		if ( 'visa' === $service['form'] ) {
			$pricing            = VY_Config::get( 'visa' )['pricing'];
			$country            = isset( $values['country'] ) ? $values['country'] : '';
			$category           = isset( $values['visa_category'] ) ? $values['visa_category'] : '';
			$payload['pricing'] = array(
				'visa_service_amount' => VY_Config::visa_amount( $country, $category ),
				'currency'            => $pricing['currency'],
				'note'                => 'Agency service charge only; embassy and third-party fees are separate.',
			);
		}

		return apply_filters( 'vy_enquiry_payload', $payload, $service_key, $values );
	}

	/** Human-readable summary used for the admin entry, email and WhatsApp. */
	public static function format_text( array $payload ) {
		$lines   = array();
		$lines[] = 'Reference: ' . $payload['reference'];
		$lines[] = 'Service: ' . $payload['service']['label'] . ( 'special_price' === $payload['request_type'] ? ' (special price request)' : '' );
		$lines[] = 'Name: ' . $payload['customer']['name'];
		$lines[] = 'Mobile: ' . $payload['customer']['mobile'];
		if ( $payload['customer']['email'] ) {
			$lines[] = 'Email: ' . $payload['customer']['email'];
		}
		foreach ( $payload['answers'] as $answer ) {
			$lines[] = $answer['label'] . ': ' . $answer['value'];
		}
		if ( ! empty( $payload['pricing'] ) ) {
			$lines[] = 'Standard visa service amount: ' . VY_Config::format_inr( $payload['pricing']['visa_service_amount'] );
		}
		$lines[] = 'Submitted: ' . $payload['submitted_at'];
		if ( $payload['source_page'] ) {
			$lines[] = 'Page: ' . $payload['source_page'];
		}
		return implode( "\n", $lines );
	}

	private static function display_value( $field, $value ) {
		if ( 'tour_type' === $field['name'] ) {
			return ucfirst( $value );
		}
		if ( ! empty( $field['prefix'] ) && '₹' === $field['prefix'] ) {
			return VY_Config::format_inr( $value );
		}
		if ( 'datetime-local' === $field['type'] ) {
			return str_replace( 'T', ' ', $value );
		}
		return (string) $value;
	}

	private static function confirmation_message( $payload, $recorded ) {
		$phone = VY_Config::setting( 'contact', 'phone_display' );
		$what  = 'special_price' === $payload['request_type'] ? 'special-price request' : 'enquiry';
		if ( $recorded ) {
			return sprintf(
				'Thank you, %1$s. Your %2$s %3$s has been received (reference %4$s). Our team will contact you on %5$s. For anything urgent, please call %6$s.',
				$payload['customer']['name'],
				$payload['service']['label'],
				$what,
				$payload['reference'],
				$payload['customer']['mobile'],
				$phone
			);
		}
		return sprintf(
			'Demo mode: your %1$s was checked and prepared (reference %2$s) but has not been sent to our team. Please call %3$s to speak to us.',
			$what,
			$payload['reference'],
			$phone
		);
	}

	private static function new_reference() {
		$prefix = VY_Config::setting( 'submission', 'reference_prefix', 'VY' );
		return sprintf( '%s-%s-%s', $prefix, wp_date( 'ymd' ), strtoupper( wp_generate_password( 5, false, false ) ) );
	}

	private static function within_rate_limit() {
		$limit = (int) VY_Config::setting( 'submission', 'rate_limit', 8 );
		$ip    = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		$key   = 'vy_rl_' . md5( $ip . wp_salt( 'nonce' ) );
		$count = (int) get_transient( $key );
		if ( $count >= $limit ) {
			return false;
		}
		set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );
		return true;
	}
}
