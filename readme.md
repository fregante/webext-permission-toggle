# webext-domain-permission-toggle [![Travis build status](https://api.travis-ci.org/bfred-it/webext-domain-permission-toggle.svg?branch=master)](https://travis-ci.org/bfred-it/webext-domain-permission-toggle) [![npm version](https://img.shields.io/npm/v/webext-domain-permission-toggle.svg)](https://www.npmjs.com/package/webext-domain-permission-toggle)

> WebExtension module: Browser-action context menu to request permission for the current tab.

## Install

```sh
npm install webext-domain-permission-toggle
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

### webpack, rollup, browserify

```js
// background.js
import DPT from 'webext-domain-permission-toggle';
```

## Usage

```js
DPT.addContextMenu();
```

## API

### DPT.addContextMenu([options])

<img width="331" alt="Context menu" src="https://user-images.githubusercontent.com/1402241/32874388-e0c64150-cacc-11e7-9a50-eae3727fd3c2.png" align="right">

Adds an item to the browser action icon's context menu (as shown in the screenshot).

The user can access this meny by right clicking the icon. If your extension doesn't have any action or popup assigned to the icon, it will also appear with a left click.

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

* [`webext-dynamic-content-scripts`](https://github.com/bfred-it/webext-dynamic-content-scripts): Automatically inject your `content_scripts` on custom domains.
* [`webext-content-script-ping`](https://github.com/bfred-it/webext-content-script-ping): One-file interface to detect whether your content scripts have loaded.
* [`webext-options-sync`](https://github.com/bfred-it/webext-options-sync): Helps you manage and autosave your extension's options.
* [`webext-inject-on-install`](https://github.com/bfred-it/webext-inject-on-install): Automatically add content scripts to existing tabs when your extension is installed.
* [`Awesome WebExtensions`](https://github.com/bfred-it/Awesome-WebExtensions): A curated list of awesome resources for Web Extensions development.

## License

MIT © Federico Brigante — [Twitter](http://twitter.com/bfred_it)
