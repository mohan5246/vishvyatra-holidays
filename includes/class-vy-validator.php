<?php
/**
 * Server-side validation for enquiry forms, driven by config/forms.php.
 * Mirrors the browser validation in assets/js/vy-forms.js.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Validator {

	const OTHER = '__other';

	/**
	 * @param string $form_key Form key in forms.php.
	 * @param array  $input    Raw submitted values.
	 * @param array  $context  e.g. array( 'tour_type' => 'domestic' ).
	 * @return array{values: array, errors: array}
	 */
	public static function validate( $form_key, array $input, array $context = array() ) {
		$forms = VY_Config::get( 'forms' );
		if ( ! isset( $forms[ $form_key ] ) ) {
			return array( 'values' => array(), 'errors' => array( '_form' => 'Unknown form.' ) );
		}
		$form   = $forms[ $form_key ];
		$values = array();
		$errors = array();

		// First pass: normalise every raw value so show_if can see them.
		$raw = array();
		foreach ( $form['fields'] as $field ) {
			$name         = $field['name'];
			$raw[ $name ] = isset( $input[ $name ] ) && is_scalar( $input[ $name ] ) ? trim( wp_unslash( (string) $input[ $name ] ) ) : '';
		}

		foreach ( $form['fields'] as $field ) {
			$name = $field['name'];
			if ( ! self::is_visible( $field, $raw ) ) {
				continue;
			}
			$value    = $raw[ $name ];
			$required = ! empty( $field['required'] ) || self::condition_met( isset( $field['required_if'] ) ? $field['required_if'] : null, $raw );

			if ( '' === $value ) {
				if ( $required ) {
					$errors[ $name ] = self::required_message( $field );
				}
				continue;
			}

			$error = self::check_field( $field, $value, $context );
			if ( $error ) {
				$errors[ $name ] = $error;
				continue;
			}

			if ( ! empty( $field['other'] ) && self::OTHER === $value ) {
				$other = isset( $input[ $name . '_other' ] ) && is_scalar( $input[ $name . '_other' ] ) ? sanitize_text_field( wp_unslash( (string) $input[ $name . '_other' ] ) ) : '';
				if ( '' === $other ) {
					$errors[ $name . '_other' ] = 'Please specify.';
					continue;
				}
				$value = mb_substr( $other, 0, 100 );
			}

			$values[ $name ] = self::clean( $field, $value );
		}

		foreach ( $form['rules'] as $rule ) {
			if ( isset( $errors[ $rule['target'] ] ) ) {
				continue;
			}
			if ( ! self::rule_passes( $rule, $values ) ) {
				$errors[ $rule['target'] ] = $rule['message'];
			}
		}

		return array( 'values' => $values, 'errors' => $errors );
	}

	public static function is_visible( $field, $raw ) {
		return empty( $field['show_if'] ) || self::condition_met( $field['show_if'], $raw );
	}

	private static function condition_met( $condition, $raw ) {
		if ( empty( $condition ) ) {
			return false;
		}
		list( $other, $expected ) = $condition;
		return isset( $raw[ $other ] ) && $raw[ $other ] === $expected;
	}

	private static function required_message( $field ) {
		return in_array( $field['type'], array( 'select', 'radio' ), true ) ? 'Please choose an option.' : 'This field is required.';
	}

	private static function check_field( $field, $value, $context ) {
		$max_len = isset( $field['maxlength'] ) ? (int) $field['maxlength'] : 500;
		if ( mb_strlen( $value ) > $max_len ) {
			return sprintf( 'Please keep this under %d characters.', $max_len );
		}

		switch ( $field['type'] ) {
			case 'email':
				return is_email( $value ) ? null : 'Please enter a valid email address.';

			case 'tel':
				return self::valid_phone( $value ) ? null : 'Please enter a valid mobile number (10 to 15 digits).';

			case 'number':
				if ( ! is_numeric( $value ) ) {
					return 'Please enter a number.';
				}
				$num = $value + 0;
				if ( ! empty( $field['integer'] ) && floor( $num ) != $num ) { // phpcs:ignore Universal.Operators.StrictComparisons
					return 'Please enter a whole number.';
				}
				if ( isset( $field['min'] ) && $num < $field['min'] ) {
					return sprintf( 'Must be %s or more.', $field['min'] );
				}
				if ( isset( $field['max'] ) && $num > $field['max'] ) {
					return sprintf( 'Must be %s or less.', $field['max'] );
				}
				return null;

			case 'date':
			case 'datetime-local':
				$ts = self::parse_date( $value, $field['type'] );
				if ( null === $ts ) {
					return 'Please enter a valid date.';
				}
				if ( ! empty( $field['min_today'] ) && substr( $value, 0, 10 ) < wp_date( 'Y-m-d' ) ) {
					return 'Date cannot be in the past.';
				}
				return null;

			case 'select':
			case 'radio':
			case 'hidden':
				if ( empty( $field['options'] ) ) {
					return null;
				}
				return in_array( $value, VY_Config::allowed_values( $field, $context ), true ) ? null : 'Please choose a valid option.';
		}
		return null;
	}

	public static function valid_phone( $value ) {
		if ( ! preg_match( '/^\+?[0-9\s\-()]+$/', $value ) ) {
			return false;
		}
		$digits = preg_replace( '/\D/', '', $value );
		return strlen( $digits ) >= 10 && strlen( $digits ) <= 15;
	}

	private static function parse_date( $value, $type ) {
		$format = 'date' === $type ? 'Y-m-d' : 'Y-m-d\TH:i';
		$date   = DateTime::createFromFormat( '!' . $format, $value );
		if ( ! $date || $date->format( $format ) !== $value ) {
			return null;
		}
		return $date->getTimestamp();
	}

	private static function clean( $field, $value ) {
		switch ( $field['type'] ) {
			case 'number':
				return ! empty( $field['integer'] ) ? (int) $value : (float) $value;
			case 'email':
				return sanitize_email( $value );
			case 'textarea':
				return sanitize_textarea_field( $value );
			default:
				return sanitize_text_field( $value );
		}
	}

	private static function rule_passes( $rule, $values ) {
		switch ( $rule['rule'] ) {
			case 'sum_min':
				$sum = 0;
				foreach ( $rule['fields'] as $f ) {
					$sum += isset( $values[ $f ] ) ? $values[ $f ] : 0;
				}
				return $sum >= $rule['min'];
			case 'lte':
				if ( ! isset( $values[ $rule['a'] ], $values[ $rule['b'] ] ) ) {
					return true;
				}
				return $values[ $rule['a'] ] <= $values[ $rule['b'] ];
			case 'date_gte':
			case 'date_gt':
				if ( empty( $values[ $rule['a'] ] ) || empty( $values[ $rule['b'] ] ) ) {
					return true;
				}
				// ISO strings of the same format compare correctly as strings.
				return 'date_gte' === $rule['rule'] ? $values[ $rule['a'] ] >= $values[ $rule['b'] ] : $values[ $rule['a'] ] > $values[ $rule['b'] ];
			case 'required_if':
				$when = isset( $values[ $rule['when'] ] ) ? $values[ $rule['when'] ] : '';
				return $when !== $rule['equals'] || ! empty( $values[ $rule['field'] ] );
		}
		return true;
	}
}
