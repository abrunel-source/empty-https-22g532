<?php
/**
 * Settings screen: generate / rotate / revoke the token, toggle the bridge,
 * configure safety controls, and review the audit log.
 *
 * @package claude-admin-bridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CAB_Admin_Page {

	const MENU_SLUG    = 'claude-admin-bridge';
	const NONCE_ACTION = 'cab_save';
	const SHOWONCE_KEY = 'cab_token_showonce_';

	/**
	 * Hook up menu + form handler.
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_post_cab_save', array( $this, 'handle_post' ) );
	}

	/**
	 * Add the settings page under Settings.
	 */
	public function add_menu() {
		add_options_page(
			__( 'Claude Admin Bridge', 'claude-admin-bridge' ),
			__( 'Claude Bridge', 'claude-admin-bridge' ),
			'manage_options',
			self::MENU_SLUG,
			array( $this, 'render' )
		);
	}

	/**
	 * Handle all form submissions (settings + token actions).
	 */
	public function handle_post() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Insufficient permissions.', 'claude-admin-bridge' ) );
		}
		check_admin_referer( self::NONCE_ACTION );

		$settings = CAB_Auth::settings();
		$action   = isset( $_POST['cab_action'] ) ? sanitize_text_field( wp_unslash( $_POST['cab_action'] ) ) : 'save';

		// Always persist the editable settings fields.
		$settings['enabled']       = ! empty( $_POST['enabled'] );
		$settings['require_https'] = ! empty( $_POST['require_https'] );
		$settings['owner_email']   = isset( $_POST['owner_email'] ) ? sanitize_email( wp_unslash( $_POST['owner_email'] ) ) : $settings['owner_email'];
		$settings['allowed_ips']   = isset( $_POST['allowed_ips'] ) ? sanitize_text_field( wp_unslash( $_POST['allowed_ips'] ) ) : '';
		$settings['rate_limit']    = isset( $_POST['rate_limit'] ) ? max( 0, (int) $_POST['rate_limit'] ) : 120;

		CAB_Auth::save( $settings );

		$redirect = add_query_arg(
			array( 'page' => self::MENU_SLUG ),
			admin_url( 'options-general.php' )
		);

		if ( 'generate' === $action ) {
			$token = CAB_Auth::generate_token( get_current_user_id() );
			// Stash the plaintext in a one-time transient so we can show it once.
			set_transient( self::SHOWONCE_KEY . get_current_user_id(), $token, 60 );
			$redirect = add_query_arg( 'cab_notice', 'generated', $redirect );
		} elseif ( 'revoke' === $action ) {
			CAB_Auth::revoke_token();
			$redirect = add_query_arg( 'cab_notice', 'revoked', $redirect );
		} else {
			$redirect = add_query_arg( 'cab_notice', 'saved', $redirect );
		}

		wp_safe_redirect( $redirect );
		exit;
	}

	/**
	 * Render the page.
	 */
	public function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$settings  = CAB_Auth::settings();
		$has_token = ! empty( $settings['token_hash'] );
		$notice    = isset( $_GET['cab_notice'] ) ? sanitize_text_field( wp_unslash( $_GET['cab_notice'] ) ) : '';

		$one_time = get_transient( self::SHOWONCE_KEY . get_current_user_id() );
		if ( $one_time ) {
			delete_transient( self::SHOWONCE_KEY . get_current_user_id() );
		}

		$endpoint = rest_url( CAB_REST_NAMESPACE . '/status' );
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Claude Admin Bridge', 'claude-admin-bridge' ); ?></h1>

			<?php if ( 'generated' === $notice ) : ?>
				<div class="notice notice-success"><p><?php esc_html_e( 'A new token was generated. Copy it now — it is shown only once.', 'claude-admin-bridge' ); ?></p></div>
			<?php elseif ( 'revoked' === $notice ) : ?>
				<div class="notice notice-warning"><p><?php esc_html_e( 'Token revoked. Claude can no longer access this site until you generate a new one.', 'claude-admin-bridge' ); ?></p></div>
			<?php elseif ( 'saved' === $notice ) : ?>
				<div class="notice notice-success"><p><?php esc_html_e( 'Settings saved.', 'claude-admin-bridge' ); ?></p></div>
			<?php endif; ?>

			<div class="notice notice-info inline">
				<p>
					<strong><?php esc_html_e( 'Security:', 'claude-admin-bridge' ); ?></strong>
					<?php esc_html_e( 'The token below grants full administrator control of this site over the REST API. Keep the bridge disabled when you are not actively using it, and revoke the token when finished.', 'claude-admin-bridge' ); ?>
				</p>
			</div>

			<?php if ( $one_time ) : ?>
				<div class="notice notice-success">
					<p><strong><?php esc_html_e( 'Your new token (copy it now):', 'claude-admin-bridge' ); ?></strong></p>
					<p><code style="font-size:14px;user-select:all;word-break:break-all;"><?php echo esc_html( $one_time ); ?></code></p>
					<p><?php esc_html_e( 'Paste this into the Claude MCP connector as the WP_BRIDGE_TOKEN. It will not be shown again.', 'claude-admin-bridge' ); ?></p>
				</div>
			<?php endif; ?>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="cab_save" />
				<?php wp_nonce_field( self::NONCE_ACTION ); ?>

				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Bridge enabled', 'claude-admin-bridge' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="enabled" value="1" <?php checked( $settings['enabled'] ); ?> />
								<?php esc_html_e( 'Allow Claude to access this site right now', 'claude-admin-bridge' ); ?>
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="cab_owner_email"><?php esc_html_e( 'Owner email', 'claude-admin-bridge' ); ?></label></th>
						<td>
							<input type="email" id="cab_owner_email" name="owner_email" class="regular-text" value="<?php echo esc_attr( $settings['owner_email'] ); ?>" />
							<p class="description"><?php esc_html_e( 'A label identifying who owns this connection. Not used as a credential.', 'claude-admin-bridge' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Require HTTPS', 'claude-admin-bridge' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="require_https" value="1" <?php checked( $settings['require_https'] ); ?> />
								<?php esc_html_e( 'Reject bridge requests that are not over HTTPS (strongly recommended)', 'claude-admin-bridge' ); ?>
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="cab_allowed_ips"><?php esc_html_e( 'IP allowlist', 'claude-admin-bridge' ); ?></label></th>
						<td>
							<input type="text" id="cab_allowed_ips" name="allowed_ips" class="regular-text" value="<?php echo esc_attr( $settings['allowed_ips'] ); ?>" placeholder="e.g. 203.0.113.5, 198.51.100.10" />
							<p class="description"><?php esc_html_e( 'Optional, comma-separated. Leave empty to allow any IP.', 'claude-admin-bridge' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="cab_rate_limit"><?php esc_html_e( 'Rate limit', 'claude-admin-bridge' ); ?></label></th>
						<td>
							<input type="number" id="cab_rate_limit" name="rate_limit" min="0" value="<?php echo esc_attr( (string) $settings['rate_limit'] ); ?>" />
							<p class="description"><?php esc_html_e( 'Maximum bridge requests per minute (0 disables the limit).', 'claude-admin-bridge' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Token status', 'claude-admin-bridge' ); ?></th>
						<td>
							<?php if ( $has_token ) : ?>
								<p>
									<?php
									printf(
										/* translators: 1: token prefix, 2: date */
										esc_html__( 'Active token %1$s… created %2$s', 'claude-admin-bridge' ),
										'<code>' . esc_html( $settings['token_prefix'] ) . '</code>',
										esc_html( $settings['token_created'] ? gmdate( 'Y-m-d H:i', (int) $settings['token_created'] ) . ' UTC' : '—' )
									);
									?>
								</p>
							<?php else : ?>
								<p><em><?php esc_html_e( 'No token yet. Generate one to connect Claude.', 'claude-admin-bridge' ); ?></em></p>
							<?php endif; ?>
						</td>
					</tr>
				</table>

				<p class="submit">
					<button type="submit" name="cab_action" value="save" class="button button-primary"><?php esc_html_e( 'Save settings', 'claude-admin-bridge' ); ?></button>
					<button type="submit" name="cab_action" value="generate" class="button"><?php echo $has_token ? esc_html__( 'Rotate token', 'claude-admin-bridge' ) : esc_html__( 'Generate token', 'claude-admin-bridge' ); ?></button>
					<?php if ( $has_token ) : ?>
						<button type="submit" name="cab_action" value="revoke" class="button button-link-delete" onclick="return confirm('<?php echo esc_js( __( 'Revoke the token? Claude will lose access immediately.', 'claude-admin-bridge' ) ); ?>');"><?php esc_html_e( 'Revoke token', 'claude-admin-bridge' ); ?></button>
					<?php endif; ?>
				</p>
			</form>

			<h2><?php esc_html_e( 'Connection details', 'claude-admin-bridge' ); ?></h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Base REST URL', 'claude-admin-bridge' ); ?></th>
					<td><code><?php echo esc_html( rest_url() ); ?></code></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Status endpoint', 'claude-admin-bridge' ); ?></th>
					<td><code><?php echo esc_html( $endpoint ); ?></code></td>
				</tr>
			</table>
			<p class="description">
				<?php esc_html_e( 'Set WP_BRIDGE_URL to the Base REST URL and WP_BRIDGE_TOKEN to your token in the Claude MCP connector.', 'claude-admin-bridge' ); ?>
			</p>

			<h2><?php esc_html_e( 'Recent activity', 'claude-admin-bridge' ); ?></h2>
			<?php $entries = CAB_Audit_Log::recent( 50 ); ?>
			<table class="widefat striped">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Time', 'claude-admin-bridge' ); ?></th>
						<th><?php esc_html_e( 'IP', 'claude-admin-bridge' ); ?></th>
						<th><?php esc_html_e( 'Method', 'claude-admin-bridge' ); ?></th>
						<th><?php esc_html_e( 'Route', 'claude-admin-bridge' ); ?></th>
						<th><?php esc_html_e( 'Status', 'claude-admin-bridge' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php if ( empty( $entries ) ) : ?>
						<tr><td colspan="5"><em><?php esc_html_e( 'No activity recorded yet.', 'claude-admin-bridge' ); ?></em></td></tr>
					<?php else : ?>
						<?php foreach ( $entries as $row ) : ?>
							<tr>
								<td><?php echo esc_html( $row['created_at'] ); ?></td>
								<td><?php echo esc_html( $row['ip'] ); ?></td>
								<td><?php echo esc_html( $row['method'] ); ?></td>
								<td><code><?php echo esc_html( $row['route'] ); ?></code></td>
								<td><?php echo esc_html( $row['status'] ); ?></td>
							</tr>
						<?php endforeach; ?>
					<?php endif; ?>
				</tbody>
			</table>
		</div>
		<?php
	}
}
