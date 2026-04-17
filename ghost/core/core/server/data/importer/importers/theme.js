const _ = require('lodash');
const Promise = require('bluebird');
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const themeService = require('../../../services/themes');
const models = require('../../../models');

class ThemeImporter {
    constructor() {
        this.type = 'theme';
    }

    preProcess(importData) {
        return importData;
    }

    async doImport(themeData) {
        if (!themeData || !themeData.files) {
            return Promise.resolve();
        }

        const themeName = themeData.name || 'custom-imported-theme';
        const tmpFileName = path.join(os.tmpdir(), `${themeName}-${Date.now()}.zip`);
        
        // Build the zip file dynamically from the parsed themeData.files
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(tmpFileName);
            const archive = archiver('zip', {
                zlib: {level: 9}
            });

            output.on('close', resolve);
            archive.on('error', reject);

            archive.pipe(output);

            _.each(themeData.files, (file) => {
                archive.append(file.content, {name: file.name});
            });

            archive.finalize();
        });

        // Use Ghost's theme service to install the theme
        const zip = {
            path: tmpFileName,
            name: themeName + '.zip'
        };

        const {theme} = await themeService.api.setFromZip(zip);
        
        // Clean up the temp zip
        await fs.remove(tmpFileName);

        // Optionally activate it
        if (themeData.activate) {
            await themeService.api.activate(theme.name); 
            const newSettings = [{
                key: 'active_theme',
                value: theme.name
            }];
            await models.Settings.edit(newSettings, {context: {internal: true}});
        }

        return {
            theme: theme.name
        };
    }
}

module.exports = ThemeImporter;
