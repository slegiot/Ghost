import adminXViteConfig from '@tryghost/admin-x-framework/vite';
import pkg from './package.json';
import {mergeConfig} from 'vite';
import {resolve} from 'path';

export default (function viteConfig() {
    return mergeConfig(
        adminXViteConfig({
            packageName: pkg.name,
            entry: resolve(__dirname, 'src/index.ts'),
            overrides: {
                build: {
                    rollupOptions: {
                        external: [
                            'react',
                            'react-dom',
                            'react/jsx-runtime',
                            '@tryghost/shade',
                            '@tryghost/admin-x-framework',
                            '@tryghost/admin-x-framework/api/posts'
                        ]
                    }
                }
            }
        }),
        {}
    );
});
