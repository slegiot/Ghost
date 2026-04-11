/**
 * Site Scaffold
 *
 * Generates new Ghost theme sites from scratch with various layout options.
 * Creates a complete, activatable Ghost theme with modern default styling.
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');

const analyzer = require('./analyzer');

/**
 * Layout templates available for scaffolding
 */
const LAYOUTS = {
    blog: {
        description: 'A clean blog layout with post listing and single post views',
        color: '#3498db'
    },
    portfolio: {
        description: 'A portfolio/showcase layout with grid-based project display',
        color: '#9b59b6'
    },
    landing: {
        description: 'A single-page landing/marketing site with hero section',
        color: '#2ecc71'
    },
    docs: {
        description: 'A documentation site with sidebar navigation',
        color: '#e67e22'
    }
};

/**
 * Create a new site from scratch
 *
 * @param {Object} options
 * @param {string} options.name — site name (used as theme name)
 * @param {string} [options.displayName] — human-readable display name
 * @param {string} [options.layout='blog'] — layout type
 * @param {string} [options.primaryColor] — primary brand color hex
 * @param {string} [options.description] — site description
 * @returns {Promise<{themeName: string, themePath: string}>}
 */
async function createSite(options) {
    if (!options.name) {
        throw new errors.ValidationError({
            message: 'Site name is required'
        });
    }

    const themeName = analyzer.sanitizeName(options.name);
    const layout = options.layout || 'blog';
    const primaryColor = options.primaryColor || LAYOUTS[layout]?.color || '#3498db';
    const displayName = options.displayName || options.name;
    const description = options.description || `A ${layout} site created with Ghost Site Manager`;

    if (!LAYOUTS[layout]) {
        throw new errors.ValidationError({
            message: `Unknown layout: ${layout}. Available: ${Object.keys(LAYOUTS).join(', ')}`
        });
    }

    logging.info(`[site-manager:scaffold] Creating ${layout} site: ${themeName}`);

    const targetDir = path.join(
        os.tmpdir(),
        `ghost-scaffold-${security.identifier.uid(10)}`,
        themeName
    );

    await fs.ensureDir(targetDir);
    await fs.ensureDir(path.join(targetDir, 'assets', 'css'));
    await fs.ensureDir(path.join(targetDir, 'assets', 'js'));
    await fs.ensureDir(path.join(targetDir, 'assets', 'images'));
    await fs.ensureDir(path.join(targetDir, 'partials'));

    // Generate all theme files
    await writePackageJson(targetDir, themeName, displayName, description);
    await writeDefaultHbs(targetDir, displayName, primaryColor);
    await writeIndexHbs(targetDir, layout);
    await writePostHbs(targetDir, layout);
    await writePageHbs(targetDir);
    await writePartials(targetDir);
    await writeStylesheet(targetDir, primaryColor, layout);
    await writeScript(targetDir);

    logging.info(`[site-manager:scaffold] Site scaffolded at ${targetDir}`);

    return {themeName, themePath: targetDir};
}

// --- File generators ---

async function writePackageJson(targetDir, name, displayName, description) {
    const pkg = {
        name,
        description,
        version: '1.0.0',
        engines: {
            ghost: '>=5.0.0'
        },
        license: 'MIT',
        config: {
            posts_per_page: 10
        },
        author: {
            name: displayName
        },
        keywords: ['ghost-theme', 'site-manager']
    };
    await fs.writeJson(path.join(targetDir, 'package.json'), pkg, {spaces: 4});
}

async function writeDefaultHbs(targetDir, displayName, primaryColor) {
    const content = `<!DOCTYPE html>
<html lang="{{@site.locale}}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{meta_title}}</title>
    <link rel="stylesheet" href="{{asset "css/style.css"}}">
    {{ghost_head}}
    <style>:root { --primary: ${primaryColor}; }</style>
</head>
<body class="{{body_class}}">
    {{> header}}

    <main class="site-main">
        {{{body}}}
    </main>

    {{> footer}}

    <script src="{{asset "js/main.js"}}"></script>
    {{ghost_foot}}
</body>
</html>`;

    await fs.writeFile(path.join(targetDir, 'default.hbs'), content, 'utf8');
}

