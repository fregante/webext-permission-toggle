# webext-domain-permission-toggle [![Travis build status](https://api.travis-ci.org/bfred-it/webext-domain-permission-toggle.svg?branch=master)](https://travis-ci.org/bfred-it/webext-domain-permission-toggle) [![npm version](https://img.shields.io/npm/v/webext-domain-permission-toggle.svg)](https://www.npmjs.com/package/webext-domain-permission-toggle) <img width="331" alt="Context menu" src="https://user-images.githubusercontent.com/1402241/32874388-e0c64150-cacc-11e7-9a50-eae3727fd3c2.png" align="right">

> WebExtension module: Browser-action context menu to request permission for the current tab.

## Install

```sh
npm install webext-dynamic-content-scripts
```

### manifest.json

```json
{
	"background": {
		"scripts": [
			"webext-dynamic-content-scripts.js",
			"background.js"
		]
	}
}
```

### webpack, rollup, browserify

```js
// background.js
import DPT from 'webext-dynamic-content-scripts';
```

## Usage

```js
DPT.addContextMenu();
```

## API

### DPT.addContextMenu([options])

Adds an item to the context menu in the extensions browser action. The user can right click on your icon and this will appear:

<img width="331" alt="Context menu" src="https://user-images.githubusercontent.com/1402241/32874388-e0c64150-cacc-11e7-9a50-eae3727fd3c2.png">

If your extension doesn't have any action or popup assigned to the icon, it will also appear with a left click.

#### options

##### title

Type: `string`

Default: `'Enable ${extensionName} on this domain'`

The title of the action in the context menu.

#####reloadOnSuccess

Type: `boolean` `string`

Default: `Do you want to reload this page to apply ${extensionName}?`

If the user accepts the new permission, they will be asked to reload the current tab. [Screenshot](https://user-images.githubusercontent.com/1402241/32887865-56237ef8-cb00-11e7-9e8f-a68754a5624a.png). Set a `string` to customize the message and `false` to avoid the reload and its request.


## Related

* [`webext-content-script-ping`](https://github.com/bfred-it/webext-content-script-ping): One-file interface to detect whether your content script have loaded.
* [`webext-options-sync`](https://github.com/bfred-it/webext-options-sync): Helps you manage and autosave your extension's options.
* [`webext-inject-on-install`](https://github.com/bfred-it/webext-inject-on-install): Automatically add content scripts to existing tabs when your extension is installed.
* [`Awesome WebExtensions`](https://github.com/bfred-it/Awesome-WebExtensions): A curated list of awesome resources for Web Extensions development.

## License

MIT © Federico Brigante — [Twitter](http://twitter.com/bfred_it)
