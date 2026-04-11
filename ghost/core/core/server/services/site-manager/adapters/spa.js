/**
 * SPA Adapter
 *
 * Transforms a pre-built Single Page Application (React, Vue, Svelte, etc.)
 * into a Ghost-compatible theme.
 *
 * Strategy:
 * 1. Expect a build output directory containing index.html + bundled JS/CSS
 * 2. Copy all assets into theme assets/
 * 3. Create a minimal default.hbs that serves the SPA shell
 * 4. Rewrite asset paths to use Ghost's {{asset}} helper
 */

const fs = require('fs-extra');
const path = require('path');
const logging = require('@tryghost/logging');

/**
 * Detect if this is an SPA build
 * @param {Object} analysis
 * @returns {boolean}
 */
function detect(analysis) {
    return analysis.framework === 'spa' ||
           analysis.framework === 'react' ||
           analysis.framework === 'vue' ||
           analysis.framework === 'svelte';
}

/**
 * Find the build output directory within a project
 * Common paths: dist/, build/, out/, public/
 * @param {string} sourceDir
 * @returns {Promise<string>} — path to the build dir, or sourceDir if none found
 */
async function findBuildDir(sourceDir) {
    const candidates = ['dist', 'build', 'out', '.output/public', 'public'];

    for (const candidate of candidates) {
        const fullPath = path.join(sourceDir, candidate);
        const exists = await fs.pathExists(fullPath);
        if (exists) {
            // Check for index.html inside
            const hasIndex = await fs.pathExists(path.join(fullPath, 'index.html'));
            if (hasIndex) {
                return fullPath;
            }
        }
    }

    // If rootDir itself has index.html, use it directly
    const rootIndex = await fs.pathExists(path.join(sourceDir, 'index.html'));
    if (rootIndex) {
        return sourceDir;
    }

    return sourceDir;
}

/**
 * Transform an SPA into a Ghost theme
 * @param {string} sourceDir — path to the extracted site
 * @param {string} targetDir — path to write the Ghost theme
 * @param {Object} analysis — analyzer output
 */
async function transform(sourceDir, targetDir, analysis) {
    logging.info(`[site-manager:spa] Transforming SPA ${sourceDir} → ${targetDir}`);

    const buildDir = await findBuildDir(sourceDir);
    logging.info(`[site-manager:spa] Using build directory: ${buildDir}`);

    await fs.ensureDir(targetDir);
    await fs.ensureDir(path.join(targetDir, 'assets'));

    // 1. Read the SPA's index.html
    const indexPath = path.join(buildDir, 'index.html');
    let indexHtml = await fs.readFile(indexPath, 'utf8');

    // 2. Copy all non-HTML files to assets/
    const allFiles = await walkDir(buildDir);
    const assetFiles = allFiles.filter((f) => {
        return path.extname(f).toLowerCase() !== '.html';
    });

    for (const relPath of assetFiles) {
        await fs.copy(
            path.join(buildDir, relPath),
            path.join(targetDir, 'assets', relPath)
        );
    }

    // 3. Rewrite asset paths in the index.html
    for (const relPath of assetFiles) {
        const escaped = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Handle paths like /assets/index-abc123.js or ./static/css/main.css
        const patterns = [
            new RegExp(`(href|src)=["']/?${escaped}["']`, 'g'),
            new RegExp(`(href|src)=["']\./${escaped}["']`, 'g')
        ];

        for (const regex of patterns) {
            indexHtml = indexHtml.replace(regex, `$1="{{asset "${relPath}"}}"`);
        }
    }

    // 4. Generate default.hbs with the SPA shell
    const headMatch = indexHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    const headContent = headMatch ? headMatch[1].trim() : '';
    const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';

    const defaultHbs = `<!DOCTYPE html>
<html lang="{{@site.locale}}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{meta_title}}</title>
    {{ghost_head}}
    ${headContent}
</head>
<body class="{{body_class}}">
    ${bodyContent}
    {{ghost_foot}}
</body>
</html>`;

    await fs.writeFile(path.join(targetDir, 'default.hbs'), defaultHbs, 'utf8');

    // 5. Create index.hbs — minimal wrapper that uses default layout
    const indexHbs = `{{!< default}}
{{!-- SPA entry point — the default.hbs layout contains the full SPA shell --}}
<div id="ghost-content" style="display:none">
    {{#foreach posts}}
    <article data-slug="{{slug}}">
        <h2>{{title}}</h2>
        {{content}}
    </article>
    {{/foreach}}
</div>`;

    await fs.writeFile(path.join(targetDir, 'index.hbs'), indexHbs, 'utf8');

    // 6. Create post.hbs
    const postHbs = `{{!< default}}
<script>
    // Notify SPA router about Ghost page data
    window.__GHOST_POST__ = {
        title: "{{title}}",
        slug: "{{slug}}",
        url: "{{url}}",
        html: {{{json content}}}
    };
</script>`;

    await fs.writeFile(path.join(targetDir, 'post.hbs'), postHbs, 'utf8');

    // 7. Generate package.json
    const themeName = analysis.themeName || path.basename(targetDir);
    const packageJson = {
        name: themeName,
        description: `Imported SPA (${analysis.details?.spaFramework || 'unknown'}): ${analysis.displayName || themeName}`,
        version: '1.0.0',
        engines: {
            ghost: '>=5.0.0'
        },
        license: 'MIT',
        config: {
            posts_per_page: 10
        },
        author: {
            name: 'Site Manager Import'
        },
        keywords: ['ghost-theme', 'imported', 'spa']
    };

    await fs.writeFile(
        path.join(targetDir, 'package.json'),
        JSON.stringify(packageJson, null, 4),
        'utf8'
    );

    logging.info(`[site-manager:spa] Transformed SPA with ${assetFiles.length} assets`);
}

/**
 * Recursively walk a directory and return relative file paths
 */
async function walkDir(dir, base) {
    const baseDir = base || dir;
    const entries = await fs.readdir(dir, {withFileTypes: true});
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.git'].includes(entry.name)) {
                continue;
            }
            const subFiles = await walkDir(fullPath, baseDir);
            files.push(...subFiles);
        } else {
            files.push(path.relative(baseDir, fullPath));
        }
    }

    return files;
}

module.exports = {
    name: 'spa',
    detect,
    transform
};
