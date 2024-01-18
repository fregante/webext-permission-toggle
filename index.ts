import chromeP from 'webext-polyfill-kinda';
import {patternToRegex} from 'webext-patterns';
import {isBackground} from 'webext-detect-page';
import {getManifestPermissionsSync} from 'webext-additional-permissions';
import {getTabUrl} from 'webext-tools';
import {executeFunction} from 'webext-content-scripts';

const contextMenuId = 'webext-domain-permission-toggle:add-permission';
let globalOptions: Options;

type Options = {
	/**
	 * The title of the action in the context menu.
	 */
	title?: string;

	/**
	 * If the user accepts the new permission, they will be asked to reload the current tab.
	 * Set a `string` to customize the message and `false` (default) to avoid the reload and its request.
	 */
	reloadOnSuccess?: string | boolean;
};

async function isOriginPermanentlyAllowed(origin: string): Promise<boolean> {
	return chromeP.permissions.contains({
		origins: [origin + '/*'],
	});
}

async function updateItem(url?: string): Promise<void> {
	const settings = {
		checked: false,
		enabled: true,
	};

	// No URL means no activeTab, no manifest permission, no granted permission, or no permission possible (chrome://)
	if (url) {
		const origin = new URL(url).origin;
		// Manifest permissions can't be removed; this disables the toggle on those domains
		const manifestPermissions = getManifestPermissionsSync();
		const isDefault = patternToRegex(...manifestPermissions.origins).test(origin);
		settings.enabled = !isDefault;

		// We might have temporary permission as part of `activeTab`, so it needs to be properly checked
		settings.checked = isDefault || await isOriginPermanentlyAllowed(origin);
	}

	chrome.contextMenus.update(contextMenuId, settings);
}

async function togglePermission(tab: chrome.tabs.Tab, toggle: boolean): Promise<void> {
	// Don't use non-ASCII characters because Safari breaks the encoding in executeScript.code
	const safariError = 'The browser didn\'t supply any information about the active tab.';
	if (!tab.url && toggle) {
		throw new Error(`Please try again. ${safariError}`);
	}

	if (!tab.url && !toggle) {
		throw new Error(`Couldn't disable the extension on the current tab. ${safariError}`);
	}

	// TODO: Ensure that URL is in `optional_permissions`
	const permissionData = {
		origins: [
			new URL(tab.url!).origin + '/*',
		],
	};

	if (!toggle) {
		void chromeP.permissions.remove(permissionData);
		return;
	}

	const userAccepted = await chromeP.permissions.request(permissionData);
	if (!userAccepted) {
		chrome.contextMenus.update(contextMenuId, {
			checked: false,
		});
		return;
	}

	if (globalOptions.reloadOnSuccess) {
		void executeFunction(tab.id!, (message: string) => {
			if (confirm(message)) {
				location.reload();
			}
		}, globalOptions.reloadOnSuccess);
	}
}

async function handleTabActivated({tabId}: chrome.tabs.TabActiveInfo): Promise<void> {
	void updateItem(await getTabUrl(tabId) ?? '');
}

async function handleClick(
	{checked, menuItemId}: chrome.contextMenus.OnClickData,
	tab?: chrome.tabs.Tab,
): Promise<void> {
	if (menuItemId !== contextMenuId) {
		return;
	}

	try {
		await togglePermission(tab!, checked!);
	} catch (error) {
		if (tab?.id) {
			try {
				await executeFunction(
					tab.id,
					text => {
						alert(text); /* Can't pass a raw native function */
					},
					String(error),
				);
			} catch {
				alert(error); // One last attempt
			}
		}

		throw error;
	} finally {
		void updateItem();
	}
}

/**
 * Adds an item to the browser action icon's context menu.
 * The user can access this menu by right clicking the icon. If your extension doesn't have any action or
 * popup assigned to the icon, it will also appear with a left click.
 *
 * @param options {Options}
 */
export default function addDomainPermissionToggle(options?: Options): void {
	if (!isBackground()) {
		throw new Error('webext-domain-permission-toggle can only be called from a background page');
	}

	if (globalOptions) {
		throw new Error('webext-domain-permission-toggle can only be initialized once');
	}

	const manifest = chrome.runtime.getManifest();

	if (!manifest.permissions?.includes('contextMenus')) {
		throw new Error('webext-domain-permission-toggle requires the `contextMenus` permission');
	}

	if (!chrome.contextMenus) {
		console.warn('chrome.contextMenus is not available');
		return;
	}

	globalOptions = {
		title: `Enable ${manifest.name} on this domain`,
		reloadOnSuccess: false,
		...options,
	};

	if (globalOptions.reloadOnSuccess === true) {
		globalOptions.reloadOnSuccess = `Do you want to reload this page to apply ${manifest.name}?`;
	}

	const optionalHosts = [
		...manifest.optional_permissions ?? [],
		...manifest.optional_host_permissions as string[] ?? [],
	].filter((permission: string) => permission === '<all_urls>' || permission.includes('*'));

	if (optionalHosts.length === 0) {
		throw new TypeError('webext-domain-permission-toggle requires some wildcard hosts to be specified in `optional_permissions` or `optional_host_permissions` (MV3)');
	}

	// Remove any existing context menu item and silence any error
	chrome.contextMenus.remove(contextMenuId, () => chrome.runtime.lastError);

	const contexts: chromeP.contextMenus.ContextType[] = 'browser_action' in chrome
		? ['page_action', 'browser_action']
		: ['action'];

	chrome.contextMenus.create({
		id: contextMenuId,
		type: 'checkbox',
		checked: false,
		title: globalOptions.title,
		contexts,

		// Note: This is completely ignored by Chrome and Safari. Great. #14
		documentUrlPatterns: optionalHosts,
	});

	chrome.contextMenus.onClicked.addListener(handleClick);
	chrome.tabs.onActivated.addListener(handleTabActivated);
	chrome.tabs.onUpdated.addListener(async (tabId, {status}, {url, active}) => {
		if (active && status === 'complete') {
			void updateItem(url ?? await getTabUrl(tabId) ?? '');
		}
	});
}
