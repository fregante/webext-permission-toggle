import chromeP from 'webext-polyfill-kinda';
import {isBackground} from 'webext-detect-page';
import {isUrlPermittedByManifest} from 'webext-permissions';
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

function assertTab(tab: chrome.tabs.Tab | undefined):
	asserts tab is chrome.tabs.Tab & {id: number} {
	if (!tab?.id) {
		// Don't use non-ASCII characters because Safari breaks the encoding in executeScript.code
		throw new Error('The browser didn\'t supply any information about the active tab.');
	}
}

function assertUrl(url: string | undefined): asserts url is string {
	if (!url) {
		// Don't use non-ASCII characters because Safari breaks the encoding in executeScript.code
		throw new Error('The browser didn\'t supply any the current page\'s URL.');
	}
}

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
		const {origin} = new URL(url);
		// Manifest permissions can't be removed; this disables the toggle on those domains
		const isDefault = isUrlPermittedByManifest(url);
		settings.enabled = !isDefault;

		// We might have temporary permission as part of `activeTab`, so it needs to be properly checked
		settings.checked = isDefault || await isOriginPermanentlyAllowed(origin);
	}

	chrome.contextMenus.update(contextMenuId, settings);
}

/**
 * Requests or removes the host permission for the specified tab
 * @returns Whether the permission exists after the request/removal
 */
async function setPermission(url: string | undefined, request: boolean): Promise<boolean> {
	// TODO: Ensure that URL is in `optional_permissions`
	// TODO: https://github.com/fregante/webext-domain-permission-toggle/issues/37
	const permissionData = {
		origins: [
			new URL(url!).origin + '/*',
		],
	};

	await chromeP.permissions[request ? 'request' : 'remove'](permissionData);

	return chromeP.permissions.contains(permissionData);
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

	let url: string | undefined;

	try {
		assertTab(tab);
		url = tab.url ?? await getTabUrl(tab.id);
		assertUrl(url);
		const permissionExistsNow = await setPermission(url, checked!);
		const settingWasSuccessful = permissionExistsNow === checked;
		// If successful, Chrome already natively updated the context menu item.
		if (!settingWasSuccessful) {
			chrome.contextMenus.update(contextMenuId, {
				checked: permissionExistsNow,
			});
		}

		if (permissionExistsNow && globalOptions.reloadOnSuccess) {
			void executeFunction(tab.id, (message: string) => {
				if (confirm(message)) {
					location.reload();
				}
			}, globalOptions.reloadOnSuccess);
		}
	} catch (error) {
		void updateItem(url);

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

	const contexts: chromeP.contextMenus.ContextType[] = manifest.manifest_version === 2
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
