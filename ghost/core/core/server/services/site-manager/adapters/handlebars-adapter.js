/**
 * Handlebars Adapter
 *
 * Handles sites that are already Handlebars/Ghost themes or use Handlebars
 * templating. Performs minimal transformation — mostly validation and
 * metadata enrichment.
 */

const fs = require('fs-extra');
const path = require('path');
const logging = require('@tryghost/logging');

/**
 * Detect if this is a Handlebars/Ghost theme
 * @param {Object} analysis
 * @returns {boolean}
 */
function detect(analysis) {
    return analysis.framework === 'handlebars' || analysis.framework === 'ghost-theme';
}

/**
 * Transform — mostly a passthrough with validation
 * @param {string} sourceDir
 * @param {string} targetDir
 * @param {Object} analysis
 */
async function transform(sourceDir, targetDir, analysis) {
    logging.info(`[site-manager:handlebars] Transforming ${sourceDir} → ${targetDir}`);

    // Copy the entire source to target
    await fs.copy(sourceDir, targetDir, {
        filter: (src) => {
            const basename = path.basename(src);
            // Skip common non-theme directories
            return !['node_modules', '.git', '__pycache__', '.DS_Store'].includes(basename);
        }
    });

    // Ensure required Ghost theme files exist
    await ensurePackageJson(targetDir, analysis);
    await ensureDefaultHbs(targetDir);
    await ensureIndexHbs(targetDir);
    await ensurePostHbs(targetDir);

    logging.info(`[site-manager:handlebars] Theme ready at ${targetDir}`);
}

/**
 * Ensure package.json exists with required Ghost fields
 */
async function ensurePackageJson(targetDir, analysis) {
    const pkgPath = path.join(targetDir, 'package.json');
    let pkg = {};

    if (await fs.pathExists(pkgPath)) {
        try {
            pkg = await fs.readJson(pkgPath);
        } catch {
            pkg = {};
        }
    }

    // Fill in required fields if missing
    const themeName = analysis.themeName || path.basename(targetDir);
    pkg.name = pkg.name || themeName;
    pkg.version = pkg.version || '1.0.0';
    pkg.description = pkg.description || `Imported Handlebars theme: ${analysis.displayName || themeName}`;

    if (!pkg.engines) {
        pkg.engines = {};
    }
    pkg.engines.ghost = pkg.engines.ghost || '>=5.0.0';

    if (!pkg.config) {
        pkg.config = {};
    }
    pkg.config.posts_per_page = pkg.config.posts_per_page || 10;

    if (!pkg.keywords) {
        pkg.keywords = ['ghost-theme', 'imported'];
    }

    await fs.writeJson(pkgPath, pkg, {spaces: 4});
}

/**
 * Ensure default.hbs exists — create a minimal one if missing
 */
async function ensureDefaultHbs(targetDir) {
    const defaultPath = path.join(targetDir, 'default.hbs');
    if (await fs.pathExists(defaultPath)) {
        return;
    }

    const content = `<!DOCTYPE html>
<html lang="{{@site.locale}}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{meta_title}}</title>
    {{ghost_head}}
</head>
<body class="{{body_class}}">
    {{{body}}}
    {{ghost_foot}}
</body>
</html>`;

    await fs.writeFile(defaultPath, content, 'utf8');
}

/**
 * Ensure index.hbs exists
 */
async function ensureIndexHbs(targetDir) {
    const indexPath = path.join(targetDir, 'index.hbs');
    if (await fs.pathExists(indexPath)) {
        return;
    }

    const content = `{{!< default}}
{{#foreach posts}}
<article class="post">
    <h2><a href="{{url}}">{{title}}</a></h2>
    <p>{{excerpt words="30"}}</p>
</article>
{{/foreach}}

{{pagination}}`;

    await fs.writeFile(indexPath, content, 'utf8');
}

/**
 * Ensure post.hbs exists
 */
async function ensurePostHbs(targetDir) {
    const postPath = path.join(targetDir, 'post.hbs');
    if (await fs.pathExists(postPath)) {
        return;
    }

    const content = `{{!< default}}
<article class="post">
    <h1>{{title}}</h1>
    <div class="post-content">
        {{content}}
    </div>
</article>`;

    await fs.writeFile(postPath, content, 'utf8');
}

module.exports = {
    name: 'handlebars',
    detect,
    transform
};
