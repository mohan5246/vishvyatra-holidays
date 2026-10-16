<?php
/**
 * WP Admin: private "Enquiries" list for enquiries recorded in local mode.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Admin {

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
		add_action( 'add_meta_boxes_' . VY_Local_Adapter::POST_TYPE, array( __CLASS__, 'meta_boxes' ) );
		add_filter( 'manage_' . VY_Local_Adapter::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . VY_Local_Adapter::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column_value' ), 10, 2 );
	}

	public static function register_post_type() {
		register_post_type(
			VY_Local_Adapter::POST_TYPE,
			array(
				'labels'          => array(
					'name'          => 'Enquiries',
					'singular_name' => 'Enquiry',
					'menu_name'     => 'Enquiries',
					'all_items'     => 'All Enquiries',
					'edit_item'     => 'Enquiry',
					'search_items'  => 'Search Enquiries',
				),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => true,
				'show_in_rest'    => false,
				'menu_icon'       => 'dashicons-email-alt',
				'supports'        => array( 'title' ),
				'capability_type' => 'page', // Editors and administrators only.
				'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
				'map_meta_cap'    => true,
				'rewrite'         => false,
				'query_var'       => false,
			)
		);
	}

	public static function meta_boxes() {
		add_meta_box( 'vy_enquiry_details', 'Enquiry details', array( __CLASS__, 'render_details' ), null, 'normal', 'high' );
	}

	public static function render_details( $post ) {
		$payload = json_decode( (string) get_post_meta( $post->ID, '_vy_payload', true ), true );
		if ( ! is_array( $payload ) ) {
			echo '<p>No details stored.</p>';
			return;
		}
		echo '<table class="widefat striped"><tbody>';
		$rows = array(
			'Reference' => $payload['reference'],
			'Service'   => $payload['service']['label'] . ( 'special_price' === $payload['request_type'] ? ' (special price request)' : '' ),
			'Package / page' => ! empty( $payload['context'] ) ? $payload['context']['title'] . ( $payload['context']['details'] ? ' (' . $payload['context']['details'] . ')' : '' ) : '',
			'Name'      => $payload['customer']['name'],
			'Mobile'    => $payload['customer']['mobile'],
			'Email'     => $payload['customer']['email'],
		);
		foreach ( $payload['answers'] as $answer ) {
			$rows[ $answer['label'] ] = $answer['value'];
		}
		if ( ! empty( $payload['pricing'] ) ) {
			$rows['Standard visa service amount'] = VY_Config::format_inr( $payload['pricing']['visa_service_amount'] );
		}
		$rows['Submitted'] = $payload['submitted_at'];
		$rows['Page']      = $payload['source_page'];
		foreach ( $rows as $label => $value ) {
			printf( '<tr><th style="width:30%%">%s</th><td>%s</td></tr>', esc_html( $label ), nl2br( esc_html( (string) $value ) ) );
		}
		echo '</tbody></table>';
		echo '<details style="margin-top:12px"><summary>Raw payload (JSON)</summary><pre style="white-space:pre-wrap">' . esc_html( wp_json_encode( $payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ) . '</pre></details>';
	}

	public static function columns( $columns ) {
		return array(
			'cb'         => $columns['cb'],
			'title'      => 'Enquiry',
			'vy_service' => 'Service',
			'date'       => $columns['date'],
		);
	}

	public static function column_value( $column, $post_id ) {
		if ( 'vy_service' === $column ) {
			$service = VY_Config::service( get_post_meta( $post_id, '_vy_service', true ) );
			echo esc_html( $service ? $service['label'] : '' );
		}
	}
}
