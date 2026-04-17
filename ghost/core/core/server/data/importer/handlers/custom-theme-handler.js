const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');

const CustomAppHandler = {
    type: 'theme',
    extensions: ['.html', '.css', '.js', '.jsx', '.tsx'],
    contentTypes: ['text/html', 'text/css', 'application/javascript', 'text/javascript', 'application/octet-stream'],
    directories: [], // empty allows reading from root of zip

    loadFile: function (files, startDir) {
        const startDirRegex = startDir ? new RegExp('^' + startDir + '/') : new RegExp('');
        const themeFiles = [];
        const ops = [];

        let hasHtmlFiles = false;

        _.each(files, function (file) {
            ops.push(fs.readFile(file.path).then(function (content) {
                file.name = file.name.replace(startDirRegex, '');
                
                // ignore internal config files
                if (!/^node_modules/.test(file.name) && !/(tsconfig|config|\.test\.)/.test(file.name)) {
                    let contentStr = content.toString();

                    if (file.name.endsWith('.html')) {
                        hasHtmlFiles = true;

                        // Rewrite relative assets to Ghost theme {{asset}} tags
                        contentStr = contentStr.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, url) => {
                            if (!url.startsWith('http') && !url.startsWith('//')) {
                                return match.replace(url, `{{asset "${url}"}}`);
                            }
                            return match;
                        });

                        contentStr = contentStr.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, url) => {
                            if (!url.startsWith('http') && !url.startsWith('//')) {
                                return match.replace(url, `{{asset "${url}"}}`);
                            }
                            return match;
                        });

                        // Map index.html to default.hbs
                        if (file.name === 'index.html') {
                            themeFiles.push({
                                name: 'default.hbs',
                                content: contentStr
                            });
                            // Create a stub index.hbs that uses default.hbs layout
                            themeFiles.push({
                                name: 'index.hbs',
                                content: '{{!< default}}\n<!-- Custom App Root -->\n<div id="root"></div>'
                            });
                            // Create a stub post.hbs
                            themeFiles.push({
                                name: 'post.hbs',
                                content: '{{!< default}}\n<!-- Imported Post Structure -->\n{{#post}}\n  <h1>{{title}}</h1>\n  {{content}}\n{{/post}}'
                            });
                        } else {
                            // Other html files mapped to custom templates
                            let templateName = file.name.replace('.html', '.hbs');
                            themeFiles.push({
                                name: templateName,
                                content: contentStr
                            });
                        }
                    } else if (file.name.endsWith('.css') || file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
                        // Move JS/CSS to assets folder if they aren't already
                        let assetName = file.name;
                        if (!assetName.startsWith('assets/')) {
                            assetName = 'assets/' + assetName;
                        }

                        themeFiles.push({
                            name: assetName,
                            content: contentStr
                        });
                    }
                }
            }));
        });

        return Promise.all(ops).then(function () {
            if (!hasHtmlFiles) {
                // If it wasn't a standard HTML static site, we just return empty so standard handlers process it
                return {files: []};
            }

            // Always provide a minimal package.json for Ghost theme validation
            themeFiles.push({
                name: 'package.json',
                content: JSON.stringify({
                    name: "custom-imported-app",
                    description: "Auto-generated theme from Custom App Importer",
                    version: "1.0.0",
                    engines: {
                        ghost: ">=5.0.0"
                    }
                })
            });

            return {
                name: 'custom-imported-app-' + Date.now(),
                activate: true,
                files: themeFiles
            };
        });
    }
};

module.exports = CustomAppHandler;