async function writeIndexHbs(targetDir, layout) {
    let content;

    if (layout === 'landing') {
        content = `{{!< default}}

<section class="hero">
    <div class="hero-content">
        <h1>{{@site.title}}</h1>
        <p class="hero-description">{{@site.description}}</p>
        <a href="#content" class="btn btn-primary">Get Started</a>
    </div>
</section>

<section id="content" class="section">
    <div class="container">
        <h2 class="section-title">Latest Updates</h2>
        <div class="grid">
            {{#foreach posts}}
            <article class="card">
                {{#if feature_image}}
                <img class="card-image" src="{{feature_image}}" alt="{{title}}">
                {{/if}}
                <div class="card-body">
                    <h3><a href="{{url}}">{{title}}</a></h3>
                    <p>{{excerpt words="20"}}</p>
                </div>
            </article>
            {{/foreach}}
        </div>
    </div>
</section>`;
    } else if (layout === 'portfolio') {
        content = `{{!< default}}

<section class="portfolio-header">
    <h1>{{@site.title}}</h1>
    <p>{{@site.description}}</p>
</section>

<section class="portfolio-grid">
    <div class="container">
        <div class="grid grid-3">
            {{#foreach posts}}
            <article class="portfolio-item">
                {{#if feature_image}}
                <div class="portfolio-image">
                    <img src="{{feature_image}}" alt="{{title}}">
                    <div class="portfolio-overlay">
                        <a href="{{url}}" class="btn">View Project</a>
                    </div>
                </div>
                {{/if}}
                <h3><a href="{{url}}">{{title}}</a></h3>
                <p class="portfolio-meta">{{date format="MMM YYYY"}}</p>
            </article>
            {{/foreach}}
        </div>
    </div>
</section>

{{pagination}}`;
    } else if (layout === 'docs') {
        content = `{{!< default}}

<div class="docs-layout">
    <aside class="docs-sidebar">
        <nav>
            <h3>Documentation</h3>
            {{#get "posts" limit="all"}}
            <ul>
                {{#foreach posts}}
                <li><a href="{{url}}">{{title}}</a></li>
                {{/foreach}}
            </ul>
            {{/get}}
        </nav>
    </aside>

    <div class="docs-content">
        <h1>{{@site.title}}</h1>
        <p class="lead">{{@site.description}}</p>

        {{#foreach posts}}
        <article class="doc-entry">
            <h2><a href="{{url}}">{{title}}</a></h2>
            <p>{{excerpt words="40"}}</p>
        </article>
        {{/foreach}}

        {{pagination}}
    </div>
</div>`;
    } else {
        // Default blog layout
        content = `{{!< default}}

<div class="container">
    <header class="blog-header">
        <h1>{{@site.title}}</h1>
        <p class="blog-description">{{@site.description}}</p>
    </header>

    <div class="post-feed">
        {{#foreach posts}}
        <article class="post-card">
            {{#if feature_image}}
            <a class="post-card-image-link" href="{{url}}">
                <img class="post-card-image" src="{{feature_image}}" alt="{{title}}">
            </a>
            {{/if}}
            <div class="post-card-content">
                <h2 class="post-card-title"><a href="{{url}}">{{title}}</a></h2>
                <p class="post-card-excerpt">{{excerpt words="30"}}</p>
                <footer class="post-card-meta">
                    <span class="post-card-author">{{primary_author.name}}</span>
                    <time datetime="{{date format="YYYY-MM-DD"}}">{{date format="D MMM YYYY"}}</time>
                </footer>
            </div>
        </article>
        {{/foreach}}
    </div>

    {{pagination}}
</div>`;
    }

    await fs.writeFile(path.join(targetDir, 'index.hbs'), content, 'utf8');
}

async function writePostHbs(targetDir, layout) {
    const isDocsLayout = layout === 'docs';

    const content = isDocsLayout
        ? `{{!< default}}

<div class="docs-layout">
    <aside class="docs-sidebar">
        <nav>
            <h3>Documentation</h3>
            {{#get "posts" limit="all"}}
            <ul>
                {{#foreach posts}}
                <li><a href="{{url}}" class="{{#if @active}}active{{/if}}">{{title}}</a></li>
                {{/foreach}}
            </ul>
            {{/get}}
        </nav>
    </aside>

    <article class="docs-content doc-article">
        <h1>{{title}}</h1>
        <div class="doc-body">
            {{content}}
        </div>
    </article>
</div>`
        : `{{!< default}}

<article class="post-full">
    <header class="post-header">
        {{#if feature_image}}
        <figure class="post-feature-image">
            <img src="{{feature_image}}" alt="{{title}}">
        </figure>
        {{/if}}
        <h1 class="post-title">{{title}}</h1>
        <div class="post-meta">
            <span class="post-meta-author">By {{primary_author.name}}</span>
            <time class="post-meta-date" datetime="{{date format="YYYY-MM-DD"}}">
                {{date format="D MMMM YYYY"}}
            </time>
            <span class="post-meta-reading-time">{{reading_time}}</span>
        </div>
    </header>

    <section class="post-content">
        {{content}}
    </section>

    {{#if tags}}
    <footer class="post-tags">
        {{#foreach tags}}
        <a href="{{url}}" class="tag">{{name}}</a>
        {{/foreach}}
    </footer>
    {{/if}}
</article>`;

    await fs.writeFile(path.join(targetDir, 'post.hbs'), content, 'utf8');
}

