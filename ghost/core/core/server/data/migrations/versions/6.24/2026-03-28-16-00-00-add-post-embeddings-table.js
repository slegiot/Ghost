const {addTable} = require('../../utils');

module.exports = addTable('post_embeddings', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, unique: true, references: 'posts.id', cascadeDelete: true},
    embedding: {type: 'text', maxlength: 65535, nullable: false},
    keywords: {type: 'text', maxlength: 65535, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
