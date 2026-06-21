<?php
/**
 * Authentication layer.
 *
 * Validates the Bearer token, maps it to the configured administrator, and
 * enforces the safety controls (master switch, HTTPS, IP allowlist, rate limit).
 * Because it hooks `determine_current_user`, a valid token authenticates the
 * caller for BOTH the core WordPress REST API and this plugin's endpoints.
 *
 * @package claude-admin-bridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CAB_Auth {

	/**
	 * The user id resolved from a valid token for the current request, or 0.
	 *
	 * @var int
	 */
	protected static $token_user_id = 0;

	/**
	 * Reason the request should be rejected even though the token is valid
	 * (e.g. disabled, https_required, ip_blocked, rate_limited). Empty if OK.
	 *
	 * @var string
	 */
	protected static $reject_reason = '';

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_filter( 'determine_current_user', array( __CLASS__, 'determine_current_user' ), 20 );
		add_filter( 'rest_authentication_errors', array( __CLASS__, 'enforce_controls' ), 20 );
		add_filter( 'rest_post_dispatch', array( __CLASS__, 'log_request' ), 10, 3 );
	}

	/**
	 * Read settings with defaults.
	 *
	 * @return array
	 */
	public static function settings() {
		$defaults = array(
			'enabled'       => false,
			'owner_email'   => '',
			'token_hash'    => '',
			'token_prefix'  => '',
			'token_created' => 0,
			'user_id'       => 0,
			'require_https' => true,
			'allowed_ips'   => '',
			'rate_limit'    => 120,
		);
		$saved = get_option( CAB_OPTION_KEY, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), $defaults );
	}

	/**
	 * Persist settings.
	 *
	 * @param array $settings Full settings array.
	 */
	public static function save( $settings ) {
		update_option( CAB_OPTION_KEY, $settings );
	}

	/**
	 * Generate a fresh token, store only its hash, and return the plaintext once.
	 *
	 * @param int $user_id Administrator the token will act as.
	 * @return string Plaintext token (show once, never recoverable).
	 */
	public static function generate_token( $user_id ) {
		$secret = bin2hex( random_bytes( 32 ) ); // 64 hex chars.
		$token  = 'cab_' . $secret;

		$settings                  = self::settings();
		$settings['token_hash']    = hash( 'sha256', $token );
		$settings['token_prefix']  = substr( $token, 0, 12 );
		$settings['token_created'] = time();
		$settings['user_id']       = (int) $user_id;
		self::save( $settings );

		return $token;
	}

	/**
	 * Revoke the active token.
	 */
	public static function revoke_token() {
		$settings                  = self::settings();
		$settings['token_hash']    = '';
		$settings['token_prefix']  = '';
		$settings['token_created'] = 0;
		self::save( $settings );
	}

	/**
	 * Extract the presented token from request headers.
	 *
	 * Accepts `Authorization: Bearer <token>` or the fallback `X-CAB-Token`
	 * header (useful when a host strips Authorization).
	 *
	 * @return string
	 */
	protected static function presented_token() {
		$header = '';

		if ( isset( $_SERVER['HTTP_AUTHORIZATION'] ) ) {
			$header = trim( wp_unslash( $_SERVER['HTTP_AUTHORIZATION'] ) );
		} elseif ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
			$header = trim( wp_unslash( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) );
		} elseif ( function_exists( 'getallheaders' ) ) {
			$all = getallheaders();
			foreach ( (array) $all as $k => $v ) {
				if ( 0 === strcasecmp( $k, 'Authorization' ) ) {
					$header = trim( $v );
					break;
				}
			}
		}

		if ( $header && 0 === stripos( $header, 'Bearer ' ) ) {
			return trim( substr( $header, 7 ) );
		}

		if ( isset( $_SERVER['HTTP_X_CAB_TOKEN'] ) ) {
			return trim( wp_unslash( $_SERVER['HTTP_X_CAB_TOKEN'] ) );
		}

		return '';
	}

	/**
	 * Resolve the current user from a valid Bearer token.
	 *
	 * Runs early; only does cheap work. The heavy enforcement (https, ip, rate)
	 * happens in enforce_controls() so we can return a proper REST error.
	 *
	 * @param int|bool $user_id Existing resolution.
	 * @return int|bool
	 */
	public static function determine_current_user( $user_id ) {
		// Respect any authentication another method already established.
		if ( ! empty( $user_id ) ) {
			return $user_id;
		}

		$token = self::presented_token();
		if ( '' === $token || 0 !== strpos( $token, 'cab_' ) ) {
			return $user_id;
		}

		$settings = self::settings();
		if ( empty( $settings['token_hash'] ) || empty( $settings['user_id'] ) ) {
			return $user_id;
		}

		$presented_hash = hash( 'sha256', $token );
		if ( ! hash_equals( $settings['token_hash'], $presented_hash ) ) {
			self::$reject_reason = 'invalid_token';
			return $user_id;
		}

		// Token is cryptographically valid. Decide whether controls allow it.
		self::$reject_reason = self::evaluate_controls( $settings );
		if ( '' !== self::$reject_reason ) {
			return $user_id; // Leave unauthenticated; enforce_controls() returns 4xx.
		}

		self::$token_user_id = (int) $settings['user_id'];
		return self::$token_user_id;
	}

	/**
	 * Check master switch, HTTPS, IP allowlist and rate limit.
	 *
	 * @param array $settings Settings.
	 * @return string Empty when allowed, otherwise a reason code.
	 */
	protected static function evaluate_controls( $settings ) {
		if ( empty( $settings['enabled'] ) ) {
			return 'disabled';
		}

		if ( ! empty( $settings['require_https'] ) && ! is_ssl() ) {
			return 'https_required';
		}

		$allowed = array_filter( array_map( 'trim', explode( ',', (string) $settings['allowed_ips'] ) ) );
		if ( ! empty( $allowed ) ) {
			$ip = self::client_ip();
			if ( ! in_array( $ip, $allowed, true ) ) {
				return 'ip_blocked';
			}
		}

		$limit = (int) $settings['rate_limit'];
		if ( $limit > 0 ) {
			$key   = 'cab_rl_' . md5( $settings['token_prefix'] . gmdate( 'YmdHi' ) );
			$count = (int) get_transient( $key );
			if ( $count >= $limit ) {
				return 'rate_limited';
			}
			set_transient( $key, $count + 1, 120 );
		}

		return '';
	}

	/**
	 * Convert a rejection reason into a REST error response.
	 *
	 * @param WP_Error|null|true $result Current auth result.
	 * @return WP_Error|null|true
	 */
	public static function enforce_controls( $result ) {
		// If another auth method already errored or succeeded, leave it alone.
		if ( ! empty( $result ) ) {
			return $result;
		}

		switch ( self::$reject_reason ) {
			case 'disabled':
				return new WP_Error( 'cab_disabled', __( 'The Claude Admin Bridge is currently disabled.', 'claude-admin-bridge' ), array( 'status' => 403 ) );
			case 'https_required':
				return new WP_Error( 'cab_https_required', __( 'HTTPS is required to use the Claude Admin Bridge.', 'claude-admin-bridge' ), array( 'status' => 403 ) );
			case 'ip_blocked':
				return new WP_Error( 'cab_ip_blocked', __( 'Your IP address is not on the allowlist.', 'claude-admin-bridge' ), array( 'status' => 403 ) );
			case 'rate_limited':
				return new WP_Error( 'cab_rate_limited', __( 'Rate limit exceeded. Try again shortly.', 'claude-admin-bridge' ), array( 'status' => 429 ) );
			case 'invalid_token':
				return new WP_Error( 'cab_invalid_token', __( 'Invalid bridge token.', 'claude-admin-bridge' ), array( 'status' => 401 ) );
		}

		return $result;
	}

	/**
	 * Whether the current request authenticated via a bridge token.
	 *
	 * @return bool
	 */
	public static function is_token_request() {
		return self::$token_user_id > 0;
	}

	/**
	 * Log every bridge-authenticated REST request after dispatch.
	 *
	 * @param WP_HTTP_Response $response Response.
	 * @param WP_REST_Server   $server   Server.
	 * @param WP_REST_Request  $request  Request.
	 * @return WP_HTTP_Response
	 */
	public static function log_request( $response, $server, $request ) {
		if ( ! self::is_token_request() ) {
			return $response;
		}

		$status = $response instanceof WP_REST_Response ? $response->get_status() : 200;

		CAB_Audit_Log::record(
			array(
				'user_id' => self::$token_user_id,
				'ip'      => self::client_ip(),
				'method'  => $request->get_method(),
				'route'   => $request->get_route(),
				'status'  => $status,
				'note'    => '',
			)
		);

		return $response;
	}

	/**
	 * Best-effort client IP.
	 *
	 * @return string
	 */
	public static function client_ip() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) wp_unslash( $_SERVER['REMOTE_ADDR'] ) : '';
		return sanitize_text_field( $ip );
	}
}
