<?php
/**
 * Custom REST endpoints that expose admin powers not covered by the core
 * WordPress REST API: status, plugins, themes, options and site health.
 *
 * Everything else (posts, pages, media, users, comments, taxonomies, settings)
 * is already available via /wp-json/wp/v2/* once the Bearer token authenticates
 * the request as an administrator.
 *
 * @package claude-admin-bridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CAB_REST_Controller {

	/**
	 * Register all routes.
	 */
	public function register_routes() {
		$perm = array( $this, 'permission_check' );

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'status' ),
				'permission_callback' => $perm,
			)
		);

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/plugins',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_plugins' ),
				'permission_callback' => $perm,
			)
		);

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/plugins/(?P<action>activate|deactivate)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'toggle_plugin' ),
				'permission_callback' => $perm,
				'args'                => array(
					'plugin' => array(
						'required'    => true,
						'type'        => 'string',
						'description' => 'Plugin file path, e.g. "akismet/akismet.php".',
					),
				),
			)
		);

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/themes',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_themes' ),
				'permission_callback' => $perm,
			)
		);

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/themes/activate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'activate_theme' ),
				'permission_callback' => $perm,
				'args'                => array(
					'stylesheet' => array(
						'required' => true,
						'type'     => 'string',
					),
				),
			)
		);

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/options/(?P<name>[A-Za-z0-9_\-]+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_option_value' ),
					'permission_callback' => $perm,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'set_option_value' ),
					'permission_callback' => $perm,
					'args'                => array(
						'value' => array( 'required' => true ),
					),
				),
			)
		);

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/site-health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'site_health' ),
				'permission_callback' => $perm,
			)
		);

		register_rest_route(
			CAB_REST_NAMESPACE,
			'/audit-log',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'audit_log' ),
				'permission_callback' => $perm,
			)
		);
	}

	/**
	 * Every endpoint requires the caller to be an administrator. Because the
	 * bridge token maps to an admin user, this also confirms the token path.
	 *
	 * @return bool|WP_Error
	 */
	public function permission_check() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'cab_forbidden',
				__( 'Administrator capabilities are required.', 'claude-admin-bridge' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * Sensitive options that must never be read or written through the bridge.
	 *
	 * @return string[]
	 */
	protected function blocked_options() {
		return array(
			'auth_key',
			'auth_salt',
			'logged_in_key',
			'logged_in_salt',
			'nonce_key',
			'nonce_salt',
			'secret',
			CAB_OPTION_KEY, // Never let the bridge rewrite its own credentials.
		);
	}

	/**
	 * GET /status — identity + a quick health summary.
	 *
	 * @return WP_REST_Response
	 */
	public function status() {
		$user = wp_get_current_user();

		return rest_ensure_response(
			array(
				'ok'            => true,
				'site_name'     => get_bloginfo( 'name' ),
				'site_url'      => home_url(),
				'wp_version'    => get_bloginfo( 'version' ),
				'php_version'   => PHP_VERSION,
				'bridge_version'=> CAB_VERSION,
				'acting_as'     => array(
					'id'    => $user->ID,
					'login' => $user->user_login,
					'email' => $user->user_email,
					'roles' => $user->roles,
				),
				'is_multisite'  => is_multisite(),
				'rest_base'     => rest_url(),
			)
		);
	}

	/**
	 * GET /plugins — list installed plugins and their state.
	 *
	 * @return WP_REST_Response
	 */
	public function list_plugins() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$all  = get_plugins();
		$list = array();
		foreach ( $all as $file => $data ) {
			$list[] = array(
				'plugin'  => $file,
				'name'    => $data['Name'],
				'version' => $data['Version'],
				'active'  => is_plugin_active( $file ),
			);
		}
		return rest_ensure_response( array( 'plugins' => $list ) );
	}

	/**
	 * POST /plugins/activate|deactivate.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function toggle_plugin( WP_REST_Request $request ) {
		if ( ! function_exists( 'activate_plugin' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$action = $request['action'];
		$plugin = (string) $request->get_param( 'plugin' );

		$installed = array_keys( get_plugins() );
		if ( ! in_array( $plugin, $installed, true ) ) {
			return new WP_Error( 'cab_unknown_plugin', __( 'Plugin not found.', 'claude-admin-bridge' ), array( 'status' => 404 ) );
		}

		if ( 'activate' === $action ) {
			$result = activate_plugin( $plugin );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		} else {
			deactivate_plugins( array( $plugin ) );
		}

		return rest_ensure_response(
			array(
				'plugin' => $plugin,
				'active' => is_plugin_active( $plugin ),
			)
		);
	}

	/**
	 * GET /themes — list installed themes.
	 *
	 * @return WP_REST_Response
	 */
	public function list_themes() {
		$themes  = wp_get_themes();
		$current = get_stylesheet();
		$list    = array();
		foreach ( $themes as $stylesheet => $theme ) {
			$list[] = array(
				'stylesheet' => $stylesheet,
				'name'       => $theme->get( 'Name' ),
				'version'    => $theme->get( 'Version' ),
				'active'     => ( $stylesheet === $current ),
			);
		}
		return rest_ensure_response( array( 'themes' => $list ) );
	}

	/**
	 * POST /themes/activate.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function activate_theme( WP_REST_Request $request ) {
		$stylesheet = (string) $request->get_param( 'stylesheet' );
		$theme      = wp_get_theme( $stylesheet );
		if ( ! $theme->exists() ) {
			return new WP_Error( 'cab_unknown_theme', __( 'Theme not found.', 'claude-admin-bridge' ), array( 'status' => 404 ) );
		}
		switch_theme( $stylesheet );
		return rest_ensure_response( array( 'active_theme' => get_stylesheet() ) );
	}

	/**
	 * GET /options/{name}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_option_value( WP_REST_Request $request ) {
		$name = (string) $request['name'];
		if ( in_array( $name, $this->blocked_options(), true ) ) {
			return new WP_Error( 'cab_blocked_option', __( 'This option is protected.', 'claude-admin-bridge' ), array( 'status' => 403 ) );
		}
		return rest_ensure_response(
			array(
				'name'  => $name,
				'value' => get_option( $name, null ),
			)
		);
	}

	/**
	 * POST /options/{name}.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function set_option_value( WP_REST_Request $request ) {
		$name = (string) $request['name'];
		if ( in_array( $name, $this->blocked_options(), true ) ) {
			return new WP_Error( 'cab_blocked_option', __( 'This option is protected.', 'claude-admin-bridge' ), array( 'status' => 403 ) );
		}
		$value = $request->get_param( 'value' );
		update_option( $name, $value );
		return rest_ensure_response(
			array(
				'name'  => $name,
				'value' => get_option( $name, null ),
				'saved' => true,
			)
		);
	}

	/**
	 * GET /site-health — lightweight environment snapshot.
	 *
	 * @return WP_REST_Response
	 */
	public function site_health() {
		global $wpdb;
		return rest_ensure_response(
			array(
				'wp_version'     => get_bloginfo( 'version' ),
				'php_version'    => PHP_VERSION,
				'mysql_version'  => $wpdb->db_version(),
				'https'          => is_ssl(),
				'debug'          => ( defined( 'WP_DEBUG' ) && WP_DEBUG ),
				'memory_limit'   => WP_MEMORY_LIMIT,
				'active_plugins' => count( (array) get_option( 'active_plugins', array() ) ),
				'theme'          => get_stylesheet(),
				'language'       => get_locale(),
				'timezone'       => wp_timezone_string(),
			)
		);
	}

	/**
	 * GET /audit-log — recent bridge activity.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function audit_log( WP_REST_Request $request ) {
		$limit = (int) ( $request->get_param( 'limit' ) ? $request->get_param( 'limit' ) : 100 );
		return rest_ensure_response( array( 'entries' => CAB_Audit_Log::recent( $limit ) ) );
	}
}
