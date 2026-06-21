<?php
/**
 * Plugin Name:       Claude Admin Bridge
 * Plugin URI:        https://example.com/claude-admin-bridge
 * Description:       Securely grant Claude (via an MCP connector) admin-level access to this WordPress site through a hashed, revocable API token. Personal use only.
 * Version:           1.0.0
 * Requires at least: 5.6
 * Requires PHP:      7.4
 * Author:            Brunel Studios
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       claude-admin-bridge
 *
 * SECURITY NOTICE
 * ---------------
 * This plugin lets a holder of the generated token act as a full administrator
 * of this site over the REST API. Treat the token like a root password:
 *   - Only enable it while you actively need Claude to work on the site.
 *   - Always serve the site over HTTPS.
 *   - Rotate or revoke the token the moment you are done.
 * The token is the credential. Your email is only an owner label.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

define( 'CAB_VERSION', '1.0.0' );
define( 'CAB_PLUGIN_FILE', __FILE__ );
define( 'CAB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'CAB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'CAB_REST_NAMESPACE', 'claude-bridge/v1' );
define( 'CAB_OPTION_KEY', 'cab_settings' );

require_once CAB_PLUGIN_DIR . 'includes/class-cab-audit-log.php';
require_once CAB_PLUGIN_DIR . 'includes/class-cab-auth.php';
require_once CAB_PLUGIN_DIR . 'includes/class-cab-rest-controller.php';
require_once CAB_PLUGIN_DIR . 'includes/class-cab-admin-page.php';

/**
 * Activation: create the audit-log table and seed default settings.
 */
function cab_activate() {
	CAB_Audit_Log::install_table();

	if ( false === get_option( CAB_OPTION_KEY ) ) {
		add_option(
			CAB_OPTION_KEY,
			array(
				'enabled'      => false,
				'owner_email'  => get_option( 'admin_email' ),
				'token_hash'   => '',
				'token_prefix' => '',
				'token_created'=> 0,
				'user_id'      => 0,
				'require_https'=> true,
				'allowed_ips'  => '',
				'rate_limit'   => 120, // requests per minute
			)
		);
	}
}
register_activation_hook( __FILE__, 'cab_activate' );

/**
 * Boot the plugin once WordPress is loaded.
 */
function cab_bootstrap() {
	// Authentication layer: lets the Bearer token act as the chosen admin user
	// across BOTH the core WordPress REST API and this plugin's endpoints.
	CAB_Auth::init();

	// Custom admin-power endpoints (plugins, themes, options, site health, log).
	$controller = new CAB_REST_Controller();
	add_action( 'rest_api_init', array( $controller, 'register_routes' ) );

	// Settings + token management UI.
	if ( is_admin() ) {
		$admin = new CAB_Admin_Page();
		$admin->init();
	}
}
add_action( 'plugins_loaded', 'cab_bootstrap' );
