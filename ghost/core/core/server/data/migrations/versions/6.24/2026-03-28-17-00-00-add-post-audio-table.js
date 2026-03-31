const {addTable} = require('../../utils');

module.exports = addTable('post_audio', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, unique: true, references: 'posts.id', cascadeDelete: true},
    audio_url: {type: 'string', maxlength: 2000, nullable: true},
    duration: {type: 'integer', nullable: true, unsigned: true},
    voice_id: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'default'},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending', validations: {isIn: [['pending', 'generating', 'ready', 'error']]}},
    error_message: {type: 'string', maxlength: 2000, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
