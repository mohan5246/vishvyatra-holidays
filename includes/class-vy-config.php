<?php
/**
 * Loads the configuration files and exposes helpers built on them.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Config {

	/** @var array<string,array> */
	private static $cache = array();

	/**
	 * Returns a config file's array, filtered through `vy_config_{name}`
	 * (and `vy_settings` for settings) so a site can override values
	 * without editing plugin files.
	 */
	public static function get( $name ) {
		if ( ! isset( self::$cache[ $name ] ) ) {
			$data = require VY_DIR . 'includes/config/' . $name . '.php';
			if ( 'settings' === $name ) {
				$data = apply_filters( 'vy_settings', $data );
			}
			self::$cache[ $name ] = apply_filters( 'vy_config_' . $name, $data );
		}
		return self::$cache[ $name ];
	}

	public static function setting( $group, $key = null, $default = null ) {
		$settings = self::get( 'settings' );
		$value    = isset( $settings[ $group ] ) ? $settings[ $group ] : $default;
		if ( null === $key ) {
			return $value;
		}
		return ( is_array( $value ) && array_key_exists( $key, $value ) ) ? $value[ $key ] : $default;
	}

	public static function services() {
		return self::get( 'services' );
	}

	public static function service( $key ) {
		$services = self::services();
		return isset( $services[ $key ] ) ? $services[ $key ] : null;
	}

	public static function service_url( $key ) {
		$service = self::service( $key );
		return $service ? home_url( '/' . $service['slug'] . '/' ) : home_url( '/' );
	}

	/** Finds the service whose page slug matches the given page. */
	public static function service_for_post( $post ) {
		$post = get_post( $post );
		if ( ! $post || 'page' !== $post->post_type ) {
			return null;
		}
		foreach ( self::services() as $key => $service ) {
			if ( $service['slug'] === $post->post_name ) {
				return $key;
			}
		}
		return null;
	}

	/**
	 * The visa service amount for a country / category (country beats
	 * category beats default).
	 */
	public static function visa_amount( $country = '', $category = '' ) {
		$pricing = self::get( 'visa' )['pricing'];
		if ( $country && isset( $pricing['by_country'][ $country ] ) ) {
			return (int) $pricing['by_country'][ $country ];
		}
		if ( $category && isset( $pricing['by_category'][ $category ] ) ) {
			return (int) $pricing['by_category'][ $category ];
		}
		return (int) $pricing['default'];
	}

	public static function format_inr( $amount ) {
		// Indian digit grouping: 1,00,000.
		$amount = (string) (int) $amount;
		if ( strlen( $amount ) <= 3 ) {
			return '₹' . $amount;
		}
		$last3 = substr( $amount, -3 );
		$rest  = substr( $amount, 0, -3 );
		$rest  = preg_replace( '/\B(?=(\d{2})+(?!\d))/', ',', $rest );
		return '₹' . $rest . ',' . $last3;
	}

	/**
	 * Options for a select/radio field, resolving `source` lists.
	 * Returns a flat list of strings, or for grouped sources an array of
	 * array( 'group' => label, 'options' => list ).
	 */
	public static function field_options( $field, $context = array() ) {
		if ( empty( $field['options'] ) ) {
			return array();
		}
		if ( ! isset( $field['options']['source'] ) ) {
			return $field['options'];
		}
		switch ( $field['options']['source'] ) {
			case 'destinations':
				$type   = isset( $context['tour_type'] ) ? $context['tour_type'] : 'international';
				$lists  = self::get( 'destinations' );
				$groups = isset( $lists[ $type ] ) ? $lists[ $type ] : array();
				$out    = array();
				foreach ( $groups as $label => $options ) {
					$out[] = array( 'group' => $label, 'options' => array_values( $options ) );
				}
				return $out;
			case 'visa_countries':
				return self::get( 'visa' )['countries'];
			case 'visa_categories':
				return self::get( 'visa' )['categories'];
		}
		return array();
	}

	/** Flat list of allowed values for a field (groups flattened). */
	public static function allowed_values( $field, $context = array() ) {
		$values = array();
		foreach ( self::field_options( $field, $context ) as $option ) {
			if ( is_array( $option ) ) {
				$values = array_merge( $values, $option['options'] );
			} else {
				$values[] = $option;
			}
		}
		if ( ! empty( $field['other'] ) ) {
			$values[] = '__other';
		}
		return $values;
	}

	/** Required-field labels of a form, used by the chatbot. */
	public static function required_labels( $form_key ) {
		$forms = self::get( 'forms' );
		$out   = array();
		foreach ( $forms[ $form_key ]['fields'] as $field ) {
			if ( ! empty( $field['required'] ) && 'hidden' !== $field['type'] ) {
				$out[] = $field['label'];
			}
		}
		return $out;
	}
}
