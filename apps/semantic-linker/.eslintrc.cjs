/* eslint-env node */
const tailwindCssConfig = `${__dirname}/../admin/src/index.css`;

module.exports = {
    root: true,
    extends: [
        'plugin:ghost/ts',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    plugins: [
        'ghost',
        'react-refresh',
        'tailwindcss'
    ],
    settings: {
        react: {
            version: 'detect'
        },
        tailwindcss: {
            config: tailwindCssConfig
        }
    },
    rules: {
        'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }],
        'ghost/filenames/match-regex': 'off',
        'react-refresh/only-export-components': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'react/jsx-sort-props': ['error', {
            reservedFirst: true,
            callbacksLast: true,
            shorthandLast: true,
            locale: 'en'
        }],
        'react/button-has-type': 'error',
        'react/no-array-index-key': 'error',
        'react/jsx-key': 'off',
        'tailwindcss/classnames-order': 'error',
        'tailwindcss/enforces-negative-arbitrary-values': 'warn',
        'tailwindcss/enforces-shorthand': 'warn',
        'tailwindcss/migration-from-tailwind-2': 'warn',
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': 'error'
    }
};
