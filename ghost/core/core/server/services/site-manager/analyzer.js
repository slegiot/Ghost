/**
 * Site Analyzer
 *
 * Inspects a directory to detect the type of website/framework it contains.
 * Returns a structured analysis object used by the adapter registry to
 * select the correct transformation adapter.
 */

const fs = require('fs-extra');
const path = require('path');
const logging = require('@tryghost/logging');

/**
 * @typedef {Object} AnalysisResult
 * @property {string} framework — detected framework identifier
 * @property {number} confidence — 0-1 confidence score
 * @property {string} displayName — human-readable name
 * @property {string} themeName — sanitized theme name for Ghost
 * @property {Object} details — framework-specific metadata
 * @property {string[]} files — list of relevant files found
 */

/**
 * SPA framework indicators in package.json dependencies
 */
const SPA_INDICATORS = {
    react: ['react', 'react-dom', 'react-scripts', 'next', 'gatsby'],
    vue: ['vue', 'nuxt', '@vue/cli-service', 'vite'],
    svelte: ['svelte', 'svelte-kit', '@sveltejs/kit'],
    angular: ['@angular/core', '@angular/cli']
};

/**
 * SSG config file indicators
 */
const SSG_INDICATORS = {
    hugo: ['hugo.toml', 'hugo.yaml', 'hugo.json', 'config.toml'],
    jekyll: ['_config.yml', '_config.yaml', 'Gemfile'],
    eleventy: ['.eleventy.js', 'eleventy.config.js', 'eleventy.config.cjs'],
    astro: ['astro.config.mjs', 'astro.config.ts']
};

/**
 * Analyze a directory to detect the website framework
 * @param {string} dirPath — path to the directory to analyze
 * @returns {Promise<AnalysisResult>}
 */
async function analyze(dirPath) {
    logging.info(`[site-manager:analyzer] Analyzing ${dirPath}`);

    const result = {
        framework: 'unknown',
        confidence: 0,
        displayName: path.basename(dirPath),
        themeName: sanitizeName(path.basename(dirPath)),
        details: {},
        files: []
    };

    // Collect top-level files
    const entries = await fs.readdir(dirPath, {withFileTypes: true});
    const fileNames = entries.map((e) => {
        return e.name;
    });
    result.files = fileNames;

    // 1. Check for Ghost/Handlebars theme
    const hbsCheck = await checkHandlebars(dirPath, fileNames);
    if (hbsCheck.detected) {
        result.framework = hbsCheck.isGhostTheme ? 'ghost-theme' : 'handlebars';
        result.confidence = hbsCheck.confidence;
        result.details = hbsCheck.details;
        logging.info(`[site-manager:analyzer] Detected: ${result.framework} (${result.confidence})`);
        return result;
    }

    // 2. Check for package.json (SPA/Node project)
    const pkgCheck = await checkPackageJson(dirPath, fileNames);
    if (pkgCheck.detected) {
        result.framework = pkgCheck.framework;
        result.confidence = pkgCheck.confidence;
        result.details = pkgCheck.details;
        logging.info(`[site-manager:analyzer] Detected: ${result.framework} (${result.confidence})`);
        return result;
    }

    // 3. Check for SSG config files
    const ssgCheck = checkSSGConfig(fileNames);
    if (ssgCheck.detected) {
        result.framework = ssgCheck.framework;
        result.confidence = ssgCheck.confidence;
        result.details = ssgCheck.details;
        logging.info(`[site-manager:analyzer] Detected: ${result.framework} (${result.confidence})`);
        return result;
    }

    // 4. Check for static HTML
    const htmlCheck = await checkStaticHtml(dirPath, fileNames);
    if (htmlCheck.detected) {
        result.framework = 'static-html';
        result.confidence = htmlCheck.confidence;
        result.details = htmlCheck.details;
        logging.info(`[site-manager:analyzer] Detected: static-html (${result.confidence})`);
        return result;
    }

    // 5. Check for SPA build output (dist/build folder with index.html)
    const spaOutputCheck = await checkSpaBuildOutput(dirPath, fileNames);
    if (spaOutputCheck.detected) {
        result.framework = 'spa';
        result.confidence = spaOutputCheck.confidence;
        result.details = spaOutputCheck.details;
        logging.info(`[site-manager:analyzer] Detected: spa build output (${result.confidence})`);
        return result;
    }

    logging.warn(`[site-manager:analyzer] Could not detect framework for ${dirPath}`);
    return result;
}

/**
 * Check for Handlebars/Ghost theme indicators
 */
