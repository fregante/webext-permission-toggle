declare module 'webext-domain-permission-toggle' {
	export interface Options {
		title?: string;
		reloadOnSuccess?: string;
	}

	export function addContextMenu(options?: Options): void;
}
