const _ = require('lodash');
const fs = require('fs-extra');
const moment = require('moment');

const titleRegex = /(?:export const metadata = {[\s\S]*?title:\s*['"])([^'"]+)(?:['"][\s\S]*?})/i;
const componentRegex = /(?:export default function) ([A-Za-z0-9_]+)/;

let processDateTime = function (post, datetime) {
    const format = 'YYYY-MM-DD-HH-mm';
    datetime = moment.utc(datetime, format).valueOf();

    if (post.status && post.status === 'published') {
        post.published_at = datetime;
    } else {
        post.created_at = datetime;
    }

    return post;
};

let processFileName = function (filename) {
    let post = {};
    let name = filename.split('.')[0];
    
    post.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    post.title = name;
    post.status = 'draft';

    return post;
};

let processCodeFile = function (filename, content) {
    const post = processFileName(filename);
    let match;

    content = content.replace(/\r\n/gm, '\n');

    match = content.match(titleRegex);
    if (match) {
        post.title = match[1];
    } else {
        match = content.match(componentRegex);
        if (match) {
            post.title = match[1];
        }
    }

    post.html = `<!-- RENDER_REACT_NODE START --><div class="custom-react-node"><script type="text/babel">${content}</script></div><!-- RENDER_REACT_NODE END -->`;
    
    return post;
};

const ReactAppHandler = {
    type: 'data',
    extensions: ['.jsx', '.tsx'],
    contentTypes: ['application/octet-stream', 'text/plain', 'text/javascript', 'application/javascript'],
    directories: ['pages', 'app', 'components', 'src/pages', 'src/app'],

    loadFile: function (files, startDir) {
        const startDirRegex = startDir ? new RegExp('^' + startDir + '/') : new RegExp('');
        const posts = [];
        const ops = [];

        _.each(files, function (file) {
            ops.push(fs.readFile(file.path).then(function (content) {
                file.name = file.name.replace(startDirRegex, '');
                if (!/^node_modules/.test(file.name) && !/(layout|config|\.test\.)/.test(file.name)) {
                    posts.push(processCodeFile(file.name, content.toString()));
                }
            }));
        });

        return Promise.all(ops).then(function () {
            // Only return posts so it mimics standard DataImporter output
            return {meta: {}, data: {posts: posts}};
        });
    }
};

module.exports = ReactAppHandler;