async function writePageHbs(targetDir) {
    const content = `{{!< default}}

<article class="page">
    <h1 class="page-title">{{title}}</h1>
    <div class="page-content">
        {{content}}
    </div>
</article>`;

    await fs.writeFile(path.join(targetDir, 'page.hbs'), content, 'utf8');
}

async function writePartials(targetDir) {
    const header = `<header class="site-header">
    <div class="container">
        <a class="site-logo" href="{{@site.url}}">
            {{#if @site.logo}}
            <img src="{{@site.logo}}" alt="{{@site.title}}">
            {{else}}
            {{@site.title}}
            {{/if}}
        </a>
        <nav class="site-nav">
            {{navigation}}
        </nav>
    </div>
</header>`;

    const footer = `<footer class="site-footer">
    <div class="container">
        <p>&copy; {{date format="YYYY"}} {{@site.title}} &mdash; Published with <a href="https://ghost.org">Ghost</a></p>
    </div>
</footer>`;

    await fs.writeFile(path.join(targetDir, 'partials', 'header.hbs'), header, 'utf8');
    await fs.writeFile(path.join(targetDir, 'partials', 'footer.hbs'), footer, 'utf8');
}

async function writeStylesheet(targetDir, primaryColor, layout) {
    const css = `/* Site Manager Generated Theme — ${layout} layout */
:root {
    --primary: ${primaryColor};
    --primary-dark: color-mix(in srgb, ${primaryColor} 80%, black);
    --text: #1a1a2e;
    --text-secondary: #555;
    --bg: #ffffff;
    --bg-secondary: #f8f9fa;
    --border: #e0e0e0;
    --radius: 8px;
    --shadow: 0 2px 8px rgba(0,0,0,0.08);
    --max-width: 1200px;
    --content-width: 720px;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'SFMono-Regular', Consolas, monospace;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: var(--font-sans);
    color: var(--text);
    background: var(--bg);
    line-height: 1.7;
    font-size: 17px;
}

a { color: var(--primary); text-decoration: none; transition: color 0.2s; }
a:hover { color: var(--primary-dark); }

img { max-width: 100%; height: auto; }

.container { max-width: var(--max-width); margin: 0 auto; padding: 0 24px; }

/* --- Header --- */
.site-header {
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    padding: 16px 0;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
    background: rgba(255,255,255,0.95);
}
.site-header .container { display: flex; align-items: center; justify-content: space-between; }
.site-logo { font-size: 1.3rem; font-weight: 700; color: var(--text); }
.site-logo img { height: 32px; }
.site-nav a { margin-left: 24px; color: var(--text-secondary); font-size: 0.95rem; }
.site-nav a:hover { color: var(--primary); }

/* --- Main --- */
.site-main { min-height: 70vh; padding: 48px 0; }

/* --- Blog layout --- */
.blog-header { text-align: center; margin-bottom: 48px; }
.blog-description { color: var(--text-secondary); font-size: 1.1rem; margin-top: 8px; }
.post-feed { display: grid; gap: 32px; }
.post-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.2s;
}
.post-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
.post-card-image { width: 100%; height: 220px; object-fit: cover; }
.post-card-content { padding: 24px; }
.post-card-title { font-size: 1.3rem; margin-bottom: 8px; }
.post-card-title a { color: var(--text); }
.post-card-excerpt { color: var(--text-secondary); margin-bottom: 12px; }
.post-card-meta { font-size: 0.85rem; color: var(--text-secondary); }

/* --- Post --- */
.post-full { max-width: var(--content-width); margin: 0 auto; padding: 0 24px; }
.post-header { margin-bottom: 32px; }
.post-feature-image img { width: 100%; border-radius: var(--radius); margin-bottom: 24px; }
.post-title { font-size: 2.4rem; line-height: 1.2; margin-bottom: 12px; }
.post-meta { color: var(--text-secondary); font-size: 0.9rem; }
.post-meta > * + *::before { content: ' · '; }
.post-content { font-size: 1.05rem; }
.post-content h2 { margin-top: 36px; margin-bottom: 12px; }
.post-content p { margin-bottom: 16px; }
.post-content pre { background: var(--bg-secondary); padding: 16px; border-radius: var(--radius); overflow-x: auto; font-family: var(--font-mono); }
.post-content code { font-family: var(--font-mono); font-size: 0.9em; background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; }
.post-tags { margin-top: 32px; display: flex; gap: 8px; flex-wrap: wrap; }
.tag { background: var(--bg-secondary); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; }

/* --- Hero (landing) --- */
.hero {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: white;
    text-align: center;
    padding: 120px 24px;
}
.hero h1 { font-size: 3rem; margin-bottom: 16px; }
.hero-description { font-size: 1.2rem; opacity: 0.9; margin-bottom: 32px; }
.btn { display: inline-block; padding: 12px 32px; border-radius: var(--radius); font-weight: 600; transition: all 0.2s; }
.btn-primary { background: white; color: var(--primary); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); color: var(--primary); }
.section { padding: 64px 0; }
.section-title { text-align: center; margin-bottom: 40px; font-size: 1.8rem; }

/* --- Grid --- */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.grid-3 { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; transition: box-shadow 0.2s; }
.card:hover { box-shadow: var(--shadow); }
.card-image { width: 100%; height: 200px; object-fit: cover; }
.card-body { padding: 20px; }

/* --- Portfolio --- */
.portfolio-header { text-align: center; padding: 64px 24px 32px; }
.portfolio-grid { padding: 0 24px 64px; max-width: var(--max-width); margin: 0 auto; }
.portfolio-item { text-align: center; }
.portfolio-image { position: relative; overflow: hidden; border-radius: var(--radius); }
.portfolio-image img { width: 100%; display: block; transition: transform 0.3s; }
.portfolio-item:hover .portfolio-image img { transform: scale(1.05); }
.portfolio-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
.portfolio-item:hover .portfolio-overlay { opacity: 1; }
.portfolio-overlay .btn { background: white; color: var(--text); }
.portfolio-meta { color: var(--text-secondary); font-size: 0.85rem; }

/* --- Docs --- */
.docs-layout { display: grid; grid-template-columns: 260px 1fr; gap: 40px; max-width: var(--max-width); margin: 0 auto; padding: 0 24px; }
.docs-sidebar { position: sticky; top: 80px; align-self: start; }
.docs-sidebar h3 { margin-bottom: 16px; }
.docs-sidebar ul { list-style: none; }
.docs-sidebar li { margin-bottom: 4px; }
.docs-sidebar a { display: block; padding: 6px 12px; border-radius: var(--radius); color: var(--text-secondary); }
.docs-sidebar a:hover, .docs-sidebar a.active { background: var(--bg-secondary); color: var(--primary); }
.docs-content { min-width: 0; }
.doc-entry { margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid var(--border); }
.doc-article h1 { margin-bottom: 24px; }

/* --- Page --- */
.page { max-width: var(--content-width); margin: 0 auto; padding: 0 24px; }
.page-title { font-size: 2rem; margin-bottom: 24px; }

/* --- Footer --- */
.site-footer { border-top: 1px solid var(--border); padding: 32px 0; text-align: center; color: var(--text-secondary); font-size: 0.9rem; }

/* --- Pagination --- */
.pagination { display: flex; justify-content: center; gap: 16px; padding: 48px 0; }
.pagination a { padding: 8px 20px; border: 1px solid var(--border); border-radius: var(--radius); }
.pagination a:hover { background: var(--bg-secondary); }

/* --- Responsive --- */
@media (max-width: 768px) {
    .hero h1 { font-size: 2rem; }
    .post-title { font-size: 1.8rem; }
    .docs-layout { grid-template-columns: 1fr; }
    .docs-sidebar { position: static; }
}`;

    await fs.writeFile(path.join(targetDir, 'assets', 'css', 'style.css'), css, 'utf8');
}

async function writeScript(targetDir) {
    const js = `// Site Manager Generated Theme
(function() {
    'use strict';

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
})();`;

    await fs.writeFile(path.join(targetDir, 'assets', 'js', 'main.js'), js, 'utf8');
}

/**
 * List available layout types
 */
function getLayouts() {
    return Object.entries(LAYOUTS).map(([key, val]) => {
        return {name: key, ...val};
    });
}

module.exports = {
    createSite,
    getLayouts
};
