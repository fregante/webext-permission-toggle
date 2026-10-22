import globals from 'globals';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	{
		ignores: ['demo/package.json', 'docs/index.html', 'readme.md'],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions,
			},
		},
		rules: {
			'no-alert': 'off',
			'@typescript-eslint/strict-void-return': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'unicorn/consistent-boolean-name': 'off',
			'jsdoc/informative-docs': 'off',
		},
	},
];

export default xoConfig;