async function checkHandlebars(dirPath, fileNames) {
    const hbsFiles = fileNames.filter((f) => {
        return f.endsWith('.hbs');
    });

    if (hbsFiles.length === 0) {
        return {detected: false};
    }

    const hasDefault = hbsFiles.includes('default.hbs');
    const hasIndex = hbsFiles.includes('index.hbs');
    const hasPost = hbsFiles.includes('post.hbs');

    // Check if it's specifically a Ghost theme
    let isGhostTheme = false;
    let confidence = 0.6;

    if (hasDefault && hasIndex) {
        confidence = 0.8;
    }

    if (hasDefault && hasIndex && hasPost) {
        confidence = 0.9;
    }

    // Check for Ghost-specific helpers in template content
    if (hasDefault) {
        try {
            const content = await fs.readFile(path.join(dirPath, 'default.hbs'), 'utf8');
            if (content.includes('{{ghost_head}}') || content.includes('{{ghost_foot}}')) {
                isGhostTheme = true;
                confidence = 1.0;
            }
        } catch {
            // ignore read errors
        }
    }

    return {
        detected: true,
        isGhostTheme,
        confidence,
        details: {
            hbsFileCount: hbsFiles.length,
            hasDefault,
            hasIndex,
            hasPost,
            hbsFiles
        }
    };
}

/**
 * Check package.json for SPA framework dependencies
 */
async function checkPackageJson(dirPath, fileNames) {
    if (!fileNames.includes('package.json')) {
        return {detected: false};
    }

    try {
        const pkg = await fs.readJson(path.join(dirPath, 'package.json'));
        const allDeps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {})
        };
        const depNames = Object.keys(allDeps);

        for (const [framework, indicators] of Object.entries(SPA_INDICATORS)) {
            const matches = indicators.filter((i) => {
                return depNames.includes(i);
            });
            if (matches.length > 0) {
                return {
                    detected: true,
                    framework: framework === 'react' && depNames.includes('next') ? 'spa' : framework,
                    confidence: Math.min(0.5 + (matches.length * 0.15), 0.95),
                    details: {
                        spaFramework: framework,
                        matchedDeps: matches,
                        packageName: pkg.name
                    }
                };
            }
        }
    } catch {
        // ignore parse errors
    }

    return {detected: false};
}

/**
 * Check for SSG configuration files
 */
function checkSSGConfig(fileNames) {
    for (const [framework, configFiles] of Object.entries(SSG_INDICATORS)) {
        const matches = configFiles.filter((f) => {
            return fileNames.includes(f);
        });
        if (matches.length > 0) {
            return {
                detected: true,
                framework: `ssg-${framework}`,
                confidence: 0.9,
                details: {
                    ssgFramework: framework,
                    configFiles: matches
                }
            };
        }
    }

    return {detected: false};
}

/**
 * Check for static HTML site (has index.html and possibly linked assets)
 */
async function checkStaticHtml(dirPath, fileNames) {
    const htmlFiles = fileNames.filter((f) => {
        return f.endsWith('.html') || f.endsWith('.htm');
    });

    if (htmlFiles.length === 0) {
        return {detected: false};
    }

    const hasIndex = htmlFiles.some((f) => {
        return f.toLowerCase() === 'index.html';
    });

    const cssFiles = fileNames.filter((f) => {
        return f.endsWith('.css');
    });
    const jsFiles = fileNames.filter((f) => {
        return f.endsWith('.js');
    });

    return {
        detected: true,
        confidence: hasIndex ? 0.85 : 0.5,
        details: {
            htmlFileCount: htmlFiles.length,
            cssFileCount: cssFiles.length,
            jsFileCount: jsFiles.length,
            hasIndex,
            htmlFiles
        }
    };
}

/**
 * Check for SPA build output — a dist/build directory with index.html
 */
async function checkSpaBuildOutput(dirPath, fileNames) {
    const buildDirs = ['dist', 'build', 'out', '.output'];
    for (const dir of buildDirs) {
        if (fileNames.includes(dir)) {
            const fullPath = path.join(dirPath, dir);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                const hasIndex = await fs.pathExists(path.join(fullPath, 'index.html'));
                if (hasIndex) {
                    return {
                        detected: true,
                        confidence: 0.8,
                        details: {
                            buildDir: dir,
                            spaFramework: 'unknown'
                        }
                    };
                }
            }
        }
    }

    return {detected: false};
}

/**
 * Sanitize a name for use as a Ghost theme name
 */
function sanitizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'imported-site';
}

module.exports = {
    analyze,
    sanitizeName
};
