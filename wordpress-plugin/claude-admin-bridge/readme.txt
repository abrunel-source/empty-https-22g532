=== Claude Admin Bridge ===
Contributors: brunelstudios
Tags: claude, ai, rest-api, admin, automation
Requires at least: 5.6
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Securely grant Claude admin-level access to your WordPress site through a hashed, revocable API token. Personal use.

== Description ==

Claude Admin Bridge lets you connect Claude (via an MCP connector) to your
WordPress site so it can perform administrator tasks: manage posts, pages,
media, users, comments, plugins, themes and options.

How access actually works:

* The plugin generates a secret **token**. That token is the credential —
  not your email, and not your Claude login. Anyone holding it can administer
  the site, so treat it like a root password.
* You paste the token into the Claude MCP connector (the bridge that lets
  Claude make calls to your site).
* A valid token authenticates as the administrator who generated it, for both
  the core WordPress REST API and this plugin's extra endpoints.

Safety controls built in:

* Master enable/disable switch — keep it off when you are not using it.
* Token stored only as a SHA-256 hash; shown in plaintext exactly once.
* Rotate or revoke at any time.
* HTTPS enforcement, optional IP allowlist, and per-minute rate limiting.
* Full audit log of every request (time, IP, method, route, status).
* Protected secrets (auth keys/salts) can never be read or written.

== Installation ==

1. Copy the `claude-admin-bridge` folder into `wp-content/plugins/`.
2. Activate **Claude Admin Bridge** in Plugins.
3. Go to **Settings → Claude Bridge**.
4. Tick **Bridge enabled**, then click **Generate token** and copy it.
5. Add the connector on the Claude side (see the project README) using the
   Base REST URL shown on the settings page and your token.

== Frequently Asked Questions ==

= Does my Claude email grant access on its own? =

No. There is no mechanism for a chat session to reach your site automatically.
The token is the only credential. Your email is stored solely as an owner label.

= How do I cut off access immediately? =

Click **Revoke token**, or simply untick **Bridge enabled**.

== Changelog ==

= 1.0.0 =
* Initial release.
