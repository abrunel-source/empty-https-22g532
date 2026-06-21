<?php
/**
 * Audit log: records every authenticated request made through the bridge.
 *
 * @package claude-admin-bridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CAB_Audit_Log {

	/**
	 * Return the fully-qualified audit-log table name.
	 *
	 * @return string
	 */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'cab_audit_log';
	}

	/**
	 * Create the audit-log table on activation.
	 */
	public static function install_table() {
		global $wpdb;
		$table           = self::table();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			created_at DATETIME NOT NULL,
			user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			ip VARCHAR(64) NOT NULL DEFAULT '',
			method VARCHAR(10) NOT NULL DEFAULT '',
			route VARCHAR(255) NOT NULL DEFAULT '',
			status INT(5) NOT NULL DEFAULT 0,
			note VARCHAR(255) NOT NULL DEFAULT '',
			PRIMARY KEY  (id),
			KEY created_at (created_at)
		) {$charset_collate};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	/**
	 * Insert one audit row.
	 *
	 * @param array $data Row fields.
	 */
	public static function record( $data ) {
		global $wpdb;

		$wpdb->insert(
			self::table(),
			array(
				'created_at' => current_time( 'mysql' ),
				'user_id'    => isset( $data['user_id'] ) ? (int) $data['user_id'] : 0,
				'ip'         => isset( $data['ip'] ) ? substr( (string) $data['ip'], 0, 64 ) : '',
				'method'     => isset( $data['method'] ) ? substr( (string) $data['method'], 0, 10 ) : '',
				'route'      => isset( $data['route'] ) ? substr( (string) $data['route'], 0, 255 ) : '',
				'status'     => isset( $data['status'] ) ? (int) $data['status'] : 0,
				'note'       => isset( $data['note'] ) ? substr( (string) $data['note'], 0, 255 ) : '',
			),
			array( '%s', '%d', '%s', '%s', '%s', '%d', '%s' )
		);

		self::prune();
	}

	/**
	 * Keep the table bounded: retain the most recent 1000 rows.
	 */
	protected static function prune() {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$threshold = $wpdb->get_var( "SELECT id FROM {$table} ORDER BY id DESC LIMIT 1 OFFSET 1000" );
		if ( $threshold ) {
			$wpdb->query( $wpdb->prepare( "DELETE FROM {$table} WHERE id < %d", $threshold ) );
		}
	}

	/**
	 * Fetch the most recent rows for display.
	 *
	 * @param int $limit Number of rows.
	 * @return array
	 */
	public static function recent( $limit = 100 ) {
		global $wpdb;
		$table = self::table();
		$limit = max( 1, min( 1000, (int) $limit ) );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} ORDER BY id DESC LIMIT %d", $limit ), ARRAY_A );
	}
}
