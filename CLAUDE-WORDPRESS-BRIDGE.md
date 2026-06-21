# Claude WordPress Bridge

Give Claude administrator-level access to your own WordPress site(s) — securely,
on your terms, and revocable in one click.

This project has **two parts**:

| Part | Lives | Purpose |
|------|-------|---------|
| `wordpress-plugin/claude-admin-bridge/` | On each WordPress site | Exposes admin powers over an authenticated REST API and manages the token. |
| `mcp-server/` | On your machine / wherever you run Claude | The connector Claude uses to call your site. |

---

## First, the important reality check

You asked for Claude to have access "as long as I'm connected on Claude using my
email." That isn't technically how it can work, and it's worth being precise:

- **Your email is not a credential** your WordPress site can verify, and a Claude
  chat session cannot reach into your site on its own.
- Access is granted by a **secret token** that the plugin generates. Whoever holds
  that token can administer the site. So the token — not your email — is the key.
- Your email is stored only as an **owner label** on the connection.

That's why the setup is: install the plugin → generate a token → paste the token
into the Claude connector. You stay in control: disable the bridge or revoke the
token and access ends immediately.

> ⚠️ **Treat the token like a root password.** It grants full admin control over
> the REST API. Keep the bridge **disabled** when you're not actively using it,
> always serve the site over **HTTPS**, and **revoke** when you're done.

---

## Setup

### 1. Install the plugin (on each site)

1. Copy `wordpress-plugin/claude-admin-bridge/` into the site's
   `wp-content/plugins/` directory (or zip it and upload via **Plugins → Add New →
   Upload**).
2. Activate **Claude Admin Bridge**.
3. Open **Settings → Claude Bridge**.
4. Tick **Bridge enabled**, set your **Owner email**, leave **Require HTTPS** on.
5. Click **Generate token** and copy it immediately — it's shown only once.
6. Note the **Base REST URL** shown on the page (e.g. `https://example.com/wp-json/`).

If the plugin reports auth problems, your host may be stripping the
`Authorization` header. Add this to the site's root `.htaccess` (Apache):

```apache
RewriteEngine On
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*)$ - [E=HTTP_AUTHORIZATION:%1]
```

The plugin accepts the token via either the `Authorization: Bearer` header (what
the connector sends by default) or a fallback `X-CAB-Token` header, so the
`.htaccess` fix above resolves hosts that strip `Authorization`.

### 2. Install the connector

```bash
cd mcp-server
npm install
```

### 3. Register the connector with Claude

Add an entry to your Claude MCP configuration (e.g. Claude Desktop's
`claude_desktop_config.json`, or `.mcp.json` for Claude Code). Use **absolute
paths**.

```jsonc
{
  "mcpServers": {
    "wordpress-mysite": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.js"],
      "env": {
        "WP_BRIDGE_URL": "https://example.com/wp-json/",
        "WP_BRIDGE_TOKEN": "cab_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Restart Claude. You should see tools like `wp_status`, `wp_request`,
`wp_list_plugins`, etc. Ask Claude to "check the WordPress bridge status" to
confirm.

### Multiple sites

Run **one connector entry per site**, each with its own token. The plugin is
installed and tokenised separately on each site:

```jsonc
{
  "mcpServers": {
    "wp-blog":  { "command": "node", "args": ["/abs/mcp-server/index.js"],
                  "env": { "WP_BRIDGE_URL": "https://blog.example.com/wp-json/",  "WP_BRIDGE_TOKEN": "cab_..." } },
    "wp-store": { "command": "node", "args": ["/abs/mcp-server/index.js"],
                  "env": { "WP_BRIDGE_URL": "https://store.example.com/wp-json/", "WP_BRIDGE_TOKEN": "cab_..." } }
  }
}
```

---

## What Claude can do once connected

Through the connector's tools:

- **`wp_request`** — the workhorse. A generic authenticated call to the full
  WordPress REST API: posts, pages, media, users, comments, categories, tags,
  settings. (e.g. `GET wp/v2/posts`, `POST wp/v2/posts`, `DELETE wp/v2/users/5`.)
- **`wp_status`** / **`wp_site_health`** — connection check and environment info.
- **`wp_list_plugins`** / **`wp_toggle_plugin`** — manage plugins.
- **`wp_list_themes`** / **`wp_activate_theme`** — manage themes.
- **`wp_get_option`** / **`wp_set_option`** — read/write site options.
- **`wp_audit_log`** — review recent bridge activity.

### Deliberately **not** included

There is **no arbitrary PHP / code-execution endpoint**. Even for a personal
tool that's too dangerous (a leaked token would mean full server compromise).
"Everything an admin can do" is covered through structured, logged endpoints and
the standard REST API. If you genuinely need plugin/theme file installation from
a URL or zip, that can be added later behind an extra confirmation flag — tell me
and I'll wire it up.

---

## Safety controls (all in the plugin settings)

| Control | What it does |
|---------|--------------|
| **Bridge enabled** | Master switch. Off = no access, even with a valid token. |
| **Token (hashed)** | Stored as SHA-256; shown once; rotate or revoke anytime. |
| **Require HTTPS** | Rejects non-HTTPS bridge requests. |
| **IP allowlist** | Optional comma-separated allowed IPs. |
| **Rate limit** | Max bridge requests per minute. |
| **Audit log** | Every request logged: time, IP, method, route, status. |
| **Protected secrets** | Auth keys/salts and the bridge's own settings can't be read/written. |
| **Read-only mode** | Set `WP_BRIDGE_READONLY=true` on the connector to block all writes. |

---

## Revoking access

Any one of these cuts Claude off immediately:

1. **Settings → Claude Bridge → Revoke token**, or
2. untick **Bridge enabled**, or
3. remove the connector entry from your Claude config, or
4. deactivate/delete the plugin.
