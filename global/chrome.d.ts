declare namespace chrome.permissions {
	export function contains(permissions: Permissions): Promise<boolean>;
	export function request(permissions: Permissions): Promise<boolean>;
	export function remove(permissions: Permissions): Promise<boolean>;
}
