# webext-domain-permission-toggle [![Travis build status](https://api.travis-ci.org/fregante/webext-domain-permission-toggle.svg?branch=master)](https://travis-ci.org/fregante/webext-domain-permission-toggle) [![npm version](https://img.shields.io/npm/v/webext-domain-permission-toggle.svg)](https://www.npmjs.com/package/webext-domain-permission-toggle)

<img width="331" alt="Context menu" src="https://user-images.githubusercontent.com/1402241/32874388-e0c64150-cacc-11e7-9a50-eae3727fd3c2.png" align="right">

> WebExtension module: Browser-action context menu to request permission for the current tab.

Works great when paired with [webext-dynamic-content-scripts](https://github.com/fregante/webext-dynamic-content-scripts/blob/master/how-to-add-github-enterprise-support-to-web-extensions.md) if you want to also inject content scripts on the new domains.

## Install

You can just download the [standalone bundle](https://packd.fregante.now.sh/webext-domain-permission-toggle@latest?name=addDomainPermissionToggle) (it might take a minute to download) and include the file in your `manifest.json`, or:

```sh
npm install webext-domain-permission-toggle
```

```js
import addDomainPermissionToggle from 'webext-domain-permission-toggle';
```

## Usage

```js
// In background.js
addDomainPermissionToggle();
```

### manifest.json

```js
{
	"browser_action": { /* Firefox support */
		"default_icon": "icon.png"
	},
	"permissions": [
		"contextMenus",
		"activeTab"
	],
	"optional_permissions": [
		"http://*/*",
		"https://*/*"
	],
	"background": {
		"scripts": [
			"webext-domain-permission-toggle.js",
			"background.js"
		]
	}
}
```

## API

### addDomainPermissionToggle([options])

<img width="331" alt="Context menu" src="https://user-images.githubusercontent.com/1402241/32874388-e0c64150-cacc-11e7-9a50-eae3727fd3c2.png" align="right">

Adds an item to the browser action icon's context menu (as shown in the screenshot).

The user can access this menu by right clicking the icon. If your extension doesn't have any action or popup assigned to the icon, it will also appear with a left click.

#### options

##### title

Type: `string`

Default: `'Enable ${extensionName} on this domain'`

The title of the action in the context menu.

##### reloadOnSuccess

<img align="right" alt="Reload confirmation message" width="332" src="https://user-images.githubusercontent.com/1402241/32890310-2e503192-cb09-11e7-863c-a96df2bf838c.png">

Type: `boolean` `string`

Default: `Do you want to reload this page to apply ${extensionName}?`

If the user accepts the new permission, they will be asked to reload the current tab. Set a `string` to customize the message and `false` to avoid the reload and its request.

## Related

### Permissions

- [webext-dynamic-content-scripts](https://github.com/fregante/webext-dynamic-content-scripts) - Automatically registers your content_scripts on domains added via permission.request
- [webext-additional-permissions](https://github.com/fregante/webext-additional-permissions) - Get any optional permissions that users have granted you.

### Others

- [webext-options-sync](https://github.com/fregante/webext-options-sync) - Helps you manage and autosave your extension's options. Chrome and Firefox.
- [webext-storage-cache](https://github.com/fregante/webext-storage-cache) - Map-like promised cache storage with expiration. Chrome and Firefox
- [webext-detect-page](https://github.com/fregante/webext-detect-page) - Detects where the current browser extension code is being run. Chrome and Firefox.
- [webext-content-script-ping](https://github.com/fregante/webext-content-script-ping) - One-file interface to detect whether your content script have loaded.
- [web-ext-submit](https://github.com/fregante/web-ext-submit) - Wrapper around Mozilla’s web-ext to submit extensions to AMO.
- [Awesome-WebExtensions](https://github.com/fregante/Awesome-WebExtensions) - A curated list of awesome resources for WebExtensions development.

## License

MIT © [Federico Brigante](https://bfred.it)
