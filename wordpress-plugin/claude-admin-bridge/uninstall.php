<?php
/**
 * Uninstall cleanup: remove settings and the audit-log table.
 *
 * @package claude-admin-bridge
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'cab_settings' );

global $wpdb;
$table = $wpdb->prefix . 'cab_audit_log';
// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
$wpdb->query( "DROP TABLE IF EXISTS {$table}" );
