/**
 * Static HTML Adapter
 *
 * Transforms a pure HTML/CSS/JS website into a Ghost-compatible theme.
 *
 * Strategy:
 * 1. Copy all .html files → .hbs templates, rewriting asset paths
 * 2. Move CSS/JS/images into assets/
 * 3. Generate default.hbs from common layout elements
 * 4. Create Ghost-compatible package.json
 */

const fs = require('fs-extra');
const path = require('path');
const logging = require('@tryghost/logging');

const ASSET_EXTENSIONS = new Set([
    '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.pdf'
]);

/**
 * Detect if this is a static HTML site
 * @param {Object} analysis
 * @returns {boolean}
 */
function detect(analysis) {
    return analysis.framework === 'static-html';
}

/**
 * Rewrite asset references in HTML to use Ghost's {{asset}} helper
 * @param {string} html — raw HTML content
 * @param {Map<string, string>} assetMap — original path → new asset path
 * @returns {string}
 */
function rewriteAssetPaths(html, assetMap) {
    let result = html;

    for (const [originalPath, newPath] of assetMap.entries()) {
        // Rewrite href="..." and src="..." references
        const escaped = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(href|src|url)=["']${escaped}["']`, 'g');
        result = result.replace(regex, `$1="{{asset "${newPath}"}}""`);

        // Also handle url() in inline styles
        const urlRegex = new RegExp(`url\\(['"]?${escaped}['"]?\\)`, 'g');
        result = result.replace(urlRegex, `url('{{asset "${newPath}"}}')`);
    }

    return result;
}

/**
 * Extract <head> and common structural elements to build default.hbs
 * @param {string} html — the index.html content
 * @returns {{ head: string, bodyOpen: string, bodyClose: string }}
 */
function extractLayout(html) {
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch ? headMatch[1].trim() : '';

    // Try to find common header/nav and footer
    const headerMatch = html.match(/<(header|nav)[^>]*>[\s\S]*?<\/\1>/i);
    const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);

    const bodyOpen = headerMatch ? headerMatch[0] : '';
    const bodyClose = footerMatch ? footerMatch[0] : '';

    return {head, bodyOpen, bodyClose};
}

/**
 * Transform a static HTML site into a Ghost theme
 * @param {string} sourceDir — path to the extracted site
 * @param {string} targetDir — path to write the Ghost theme
 * @param {Object} analysis — analyzer output
 */
async function transform(sourceDir, targetDir, analysis) {
    logging.info(`[site-manager:static-html] Transforming ${sourceDir} → ${targetDir}`);

    await fs.ensureDir(targetDir);
    await fs.ensureDir(path.join(targetDir, 'assets'));
    await fs.ensureDir(path.join(targetDir, 'assets', 'css'));
    await fs.ensureDir(path.join(targetDir, 'assets', 'js'));
    await fs.ensureDir(path.join(targetDir, 'assets', 'images'));

    // 1. Walk source directory, separate HTML from assets
    const allFiles = await walkDir(sourceDir);
    const htmlFiles = [];
    const assetFiles = [];

    for (const relPath of allFiles) {
        const ext = path.extname(relPath).toLowerCase();
        if (ext === '.html' || ext === '.htm') {
            htmlFiles.push(relPath);
        } else if (ASSET_EXTENSIONS.has(ext)) {
            assetFiles.push(relPath);
        }
    }

    // 2. Copy assets and build the path map
    const assetMap = new Map();
    for (const relPath of assetFiles) {
        const ext = path.extname(relPath).toLowerCase();
        let assetSubdir = 'images';
        if (ext === '.css') {
            assetSubdir = 'css';
        } else if (ext === '.js') {
            assetSubdir = 'js';
        }

        const basename = path.basename(relPath);
        const newRelPath = `${assetSubdir}/${basename}`;
        assetMap.set(relPath, newRelPath);

        await fs.copy(
            path.join(sourceDir, relPath),
            path.join(targetDir, 'assets', newRelPath)
        );
    }

    // 3. Extract layout from index.html (if present)
    const indexPath = htmlFiles.find((f) => {
        return path.basename(f).toLowerCase() === 'index.html';
    });
    let layout = {head: '', bodyOpen: '', bodyClose: ''};
    if (indexPath) {
        const indexContent = await fs.readFile(path.join(sourceDir, indexPath), 'utf8');
        layout = extractLayout(indexContent);
    }

    // 4. Generate default.hbs
    const defaultHbs = `<!DOCTYPE html>
<html lang="{{@site.locale}}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{meta_title}}</title>
    {{ghost_head}}
    ${layout.head}
</head>
<body class="{{body_class}}">
    ${layout.bodyOpen}

    {{{body}}}

    ${layout.bodyClose}
    {{ghost_foot}}
</body>
</html>`;

    await fs.writeFile(path.join(targetDir, 'default.hbs'), defaultHbs, 'utf8');

    // 5. Convert HTML files to .hbs templates
    for (const relPath of htmlFiles) {
        const content = await fs.readFile(path.join(sourceDir, relPath), 'utf8');
        let hbsContent = rewriteAssetPaths(content, assetMap);

        // Strip full HTML skeleton from non-index pages (they'll use default.hbs)
        hbsContent = stripHtmlSkeleton(hbsContent);

        const hbsName = relPath
            .replace(/\.html?$/i, '.hbs')
            .replace(/\\/g, '/');

        await fs.writeFile(path.join(targetDir, hbsName), hbsContent, 'utf8');
    }

    // Ensure we have post.hbs (required by Ghost)
    if (!htmlFiles.some((f) => {
        return f.match(/^post\.html?$/i);
    })) {
        const postHbs = `{{!< default}}
<article class="post">
    <h1>{{title}}</h1>
    <div class="post-content">
        {{content}}
    </div>
</article>`;
        await fs.writeFile(path.join(targetDir, 'post.hbs'), postHbs, 'utf8');
    }

    // 6. Generate package.json
    const themeName = analysis.themeName || path.basename(targetDir);
    const packageJson = {
        name: themeName,
        description: `Imported static HTML site: ${analysis.displayName || themeName}`,
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
        keywords: ['ghost-theme', 'imported']
    };

    await fs.writeFile(
        path.join(targetDir, 'package.json'),
        JSON.stringify(packageJson, null, 4),
        'utf8'
    );

    logging.info(`[site-manager:static-html] Transformed ${htmlFiles.length} HTML files, ${assetFiles.length} assets`);
}

/**
 * Strip the full HTML/head/body wrapper, keeping only the body content
 */
function stripHtmlSkeleton(html) {
    // If it has a body tag, extract just the body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        return `{{!< default}}\n${bodyMatch[1].trim()}`;
    }
    return `{{!< default}}\n${html}`;
}

/**
 * Recursively walk a directory and return relative file paths
 * @param {string} dir
 * @param {string} [base]
 * @returns {Promise<string[]>}
 */
async function walkDir(dir, base) {
    const baseDir = base || dir;
    const entries = await fs.readdir(dir, {withFileTypes: true});
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // Skip common non-content directories
            if (['node_modules', '.git', '__pycache__', '.DS_Store'].includes(entry.name)) {
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
    name: 'static-html',
    detect,
    transform
};
