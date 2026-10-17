<?php
/**
 * Travel quiz: config for the browser and the reward-code endpoint.
 *
 * POST /wp-json/vishvyatra/v1/quiz/claim  { answers: [ { id, choice } ] }
 * The server re-checks every answer and only then issues a code, remembered
 * for `code_days` so it can be recognised when an enquiry carries it.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Quiz {

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route(
			VY_Enquiry_Service::ROUTE_NS,
			'/quiz/claim',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'claim' ),
				'permission_callback' => '__return_true', // Public; answers are re-checked and rate limited.
			)
		);
	}

	/** Quiz settings for the browser. */
	public static function public_config() {
		$quiz = VY_Config::get( 'quiz' );
		if ( empty( $quiz['enabled'] ) ) {
			return array( 'enabled' => false );
		}
		$uploads = wp_get_upload_dir();
		return array(
			'enabled'         => true,
			'claimUrl'        => esc_url_raw( rest_url( VY_Enquiry_Service::ROUTE_NS . '/quiz/claim' ) ),
			'imageBase'       => trailingslashit( $uploads['baseurl'] ),
			'questions'       => (int) $quiz['questions'],
			'requiredCorrect' => (int) $quiz['required_correct'],
			'rewardPercent'   => (int) $quiz['reward_percent'],
			'rewardLabel'     => $quiz['reward_label'],
			'inviteDelay'     => (int) $quiz['invite_delay_ms'],
			'terms'           => $quiz['terms'],
			'pool'            => $quiz['pool'],
		);
	}

	public static function claim( WP_REST_Request $request ) {
		$quiz    = VY_Config::get( 'quiz' );
		$answers = $request->get_param( 'answers' );
		if ( empty( $quiz['enabled'] ) || ! is_array( $answers ) ) {
			return new WP_REST_Response( array( 'message' => 'Quiz unavailable.' ), 400 );
		}

		$pool = array();
		foreach ( $quiz['pool'] as $q ) {
			$pool[ $q['id'] ] = (int) $q['answer'];
		}

		$seen    = array();
		$correct = 0;
		foreach ( $answers as $a ) {
			$id = is_array( $a ) && isset( $a['id'] ) ? sanitize_key( $a['id'] ) : '';
			if ( ! isset( $pool[ $id ] ) || isset( $seen[ $id ] ) ) {
				continue;
			}
			$seen[ $id ] = true;
			if ( isset( $a['choice'] ) && (int) $a['choice'] === $pool[ $id ] ) {
				$correct++;
			}
		}

		if ( count( $seen ) < (int) $quiz['questions'] || $correct < (int) $quiz['required_correct'] ) {
			return new WP_REST_Response( array( 'won' => false, 'correct' => $correct ), 200 );
		}

		$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
		$key = 'vy_quiz_rl_' . md5( $ip . wp_salt( 'nonce' ) );
		$n   = (int) get_transient( $key );
		if ( $n >= 5 ) {
			return new WP_REST_Response( array( 'message' => 'Too many attempts from this device. Please try again later.' ), 429 );
		}
		set_transient( $key, $n + 1, DAY_IN_SECONDS );

		$code = $quiz['code_prefix'] . '-' . strtoupper( wp_generate_password( 6, false, false ) );
		set_transient( 'vy_quiz_code_' . strtolower( $code ), array( 'issued' => time() ), (int) $quiz['code_days'] * DAY_IN_SECONDS );

		return new WP_REST_Response(
			array(
				'won'     => true,
				'correct' => $correct,
				'code'    => $code,
				'percent' => (int) $quiz['reward_percent'],
			),
			200
		);
	}

	/**
	 * Reward details for an enquiry, or null. `verified` is true only for a
	 * code this site issued and that has not expired.
	 */
	public static function reward_for( $code ) {
		$code = strtoupper( preg_replace( '/[^A-Za-z0-9\-]/', '', (string) $code ) );
		if ( '' === $code || strlen( $code ) > 20 ) {
			return null;
		}
		$quiz = VY_Config::get( 'quiz' );
		return array(
			'code'     => $code,
			'percent'  => (int) $quiz['reward_percent'],
			'verified' => (bool) get_transient( 'vy_quiz_code_' . strtolower( $code ) ),
		);
	}
}
