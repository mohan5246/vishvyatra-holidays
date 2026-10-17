<?php
/**
 * Front-end: assets, shortcodes, service blocks, popup / chatbot mount
 * points and hiding the homepage general enquiry form.
 *
 * @package VishvYatra_Enhancements
 */

defined( 'ABSPATH' ) || exit;

class VY_Frontend {

	/** @var bool Set once an enquiry form has been printed on this request. */
	private static $form_rendered = false;

	/** @var bool True while WordPress renders a widget area (sidebar). */
	private static $in_sidebar = false;

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ) );
		add_action( 'wp_footer', array( __CLASS__, 'footer_mounts' ), 5 );
		add_filter( 'the_content', array( __CLASS__, 'append_home_cta' ), 21 );

		add_shortcode( 'vy_service_page', array( __CLASS__, 'shortcode_service_page' ) );
		add_shortcode( 'vy_enquiry_form', array( __CLASS__, 'shortcode_enquiry_form' ) );
		add_shortcode( 'vy_service_grid', array( __CLASS__, 'shortcode_service_grid' ) );
		// [vy_travel_quiz label="Play the Travel Quiz"] - a button editors can place anywhere.
		add_shortcode(
			'vy_travel_quiz',
			static function ( $atts ) {
				$atts = shortcode_atts( array( 'label' => 'Play the Travel Quiz' ), $atts, 'vy_travel_quiz' );
				return '<button type="button" class="vy-btn" data-vy-open-quiz>🧠 ' . esc_html( $atts['label'] ) . '</button>';
			}
		);

		if ( VY_Config::setting( 'contact_form_7', 'replace', true ) ) {
			add_filter( 'widget_display_callback', array( __CLASS__, 'replace_cf7_widget' ), 10, 3 );
			add_filter( 'do_shortcode_tag', array( __CLASS__, 'replace_cf7' ), 10, 2 );
			add_action( 'dynamic_sidebar_before', static function () { self::$in_sidebar = true; } );
			add_action( 'dynamic_sidebar_after', static function () { self::$in_sidebar = false; } );
		}
	}

	/**
	 * Replaces the theme's Contact Form 7 enquiry forms on pages that get
	 * one of our enquiry sections: in the sidebar with a short card that
	 * jumps to our form, elsewhere with nothing (our form is below the page
	 * content). Pages without our section (e.g. the homepage) keep CF7 output,
	 * and CF7 itself, its forms and submissions are not modified.
	 */
	public static function replace_cf7( $output, $tag ) {
		if ( ! in_array( $tag, array( 'contact-form-7', 'contact-form' ), true ) || is_admin() || wp_doing_ajax() ) {
			return $output;
		}
		$context = VY_Context::current();
		if ( ! $context || ! VY_Config::get( 'settings' )['auto_insert'] ) {
			return $output;
		}
		return self::$in_sidebar ? self::render_sidebar_cta( $context ) : '';
	}

	/**
	 * A sidebar widget whose content is a Contact Form 7 form (the theme's
	 * "Contact Enquiry" widget) is shown as our card instead, title included.
	 */
	public static function replace_cf7_widget( $instance, $widget, $args ) {
		if ( ! is_array( $instance ) || empty( $instance['text'] ) || ! preg_match( '/\[contact-form(-7)?\s/', (string) $instance['text'] ) ) {
			return $instance;
		}
		$context = VY_Context::current();
		if ( ! $context || ! VY_Config::get( 'settings' )['auto_insert'] ) {
			return $instance;
		}
		echo $args['before_widget'] . self::render_sidebar_cta( $context ) . $args['after_widget']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		return false;
	}

	public static function render_sidebar_cta( $context ) {
		$service = VY_Config::service( $context['service'] );
		$package = ! empty( $context['context']['kind'] ) && 'package' === $context['context']['kind'];
		$title   = $package ? 'Enquire about this package' : 'Request a quote';
		$text    = $package
			? 'Get a custom quote for ' . $context['context']['title'] . '. Destination and duration are already filled in for you.'
			: 'Tell us what you need and our team will get back to you.';
		if ( ! empty( $context['service_page'] ) ) {
			$text = 'Share your requirements for ' . $service['label'] . ' and our team will send you a quote.';
		}
		return '<div class="vy-sidebar-cta"><p class="vy-sidebar-cta__title">' . esc_html( $title ) . '</p><p>' . esc_html( $text ) . '</p>'
			. '<a class="vy-btn" href="#vy-enquiry">' . esc_html__( 'Request a Quote', 'vishvyatra' ) . '</a></div>';
	}

	public static function enqueue() {
		wp_enqueue_style( 'vy-enhancements', VY_URL . 'assets/css/vy.css', array(), VY_VERSION );

		wp_enqueue_script( 'vy-core', VY_URL . 'assets/js/vy-core.js', array(), VY_VERSION, true );
		wp_add_inline_script( 'vy-core', 'window.VY_CONFIG = ' . wp_json_encode( self::public_config() ) . ';', 'before' );
		foreach ( array( 'vy-xlsx', 'vy-forms', 'vy-popup', 'vy-chatbot', 'vy-quotebar', 'vy-quiz', 'vy-engage' ) as $handle ) {
			wp_enqueue_script( $handle, VY_URL . 'assets/js/' . $handle . '.js', array( 'vy-core' ), VY_VERSION, true );
		}
	}

	/**
	 * Everything the browser needs. Contains no secrets: WhatsApp numbers and
	 * tokens live only in wp-config.php and are never included here.
	 */
	public static function public_config() {
		$forms = array();
		foreach ( VY_Config::get( 'forms' ) as $key => $form ) {
			$forms[ $key ] = $form;
		}

		$services = array();
		$chat     = VY_Config::get( 'chatbot' );
		foreach ( VY_Config::services() as $key => $service ) {
			$services[ $key ] = array(
				'label'     => $service['label'],
				'url'       => VY_Config::service_url( $key ),
				'icon'      => $service['icon'],
				'form'      => $service['form'],
				'tour_type' => isset( $service['tour_type'] ) ? $service['tour_type'] : null,
				'summary'   => $service['summary'],
				'chat'      => isset( $chat['services'][ $key ] ) ? $chat['services'][ $key ] : $service['summary'],
				'needs'     => VY_Config::required_labels( $service['form'] ),
			);
		}

		$visa = VY_Config::get( 'visa' );

		return array(
			'restUrl'      => esc_url_raw( rest_url( VY_Enquiry_Service::ROUTE_NS . '/enquiries' ) ),
			'homeUrl'      => home_url( '/' ),
			'isFrontPage'  => is_front_page(),
			'currentService' => ( $ctx = VY_Context::current() ) ? $ctx['service'] : null, // phpcs:ignore Generic.CodeAnalysis.AssignmentInCondition
			'today'        => wp_date( 'Y-m-d' ),
			'contact'      => VY_Config::setting( 'contact' ),
			'popup'        => VY_Config::setting( 'popup' ),
			'quoteBar'     => VY_Config::setting( 'quote_bar' ),
			'quiz'         => VY_Quiz::public_config(),
			'engage'       => self::engage_config(),
			'chatbotEnabled' => (bool) VY_Config::setting( 'chatbot', 'enabled', true ),
			'services'     => $services,
			'forms'        => $forms,
			'destinations' => VY_Config::get( 'destinations' ),
			'visa'         => array(
				'countries'  => $visa['countries'],
				'categories' => $visa['categories'],
				'pricing'    => $visa['pricing'],
				'checklist'  => $visa['checklist'],
			),
			'chatbot'      => $chat,
		);
	}

	/** Holiday Finder, wishlist, itinerary and stories settings for the browser. */
	public static function engage_config() {
		$engage  = VY_Config::get( 'engage' );
		$uploads = wp_get_upload_dir();
		$stories = $engage['stories'];
		foreach ( $stories['items'] as &$story ) {
			$story['link'] = home_url( '/' . $story['link'] . '/' );
		}
		unset( $story );
		return array(
			'catalogUrl' => esc_url_raw( rest_url( VY_Enquiry_Service::ROUTE_NS . '/packages' ) ),
			'imageBase'  => trailingslashit( $uploads['baseurl'] ),
			'themes'     => VY_Catalog::themes(),
			'finder'     => $engage['finder'],
			'wishlist'   => $engage['wishlist'],
			'itinerary'  => $engage['itinerary'],
			'stories'    => $stories,
		);
	}

	public static function body_class( $classes ) {
		$hide_on = VY_Config::setting( 'general_enquiry', 'hide_on', 'front_page' );
		if ( 'all' === $hide_on || ( 'front_page' === $hide_on && is_front_page() ) ) {
			$classes[] = 'vy-hide-general-enquiry';
		}
		return $classes;
	}

	public static function footer_mounts() {
		echo '<div id="vy-popup-root"></div><div id="vy-chatbot-root"></div>';
		// Jumps to this page's form when it has one, otherwise opens the service popup.
		if ( self::$form_rendered ) {
			echo '<a class="vy-side-tab" href="#vy-enquiry">' . esc_html__( 'Get a Quote', 'vishvyatra' ) . '</a>';
		} else {
			echo '<button type="button" class="vy-side-tab" data-vy-open-services>' . esc_html__( 'Get a Quote', 'vishvyatra' ) . '</button>';
		}
	}

	/** Service-discovery band at the end of the homepage, where enquiry used to happen. */
	public static function append_home_cta( $content ) {
		if ( ! is_front_page() || ! in_the_loop() || ! is_main_query() || has_shortcode( (string) get_post_field( 'post_content' ), 'vy_service_grid' ) ) {
			return $content;
		}
		static $done = false;
		if ( $done ) {
			return $content;
		}
		$done = true;
		$content = self::insert_stories( $content );
		return $content . self::shortcode_service_grid( array() );
	}

	/** Destination stories row, placed after the homepage's first section (the banner). */
	public static function insert_stories( $content ) {
		if ( empty( VY_Config::get( 'engage' )['stories']['enabled'] ) ) {
			return $content;
		}
		$mount  = '<div class="vy-stories" data-vy-stories></div>';
		$marker = '<!-- .et_pb_section -->';
		$pos    = strpos( $content, $marker );
		return false === $pos ? $mount . $content : substr( $content, 0, $pos + strlen( $marker ) ) . $mount . substr( $content, $pos + strlen( $marker ) );
	}

	public static function shortcode_service_grid( $atts ) {
		$atts = shortcode_atts(
			array(
				'title' => 'What are you looking for today?',
				'text'  => 'Choose a service to see the details and request a quote from our team.',
			),
			$atts,
			'vy_service_grid'
		);
		ob_start();
		?>
		<section class="vy-section vy-discovery" aria-labelledby="vy-discovery-title">
			<div class="vy-container">
				<h2 id="vy-discovery-title" class="vy-heading"><?php echo esc_html( $atts['title'] ); ?></h2>
				<p class="vy-lead"><?php echo esc_html( $atts['text'] ); ?></p>
				<ul class="vy-service-grid">
					<?php foreach ( VY_Config::services() as $key => $service ) : ?>
						<li>
							<a class="vy-service-card" href="<?php echo esc_url( VY_Config::service_url( $key ) ); ?>">
								<span class="vy-icon" data-vy-icon="<?php echo esc_attr( $service['icon'] ); ?>" aria-hidden="true"></span>
								<span class="vy-service-card__label"><?php echo esc_html( $service['label'] ); ?></span>
							</a>
						</li>
					<?php endforeach; ?>
				</ul>
				<?php if ( ! empty( VY_Config::get( 'engage' )['finder']['enabled'] ) ) : ?>
					<div class="vy-finder-cta">
						<p><span aria-hidden="true">✨</span> <strong>Not sure where to go?</strong> Answer 4 quick questions and we'll match you with real packages.</p>
						<button type="button" class="vy-btn" data-vy-open-finder><?php esc_html_e( 'Find my perfect holiday', 'vishvyatra' ); ?></button>
					</div>
				<?php endif; ?>
				<?php if ( ! empty( VY_Config::get( 'quiz' )['enabled'] ) ) : ?>
					<div class="vy-finder-cta vy-quiz-cta">
						<p><span aria-hidden="true">🧠</span> <strong>Travel Quiz:</strong> guess 5 famous places from photos. Play as often as you like!</p>
						<button type="button" class="vy-btn" data-vy-open-quiz><?php esc_html_e( 'Play the Travel Quiz', 'vishvyatra' ); ?></button>
					</div>
				<?php endif; ?>
			</div>
		</section>
		<?php
		return ob_get_clean();
	}

	public static function shortcode_service_page( $atts ) {
		$atts = shortcode_atts( array( 'service' => '' ), $atts, 'vy_service_page' );
		return VY_Config::service( $atts['service'] ) ? self::render_service_block( $atts['service'], true ) : '';
	}

	public static function shortcode_enquiry_form( $atts ) {
		$atts = shortcode_atts( array( 'service' => '' ), $atts, 'vy_enquiry_form' );
		return VY_Config::service( $atts['service'] ) ? self::render_form_mount( $atts['service'] ) : '';
	}

	/**
	 * Service information + (for visa) pricing and checklist + enquiry form.
	 *
	 * @param string $key        Service key.
	 * @param bool   $with_intro Show the intro text (pages created by the plugin).
	 */
	public static function render_service_block( $key, $with_intro ) {
		$service = VY_Config::service( $key );
		$content = VY_Config::get( 'content' );
		$info    = isset( $content[ $key ] ) ? $content[ $key ] : array();

		ob_start();
		?>
		<section class="vy-section vy-service" data-vy-service-block="<?php echo esc_attr( $key ); ?>">
			<div class="vy-container">
				<?php if ( $with_intro ) : ?>
					<h1 class="vy-heading vy-heading--page"><?php echo esc_html( $service['label'] ); ?></h1>
					<?php if ( ! empty( $info['intro'] ) ) : ?>
						<p class="vy-lead"><?php echo esc_html( $info['intro'] ); ?></p>
					<?php endif; ?>
				<?php endif; ?>

				<?php if ( ! empty( $service['tour_type'] ) ) : ?>
					<p class="vy-badge"><?php echo esc_html( 'international' === $service['tour_type'] ? 'International Tour' : 'Domestic Tour' ); ?></p>
				<?php endif; ?>

				<div class="vy-info-grid">
					<?php if ( ! empty( $info['includes'] ) ) : ?>
						<div class="vy-card">
							<h2 class="vy-card__title"><?php esc_html_e( 'What we can help with', 'vishvyatra' ); ?></h2>
							<ul class="vy-list vy-list--check">
								<?php foreach ( $info['includes'] as $item ) : ?>
									<li><?php echo esc_html( $item ); ?></li>
								<?php endforeach; ?>
							</ul>
						</div>
					<?php endif; ?>

					<?php if ( 'visa' === $service['form'] ) : ?>
						<?php self::render_visa_pricing(); ?>
					<?php elseif ( ! empty( $info['important'] ) ) : ?>
						<div class="vy-card vy-card--note">
							<h2 class="vy-card__title"><?php esc_html_e( 'Important information', 'vishvyatra' ); ?></h2>
							<ul class="vy-list">
								<?php foreach ( $info['important'] as $item ) : ?>
									<li><?php echo esc_html( $item ); ?></li>
								<?php endforeach; ?>
							</ul>
						</div>
					<?php endif; ?>
				</div>

				<?php echo self::render_form_mount( $key ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</div>
		</section>
		<?php
		return ob_get_clean();
	}

	private static function render_visa_pricing() {
		$pricing = VY_Config::get( 'visa' )['pricing'];
		?>
		<div class="vy-card vy-card--price">
			<p class="vy-price">
				<span class="vy-price__label"><?php echo esc_html( $pricing['label'] ); ?>:</span>
				<span class="vy-price__amount" data-vy-visa-amount><?php echo esc_html( VY_Config::format_inr( $pricing['default'] ) ); ?></span>
			</p>
			<ul class="vy-list vy-list--small">
				<?php foreach ( $pricing['notes'] as $note ) : ?>
					<li><?php echo esc_html( $note ); ?></li>
				<?php endforeach; ?>
			</ul>
			<div class="vy-actions">
				<button type="button" class="vy-btn vy-btn--outline" data-vy-download-checklist><?php esc_html_e( 'Download Visa Document Checklist', 'vishvyatra' ); ?></button>
				<a class="vy-btn" href="#vy-enquiry"><?php esc_html_e( 'Request Special Price', 'vishvyatra' ); ?></a>
			</div>
			<p class="vy-hint" data-vy-checklist-status role="status" aria-live="polite"></p>
		</div>
		<?php
	}

	private static function render_form_mount( $key, array $prefill = array(), $context = null ) {
		$service = VY_Config::service( $key );
		$forms   = VY_Config::get( 'forms' );
		$form    = $forms[ $service['form'] ];
		$contact = VY_Config::setting( 'contact' );

		$title = $form['title'];
		$intro = $form['intro'];
		if ( $context && 'package' === $context['kind'] ) {
			$title = 'Enquire about this package';
			$intro = 'We have filled in the destination and number of days from this package - change anything you like. ' . $form['intro'];
		}
		self::$form_rendered = true;

		return sprintf(
			'<div class="vy-enquiry" id="vy-enquiry" data-vy-form="%1$s" data-vy-service="%2$s" data-vy-prefill="%6$s" data-vy-context="%7$s" tabindex="-1">'
			. '<h2 class="vy-heading">%3$s</h2><p class="vy-lead">%4$s</p>'
			. '<div class="vy-enquiry__body"><noscript><p>%5$s</p></noscript></div></div>',
			esc_attr( $service['form'] ),
			esc_attr( $key ),
			esc_html( $title ),
			esc_html( $intro ),
			esc_html( sprintf( 'Please enable JavaScript to use this form, or call us on %s / email %s.', $contact['phone_display'], $contact['email'] ) ),
			esc_attr( wp_json_encode( (object) $prefill ) ),
			esc_attr( $context ? wp_json_encode( $context ) : '' )
		);
	}

	/**
	 * Enquiry section for package posts and other non-service pages: the
	 * matching form, prefilled from the page (see VY_Context).
	 */
	public static function render_context_block( array $context ) {
		return '<section class="vy-section vy-service vy-context" data-vy-service-block="' . esc_attr( $context['service'] ) . '"><div class="vy-container">'
			. self::render_form_mount( $context['service'], $context['prefill'], $context['context'] )
			. '</div></section>';
	}
}
