const siteManager = require('../../services/site-manager');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'site-manager',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query() {
            const sites = await siteManager.listSites();
            return {sites};
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: ['id'],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const site = await siteManager.getSite(frame.options.id);
            return {sites: [site]};
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        permissions: true,
        async query(frame) {
            const data = frame.data.sites ? frame.data.sites[0] : frame.data;
            const result = await siteManager.createSite({
                name: data.name,
                displayName: data.display_name || data.name,
                layout: data.layout || 'blog',
                primaryColor: data.primary_color,
                description: data.description
            });
            return {sites: [result]};
        }
    },

    import: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            method: 'add'
        },
        async query(frame) {
            const result = await siteManager.importFromZip({
                path: frame.file.path,
                originalname: frame.file.originalname,
                displayName: frame.data?.display_name
            });
            return {sites: [result]};
        }
    },

    readFile: {
        headers: {
            cacheInvalidate: false
        },
        options: ['id', 'file_path'],
        validation: {
            options: {
                id: {
                    required: true
                },
                file_path: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'read'
        },
        async query(frame) {
            const filePath = frame.options.file_path;
            const file = await siteManager.readFile(frame.options.id, filePath);
            return {files: [file]};
        }
    },

    editFile: {
        headers: {
            cacheInvalidate: true
        },
        options: ['id', 'file_path'],
        validation: {
            options: {
                id: {
                    required: true
                },
                file_path: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const data = frame.data.files ? frame.data.files[0] : frame.data;
            const filePath = frame.options.file_path;
            const result = await siteManager.writeFile(frame.options.id, filePath, data.content);
            return {files: [result]};
        }
    },

    deleteFile: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: ['id', 'file_path'],
        validation: {
            options: {
                id: {
                    required: true
                },
                file_path: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'destroy'
        },
        async query(frame) {
            await siteManager.deleteFile(frame.options.id, frame.options.file_path);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: ['id'],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            await siteManager.deleteSite(frame.options.id);
        }
    },

    layouts: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'browse'
        },
        query() {
            return {layouts: siteManager.getLayouts()};
        }
    },

    adapters: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'browse'
        },
        query() {
            return {adapters: siteManager.getAdapters()};
        }
    }
};

module.exports = controller;
