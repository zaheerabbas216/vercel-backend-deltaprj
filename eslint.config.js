// eslint.config.js - ESLint Flat Config for Delta-2 Backend
// Using ESLint v9+ flat config format

 import js from '@eslint/js';
 import globals from 'globals';

export default [
    // Ignore patterns
    {
        ignores: [
            'node_modules/**',
            'storage/**',
            'database/backups/**',
            'coverage/**',
            'dist/**',
            'build/**',
            '*.min.js',
            '.docker/**'
        ]
    },

    // Base JavaScript configuration
    js.configs.recommended,

    // Global configuration for all files
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.es2021,
            }
        },
        rules: {
            // ==========================================
            // CODE QUALITY RULES
            // ==========================================

            // Possible Problems
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'no-duplicate-imports': 'error',
            'no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }],
            'no-use-before-define': ['error', {
                functions: false,
                classes: true,
                variables: true
            }],

            // Best Practices
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-return-await': 'error',
            'no-throw-literal': 'error',
            'no-useless-return': 'error',
            'prefer-promise-reject-errors': 'error',
            'require-await': 'warn',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-arrow-callback': 'warn',
            'no-lonely-if': 'error',
            'no-unneeded-ternary': 'error',

            // Error Prevention
            'no-unreachable': 'error',
            'no-unsafe-negation': 'error',
            'valid-typeof': 'error',
            'no-constant-condition': ['error', { checkLoops: false }],

            // Security
            'no-eval': 'error',
            'no-new-func': 'error',
            'no-script-url': 'error',

            // ==========================================
            // CODE STYLE RULES
            // ==========================================

            // Formatting (align with Prettier but add extra rules)
            'indent': ['error', 2, {
                SwitchCase: 1,
                ignoredNodes: ['TemplateLiteral']
            }],
            'quotes': ['error', 'single', {
                avoidEscape: true,
                allowTemplateLiterals: true
            }],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'never'],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],
            'comma-spacing': ['error', { before: false, after: true }],
            'key-spacing': ['error', { beforeColon: false, afterColon: true }],
            'keyword-spacing': ['error', { before: true, after: true }],
            'space-before-blocks': 'error',
            'space-before-function-paren': ['error', {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always'
            }],
            'space-in-parens': ['error', 'never'],
            'space-infix-ops': 'error',
            'arrow-spacing': ['error', { before: true, after: true }],
            'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
            'no-trailing-spaces': 'error',
            'eol-last': ['error', 'always'],

            // Naming Conventions
            'camelcase': ['error', {
                properties: 'never',
                ignoreDestructuring: true,
                ignoreImports: true
            }],

            // ==========================================
            // PROJECT-SPECIFIC RULES
            // ==========================================

            // Async/Await Handling
            'no-async-promise-executor': 'error',
            'prefer-promise-reject-errors': 'error',

            // Error Handling
            'handle-callback-err': 'error',
            'no-catch-shadow': 'off', // Deprecated

            // Node.js Specific
            'no-path-concat': 'error',
            'no-process-exit': 'warn'
        }
    },

    // Configuration for test files
    {
        files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly'
            }
        },
        rules: {
            'no-console': 'off',
            'no-unused-expressions': 'off',
            'max-nested-callbacks': 'off'
        }
    },

    // Configuration for migration and seeder files
    {
        files: ['database/migrations/**/*.js', 'database/seeders/**/*.js'],
        rules: {
            'no-console': 'off',
            'camelcase': 'off' // Sequelize uses snake_case for migrations
        }
    },

    // Configuration for configuration files
    {
        files: ['config/**/*.js', '*.config.js', 'scripts/**/*.js'],
        rules: {
            'no-console': 'off'
        }
    }
];